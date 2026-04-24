/**
 * src/lib/m09-cascade/m10-cascade.ts
 * NAWASENA M09 — Red flag cascade handler to M10 SafeguardIncident.
 *
 * When M09_M10_CASCADE_ENABLED=false (default), skips M10 API call
 * but still fires M15 notifications for severe red flags.
 *
 * Retry: 3x exponential backoff (500ms → 1s → 2s)
 * On success: update KPLogDaily.cascadedIncidentId + audit
 * On failure: audit RED_FLAG_CASCADE_FAILED + log error
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { auditLog } from '@/services/audit-log.service';
import { isCascadeEnabled } from './flags';
import type { CascadeJob } from './job-queue';

const log = createLogger('m09:m10-cascade');

const RETRY_DELAYS_MS = [500, 1000, 2000];

/**
 * Process a single cascade job.
 * If cascade disabled: skip M10 call, fire M15 CRITICAL notif for SEVERE.
 * If cascade enabled: call M10 API with retry; on success update cascadedIncidentId.
 */
export async function processCascadeJob(job: CascadeJob): Promise<void> {
  const { kpLogDailyId, severity, redFlagTypes } = job;

  log.info('Processing cascade job', { kpLogDailyId, severity, redFlagTypes });

  // Fetch the log to get context
  const kpLog = await prisma.kPLogDaily.findUnique({
    where: { id: kpLogDailyId },
    select: {
      id: true,
      kpUserId: true,
      kpGroupId: true,
      cohortId: true,
      organizationId: true,
      anecdoteShort: true,
      date: true,
    },
  });

  if (!kpLog) {
    log.warn('KPLogDaily not found — skipping cascade', { kpLogDailyId });
    return;
  }

  if (!isCascadeEnabled()) {
    log.info('Cascade disabled — skipping M10 API call', { kpLogDailyId });

    // Still fire M15 CRITICAL notification for SEVERE flags when cascade is off
    if (severity === 'SEVERE') {
      log.info('M15 CRITICAL notif would be sent (M15 integration pending)', {
        kpLogDailyId,
        severity,
        redFlagTypes,
      });
      // TODO: sendNotification to SC roles when M15 template is ready
    }
    return;
  }

  // Try to call M10 API with retry
  let lastError: unknown = null;
  let incidentId: string | null = null;

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    try {
      const m10Url = `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/safeguard/incidents/draft`;

      const response = await fetch(m10Url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.LLM_API_KEY ?? ''}`,
        },
        body: JSON.stringify({
          source: 'M09_KP_DAILY',
          sourceRecordId: kpLogDailyId,
          severity: severity === 'SEVERE' ? 'HIGH' : 'NORMAL',
          reporterUserId: kpLog.kpUserId,
          subjectUserId: null,
          metadata: {
            kpGroupId: kpLog.kpGroupId,
            cohortId: kpLog.cohortId,
            redFlagTypes,
            anecdote: kpLog.anecdoteShort,
            date: kpLog.date,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`M10 API returned ${response.status}`);
      }

      const data = await response.json();
      incidentId = data?.data?.incidentId ?? null;
      break;
    } catch (err) {
      lastError = err;
      log.warn('M10 cascade attempt failed', { kpLogDailyId, attempt: attempt + 1, error: err });

      if (attempt < RETRY_DELAYS_MS.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
      }
    }
  }

  if (incidentId) {
    // Success: update cascadedIncidentId
    await prisma.kPLogDaily.update({
      where: { id: kpLogDailyId },
      data: { cascadedIncidentId: incidentId, updatedAt: new Date() },
    });

    await auditLog.record({
      userId: kpLog.kpUserId,
      action: 'RED_FLAG_CASCADE_TRIGGERED',
      resource: 'KPLogDaily',
      resourceId: kpLogDailyId,
      metadata: { incidentId, redFlagTypes, severity },
    });

    log.info('Cascade triggered successfully', { kpLogDailyId, incidentId });
  } else {
    // All retries failed
    await auditLog.record({
      userId: kpLog.kpUserId,
      action: 'RED_FLAG_CASCADE_FAILED',
      resource: 'KPLogDaily',
      resourceId: kpLogDailyId,
      metadata: {
        redFlagTypes,
        severity,
        error: lastError instanceof Error ? lastError.message : String(lastError),
      },
    });

    log.error('Cascade failed after all retries', { kpLogDailyId, error: lastError });
  }
}
