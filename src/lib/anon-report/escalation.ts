/**
 * src/lib/anon-report/escalation.ts
 * NAWASENA M12 — Satgas escalation orchestrator.
 *
 * Responsibilities:
 *   1. Load report + resolve Satgas receivers
 *   2. Send CRITICAL notification via M15 sendNotification with 10s timeout
 *   3. On timeout/error: call directDispatchSatgas (nodemailer fallback)
 *   4. Enqueue NORMAL notification to BLM (fire-and-forget)
 *   5. Update AnonReport.satgasEscalated=true, satgasEscalatedAt=now
 *
 * Feature flag: process.env.M12_USE_M15 !== 'false' (default: enabled)
 *
 * PRIVACY NOTE: Notification payload contains ONLY:
 *   trackingCode, category, severity, cohortName, severityReason
 * NO body text, NO attachment info, NO PII.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { setBypassRls } from './rls-helpers';
import { resolveSatgasPPKPTForITS, resolveBLMForCohort } from './receivers';
import { directDispatchSatgas } from './escalation-fallback';

const log = createLogger('anon-escalation');

/**
 * Minimal logger interface accepted by escalateToSatgas.
 * Compatible with both Logger (createLogger) and AnonRedactingLogger.
 */
interface EscalLogger {
  info: (msg: string, meta?: Record<string, unknown>) => void;
  warn: (msg: string, meta?: Record<string, unknown>) => void;
  error: (msg: string, meta?: Record<string, unknown>) => void;
  debug?: (msg: string, meta?: Record<string, unknown>) => void;
}

const M15_TIMEOUT_MS = 10_000; // 10 seconds

/**
 * Race a promise against a timeout.
 * Returns the promise result or throws if timeout expires first.
 */
