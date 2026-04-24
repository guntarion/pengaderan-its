/**
 * src/lib/safeguard/escalation.ts
 * NAWASENA M10 — Auto-escalation engine for Safeguard incidents.
 *
 * On incident creation (especially RED severity), this service:
 * 1. Resolves the list of receivers (SC, Safeguard Officers, Pembina — excluding reporter)
 * 2. Deduplicates via Redis SET NX (30-minute window) to prevent duplicate alerts
 * 3. Dispatches notifications via M15 sendNotification (CRITICAL category)
 * 4. Falls back to direct email/push if M15 fails (see escalation-fallback.ts)
 * 5. Logs timing metrics for SLA monitoring (< 5 min delivery target)
 *
 * Feature flag: process.env.M10_USE_M15 = 'true' | 'false'
 * When false, falls back directly to escalation-fallback.ts
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { resolveReceivers } from './receivers';
import type { IncidentSeverity } from '@prisma/client';

const log = createLogger('safeguard:escalation');

/** Dedup window: 30 minutes */
const DEDUP_TTL_SECONDS = 30 * 60;

/** Timeout for M15 sendNotification call: 10 seconds */
const M15_TIMEOUT_MS = 10_000;

/** Feature flag: use M15 for notifications */
const isM15Enabled = () => process.env.M10_USE_M15 === 'true';

/** Template keys per severity */
const TEMPLATE_KEYS: Record<IncidentSeverity, string> = {
  RED: 'SAFEGUARD_RED_ALERT',
  YELLOW: 'SAFEGUARD_YELLOW_ALERT',
  GREEN: 'SAFEGUARD_DRAFT_PENDING_REVIEW',
};

/** Redis dedup key for an incident escalation */
function dedupKey(incidentId: string): string {
  return `m10:escalation:dedup:${incidentId}`;
}

export interface EscalationResult {
  incidentId: string;
  deduped: boolean;
  receiversCount: number;
  successCount: number;
  failureCount: number;
  usedFallback: boolean;
  durationMs: number;
}

/**
 * Escalate an incident — dispatch notifications to all relevant receivers.
 *
 * This function is fire-and-forget safe: it never throws.
 * Errors are logged but do not propagate.
 *
 * @param incidentId - ID of the incident to escalate
 */
export async function escalateIncident(incidentId: string): Promise<EscalationResult> {
  const startMs = Date.now();

  log.info('Starting incident escalation', { incidentId });

  const result: EscalationResult = {
    incidentId,
    deduped: false,
    receiversCount: 0,
    successCount: 0,
    failureCount: 0,
    usedFallback: false,
    durationMs: 0,
  };

  try {
    // ---- 1. Dedup check ----
    if (isRedisConfigured()) {
      const redis = getRedisClient();
      const key = dedupKey(incidentId);
      // SET NX: only set if key does not exist
      const set = await redis.set(key, '1', { ex: DEDUP_TTL_SECONDS, nx: true });
      if (set === null) {
        // Key already existed — this is a duplicate escalation within 30 min
        log.info('Escalation deduped — already sent within 30 minutes', { incidentId });
        result.deduped = true;
        result.durationMs = Date.now() - startMs;
        return result;
      }
    } else {
      log.warn('Redis not configured — skipping escalation dedup', { incidentId });
    }

    // ---- 2. Fetch incident ----
    const incident = await prisma.safeguardIncident.findUnique({
      where: { id: incidentId },
      select: {
        id: true,
        type: true,
        severity: true,
        status: true,
        occurredAt: true,
        organizationId: true,
        reportedById: true,
        reportedBy: { select: { fullName: true } },
      },
    });

    if (!incident) {
      log.error('Incident not found during escalation', { incidentId });
      result.durationMs = Date.now() - startMs;
      return result;
    }

    // ---- 3. Resolve receivers ----
    const receivers = await resolveReceivers(incident.organizationId, incident.reportedById);
    result.receiversCount = receivers.length;

    if (receivers.length === 0) {
      log.warn('No receivers found for escalation', { incidentId, orgId: incident.organizationId });
      result.durationMs = Date.now() - startMs;
      return result;
    }

    const templateKey = TEMPLATE_KEYS[incident.severity];
    const payload = {
      incidentId: incident.id,
      incidentType: incident.type,
      incidentSeverity: incident.severity,
      occurredAt: incident.occurredAt.toISOString(),
      reporterName: incident.reportedBy?.fullName ?? 'Anonim',
      detailUrl: `/dashboard/safeguard/incidents/${incident.id}`,
    };

    log.info('Dispatching escalation notifications', {
      incidentId,
      severity: incident.severity,
      templateKey,
      receiversCount: receivers.length,
      isM15Enabled: isM15Enabled(),
    });

    // ---- 4. Dispatch notifications ----
    if (isM15Enabled()) {
      await dispatchViaM15(incident.id, incident.organizationId, incident.severity, receivers, templateKey, payload, result);
    } else {
      // Feature flag off: use fallback directly
      await dispatchViaFallback(incidentId, receivers, incident.severity, payload, result);
    }

    log.info('Escalation complete', {
      incidentId,
      durationMs: Date.now() - startMs,
      receiversCount: result.receiversCount,
      successCount: result.successCount,
      failureCount: result.failureCount,
      usedFallback: result.usedFallback,
    });
  } catch (err) {
    log.error('Escalation failed unexpectedly', { incidentId, error: err });
  }

  result.durationMs = Date.now() - startMs;
  return result;
}

