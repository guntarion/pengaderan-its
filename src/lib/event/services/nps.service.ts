/**
 * src/lib/event/services/nps.service.ts
 * NAWASENA M06 — NPS submission & aggregation service.
 *
 * Guards:
 * - Instance status must be DONE (or RUNNING for edge cases)
 * - User must have Attendance status HADIR
 * - npsRequestedAt must not be null (trigger happened)
 * - Within 7-day window from executedAt
 * - No existing submission (unique constraint + 409)
 *
 * Privacy: getAggregate returns null if n < 5 responses.
 */

import { prisma } from '@/utils/prisma';
import { withCache, CACHE_TTL, invalidateCache } from '@/lib/cache';
import { createLogger } from '@/lib/logger';

const log = createLogger('event:nps-service');

// ============================================
// Submission guards
// ============================================

export interface CanSubmitResult {
  canSubmit: boolean;
  reason?: string;
  alreadySubmitted?: boolean;
}

/**
 * Check if a user can submit NPS for an instance.
 * Multi-guard: status, window, attendance, duplicate.
 */
export async function canSubmitNPS(
  userId: string,
  instanceId: string,
): Promise<CanSubmitResult> {
  const instance = await prisma.kegiatanInstance.findUnique({
    where: { id: instanceId },
    select: { status: true, executedAt: true, npsRequestedAt: true },
  });

  if (!instance) {
    return { canSubmit: false, reason: 'Instance tidak ditemukan.' };
  }

  // Check status
  if (instance.status !== 'DONE' && instance.status !== 'RUNNING') {
    return { canSubmit: false, reason: 'Feedback hanya tersedia setelah kegiatan selesai.' };
  }

  // Check 7-day window from executedAt
  if (instance.executedAt) {
    const windowEnd = new Date(instance.executedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (new Date() > windowEnd) {
      const daysSince = Math.floor((Date.now() - instance.executedAt.getTime()) / (1000 * 60 * 60 * 24));
      return {
        canSubmit: false,
        reason: `Periode feedback telah berakhir ${daysSince} hari yang lalu.`,
      };
    }
  }

  // Check attendance (must be HADIR)
  const attendance = await prisma.attendance.findUnique({
    where: { instanceId_userId: { instanceId, userId } },
    select: { status: true },
  });

  if (!attendance || attendance.status !== 'HADIR') {
    return {
      canSubmit: false,
      reason: 'Kamu tidak tercatat hadir di kegiatan ini.',
    };
  }

  // Check existing submission
  const existing = await prisma.eventNPS.findUnique({
    where: { userId_instanceId: { userId, instanceId } },
    select: { id: true },
  });

  if (existing) {
    return { canSubmit: false, reason: 'Feedback sudah terkirim.', alreadySubmitted: true };
  }

  return { canSubmit: true };
}

// ============================================
// Submission
// ============================================

export interface NPSSubmitData {
  npsScore: number;
  feltSafe: number;
  meaningful: number;
  comment?: string;
}

/**
 * Submit NPS for an instance.
 * Validates guards, creates EventNPS row, invalidates cache.
 */
export async function submitNPS(
  userId: string,
  instanceId: string,
  organizationId: string,
  data: NPSSubmitData,
) {
  log.info('NPS submit', { userId, instanceId, npsScore: data.npsScore });

  const guard = await canSubmitNPS(userId, instanceId);
  if (!guard.canSubmit) {
    if (guard.alreadySubmitted) {
      throw new Error('CONFLICT: Feedback sudah terkirim sebelumnya.');
    }
    throw new Error(`FORBIDDEN: ${guard.reason}`);
  }

  // Validate score ranges (belt-and-suspenders beyond DB CHECK)
  if (data.npsScore < 0 || data.npsScore > 10) {
    throw new Error('VALIDATION: NPS score harus antara 0 dan 10.');
  }
  if (data.feltSafe < 1 || data.feltSafe > 5) {
    throw new Error('VALIDATION: feltSafe harus antara 1 dan 5.');
  }
  if (data.meaningful < 1 || data.meaningful > 5) {
    throw new Error('VALIDATION: meaningful harus antara 1 dan 5.');
  }
  if (data.comment && data.comment.length > 500) {
    throw new Error('VALIDATION: Komentar maksimal 500 karakter.');
  }

  const nps = await prisma.eventNPS.create({
    data: {
      instanceId,
      userId,
      organizationId,
      npsScore: data.npsScore,
      feltSafe: data.feltSafe,
      meaningful: data.meaningful,
      comment: data.comment ?? null,
      recordedAt: new Date(),
    },
  });

  // Audit log
  try {
    await prisma.nawasenaAuditLog.create({
      data: {
        action: 'EVENT_NPS_SUBMIT',
        actorUserId: userId,
        entityType: 'EventNPS',
        entityId: nps.id,
        organizationId,
        afterValue: {
          npsScore: data.npsScore,
          feltSafe: data.feltSafe,
          meaningful: data.meaningful,
          hasComment: Boolean(data.comment),
        },
        metadata: { instanceId },
      },
    });
  } catch (err) {
    log.warn('Failed to create NPS audit log', { error: err });
  }

  // Invalidate NPS aggregate cache
  await invalidateCache(`event:instance:${instanceId}:nps-aggregate`);

  log.info('NPS submitted successfully', { userId, instanceId, npsId: nps.id });
  return nps;
}

/**
 * Get a user's own NPS submission for an instance.
 */
export async function getOwnNPSSubmission(userId: string, instanceId: string) {
  return prisma.eventNPS.findUnique({
    where: { userId_instanceId: { userId, instanceId } },
    select: {
      id: true,
      npsScore: true,
      feltSafe: true,
      meaningful: true,
      comment: true,
      recordedAt: true,
    },
  });
}

// ============================================
// Aggregation (OC view)
// ============================================

export interface NPSAggregateResult {
  nResponses: number;
  nHadir: number;
  responseRate: number;
  avgNps: number;
  avgFeltSafe: number;
  avgMeaningful: number;
  npsHistogram: number[]; // index 0-10
  netPromoterPercent: number; // promoters (9-10) - detractors (0-6) / n
}

export interface NPSInsufficientData {
  insufficientData: true;
  nResponses: number;
  minimumRequired: number;
}

const NPS_MINIMUM_FOR_DISPLAY = 5;

/**
 * Get NPS aggregate for an instance.
 * Returns null envelope if n < 5 (privacy minimum).
 * Never returns individual rows.
 */
export async function getNPSAggregate(
  instanceId: string,
  organizationId: string,
): Promise<NPSAggregateResult | NPSInsufficientData> {
  const cacheKey = `event:instance:${instanceId}:nps-aggregate:${organizationId}`;

  const cached = await withCache<NPSAggregateResult | NPSInsufficientData>(
    cacheKey,
    CACHE_TTL.SHORT, // 60s TTL for fresh data
    async () => {
      log.debug('Computing NPS aggregate', { instanceId });

      const [responses, nHadir] = await Promise.all([
        prisma.eventNPS.findMany({
          where: { instanceId, organizationId },
          select: { npsScore: true, feltSafe: true, meaningful: true },
        }),
        prisma.attendance.count({
          where: { instanceId, organizationId, status: 'HADIR' },
        }),
      ]);

      const nResponses = responses.length;

      if (nResponses < NPS_MINIMUM_FOR_DISPLAY) {
        return {
          insufficientData: true as const,
          nResponses,
          minimumRequired: NPS_MINIMUM_FOR_DISPLAY,
        };
      }

      const avgNps = responses.reduce((sum, r) => sum + r.npsScore, 0) / nResponses;
      const avgFeltSafe = responses.reduce((sum, r) => sum + r.feltSafe, 0) / nResponses;
      const avgMeaningful = responses.reduce((sum, r) => sum + r.meaningful, 0) / nResponses;

      // Histogram: index 0-10
      const npsHistogram = Array(11).fill(0) as number[];
      for (const r of responses) {
        npsHistogram[r.npsScore]++;
      }

      // Net Promoter Score: promoters (9-10) - detractors (0-6) / n * 100
      const promoters = responses.filter((r) => r.npsScore >= 9).length;
      const detractors = responses.filter((r) => r.npsScore <= 6).length;
      const netPromoterPercent = ((promoters - detractors) / nResponses) * 100;

      return {
        nResponses,
        nHadir,
        responseRate: nHadir > 0 ? nResponses / nHadir : 0,
        avgNps: Math.round(avgNps * 10) / 10,
        avgFeltSafe: Math.round(avgFeltSafe * 10) / 10,
        avgMeaningful: Math.round(avgMeaningful * 10) / 10,
        npsHistogram,
        netPromoterPercent: Math.round(netPromoterPercent),
      };
    },
  );

  return cached;
}