async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout: ${label} exceeded ${ms}ms`));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Escalate a report to Satgas PPKPT ITS.
 *
 * Called:
 *   - Automatically on submit when severity=RED or category=HARASSMENT
 *   - Manually via POST /api/anon-reports/[id]/escalate (BLM/SUPERADMIN)
 *
 * @param reportId - The AnonReport id to escalate
 * @param callerLog - Logger from the caller (for request context)
 */
export async function escalateToSatgas(reportId: string, callerLog?: EscalLogger): Promise<void> {
  const escalLog = callerLog ?? log;

  escalLog.info('Starting Satgas escalation', { reportId: reportId.slice(0, 8) + '...' });

  // Step 1: Load report + cohort info via separate query (bypass RLS)
  const report = await prisma.$transaction(async (tx) => {
    await setBypassRls(tx);
    return tx.anonReport.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        trackingCode: true,
        category: true,
        severity: true,
        severityReason: true,
        satgasEscalated: true,
        cohortId: true,
      },
    });
  });

  if (!report) {
    escalLog.error('Report not found for escalation', { reportId });
    return;
  }

  if (report.satgasEscalated) {
    escalLog.info('Report already escalated — skipping', {
      reportId: reportId.slice(0, 8) + '...',
    });
    return;
  }

  // Load cohort name separately (not in anon_reports RLS scope)
  let cohortName = 'Unknown';
  try {
    const cohort = await prisma.cohort.findUnique({
      where: { id: report.cohortId },
      select: { name: true, code: true },
    });
    cohortName = cohort?.name ?? cohort?.code ?? 'Unknown';
  } catch {
    escalLog.warn('Could not load cohort name', { cohortId: report.cohortId });
  }

  // Step 2: Resolve Satgas receivers
  const satgasUsers = await resolveSatgasPPKPTForITS();

  if (satgasUsers.length === 0) {
    escalLog.warn('No Satgas receivers found — using fallback dispatch');
    await directDispatchSatgas([], {
      trackingCode: report.trackingCode,
      category: report.category,
      severity: report.severity,
      cohortName,
    });
  } else {
    // Step 3: Send via M15 (with timeout + fallback)
    const useM15 = process.env.M12_USE_M15 !== 'false';

    if (useM15) {
      try {
        const { sendNotification } = await import('@/lib/notifications/send');

        // Send CRITICAL notification to each Satgas user (parallel, with timeout)
        const notifPromises = satgasUsers.map((satgas) =>
          withTimeout(
            sendNotification({
              userId: satgas.id,
              templateKey: 'ANON_REPORT_ESCALATED_SATGAS',
              payload: {
                trackingCode: report.trackingCode,
                category: report.category as string,
                severity: report.severity as string,
                cohortName,
                severityReason: (report.severityReason as string[]).join(', ') || '-',
              },
              category: 'CRITICAL',
            }),
            M15_TIMEOUT_MS,
            `M15 CRITICAL to ${satgas.id.slice(0, 8)}`,
          ),
        );

        await Promise.allSettled(notifPromises);

        escalLog.info('M15 CRITICAL notifications dispatched to Satgas', {
          count: satgasUsers.length,
        });
      } catch (err) {
        escalLog.error('M15 escalation failed — using fallback dispatch', { error: err });

        // Fallback: direct SMTP
        const satgasEmails = satgasUsers.map((u) => u.email);
        await directDispatchSatgas(satgasEmails, {
          trackingCode: report.trackingCode,
          category: report.category,
          severity: report.severity,
          cohortName,
        });
      }
    } else {
      escalLog.info('M15 disabled (M12_USE_M15=false) — using fallback dispatch');
      const satgasEmails = satgasUsers.map((u) => u.email);
      await directDispatchSatgas(satgasEmails, {
        trackingCode: report.trackingCode,
        category: report.category,
        severity: report.severity,
        cohortName,
      });
    }
  }

  // Step 4: Enqueue NORMAL notification to BLM (fire-and-forget)
  void enqueueBLMNotif(
    report.cohortId,
    report.trackingCode,
    report.category as string,
    report.severity as string,
    cohortName,
    escalLog,
  );

  // Step 5: Update AnonReport escalation flags
  try {
    await prisma.$transaction(async (tx) => {
      await setBypassRls(tx);
      await tx.anonReport.update({
        where: { id: reportId },
        data: {
          satgasEscalated: true,
          satgasEscalatedAt: new Date(),
        },
      });
    });

    escalLog.info('AnonReport escalation flags updated', {
      reportId: reportId.slice(0, 8) + '...',
    });
  } catch (err) {
    escalLog.error('Failed to update escalation flags', { error: err });
    // Don't re-throw — notifications already sent
  }
}

/**
 * Enqueue a NORMAL notification to BLM for the cohort.
 * Fire-and-forget — errors are logged but not propagated.
 */
async function enqueueBLMNotif(
  cohortId: string,
  trackingCode: string,
  category: string,
  severity: string,
  cohortName: string,
  parentLog: EscalLogger,
): Promise<void> {
  try {
    const useM15 = process.env.M12_USE_M15 !== 'false';
    if (!useM15) {
      parentLog.info('M15 disabled — skipping BLM notification enqueue', {});
      return;
    }

    const blmUsers = await resolveBLMForCohort(cohortId);

    if (blmUsers.length === 0) {
      parentLog.info('No BLM receivers found for cohort', { cohortId });
      return;
    }

    const { sendNotification } = await import('@/lib/notifications/send');

    await Promise.allSettled(
      blmUsers.map((blm) =>
        sendNotification({
          userId: blm.id,
          templateKey: 'ANON_REPORT_NEW_BLM',
          payload: {
            trackingCode,
            category,
            severity,
            cohortName,
          },
          category: 'NORMAL',
        }),
      ),
    );

    parentLog.info('BLM NORMAL notifications dispatched', { count: blmUsers.length });
  } catch (err) {
    parentLog.error('Failed to enqueue BLM notifications', { error: err as Record<string, unknown> });
    // Non-fatal — BLM can still see reports in dashboard
  }
}