async function dispatchViaM15(
  incidentId: string,
  organizationId: string,
  severity: IncidentSeverity,
  receivers: Awaited<ReturnType<typeof resolveReceivers>>,
  templateKey: string,
  payload: Record<string, unknown>,
  result: EscalationResult,
): Promise<void> {
  const { sendNotification } = await import('@/lib/notifications/send');

  const sendPromises = receivers.map(async (receiver) => {
    try {
      // Wrap with timeout
      const sendWithTimeout = Promise.race([
        sendNotification({
          userId: receiver.id,
          templateKey,
          payload: { ...payload, userName: receiver.fullName },
          category: 'CRITICAL',
          requestId: `m10-escalation-${incidentId}-${receiver.id}`,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('M15 timeout')), M15_TIMEOUT_MS),
        ),
      ]);

      const notifResult = await sendWithTimeout;

      if (notifResult.skipped) {
        log.warn('Notification skipped for receiver', {
          incidentId,
          receiverId: receiver.id,
          skipReason: notifResult.skipReason,
        });
        result.failureCount++;
      } else {
        const sent = notifResult.results.some((r) => r.status === 'SENT' || r.status === 'PARTIAL');
        if (sent) {
          result.successCount++;
        } else {
          result.failureCount++;
          log.warn('All channels failed for receiver', {
            incidentId,
            receiverId: receiver.id,
            results: notifResult.results,
          });
        }
      }
    } catch (err) {
      const isTimeout = (err as Error).message === 'M15 timeout';
      log.error('M15 dispatch failed for receiver — falling back', {
        incidentId,
        receiverId: receiver.id,
        isTimeout,
        error: err,
      });

      // Per-receiver fallback
      try {
        const { dispatchFallbackForReceiver } = await import('./escalation-fallback');
        await dispatchFallbackForReceiver(incidentId, organizationId, receiver, severity, payload);
        result.successCount++;
        result.usedFallback = true;

        // Record fallback in DB
        await recordFallback(incidentId, organizationId, receiver.id, isTimeout ? 'M15 timeout' : (err as Error).message);
      } catch (fallbackErr) {
        log.error('Fallback also failed for receiver', {
          incidentId,
          receiverId: receiver.id,
          error: fallbackErr,
        });
        result.failureCount++;
      }
    }
  });

  await Promise.allSettled(sendPromises);
}

async function dispatchViaFallback(
  incidentId: string,
  receivers: Awaited<ReturnType<typeof resolveReceivers>>,
  severity: IncidentSeverity,
  payload: Record<string, unknown>,
  result: EscalationResult,
): Promise<void> {
  const { dispatchFallbackForReceiver } = await import('./escalation-fallback');

  // Fetch orgId from incident
  const incident = await prisma.safeguardIncident.findUnique({
    where: { id: incidentId },
    select: { organizationId: true },
  });
  const orgId = incident?.organizationId ?? '';

  const fallbackPromises = receivers.map(async (receiver) => {
    try {
      await dispatchFallbackForReceiver(incidentId, orgId, receiver, severity, payload);
      result.successCount++;
    } catch (err) {
      log.error('Fallback failed for receiver', { incidentId, receiverId: receiver.id, error: err });
      result.failureCount++;
    }
  });

  await Promise.allSettled(fallbackPromises);
  result.usedFallback = true;
}

async function recordFallback(
  incidentId: string,
  organizationId: string,
  receiverId: string,
  reason: string,
): Promise<void> {
  try {
    await prisma.safeguardEscalationFallback.create({
      data: {
        incidentId,
        organizationId,
        receiverUserId: receiverId,
        channel: 'EMAIL', // fallback triggered by M15 per-receiver timeout
        status: 'SENT',
        errorMessage: reason,
        m15Attempted: true,
        attemptedAt: new Date(),
      },
    });
  } catch (err) {
    log.error('Failed to record escalation fallback', { incidentId, receiverId, error: err });
  }
}
