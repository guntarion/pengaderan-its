/**
 * src/lib/struktur/request-limits.ts
 * Re-pair request rate limiting for MABA.
 *
 * Rules:
 * - Max 2 RE_PAIR_KASUH requests per cohort per user in 3 weeks.
 * - Window: 3 weeks = 21 days from cohort.startDate.
 */

import { createLogger } from '@/lib/logger';
import { prisma } from '@/utils/prisma';

const log = createLogger('request-limits');

const MAX_REPAIT_REQUESTS = 2;
const WINDOW_DAYS = 21; // 3 weeks

export interface CanRequestResult {
  allowed: boolean;
  reason?: string;
  currentCount?: number;
  maxCount?: number;
}

/**
 * Check if a user can submit a new RE_PAIR_KASUH request.
 *
 * Counts existing requests (PENDING, APPROVED, FULFILLED) within the 3-week window.
 * Returns { allowed: false, reason } if limit reached.
 */
export async function canRequestRePair(
  userId: string,
  cohortId: string
): Promise<CanRequestResult> {
  log.debug('Checking re-pair request eligibility', { userId, cohortId });

  // Get cohort to compute window
  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    select: { startDate: true, isActive: true },
  });

  if (!cohort) {
    log.warn('Cohort not found for re-pair limit check', { cohortId });
    return { allowed: false, reason: 'Cohort tidak ditemukan' };
  }

  // Check we're within the 3-week window
  const windowEnd = new Date(cohort.startDate);
  windowEnd.setDate(windowEnd.getDate() + WINDOW_DAYS);
  const now = new Date();

  if (now > windowEnd) {
    log.debug('Outside re-pair window', { userId, cohortId, windowEnd });
    return {
      allowed: false,
      reason: `Pengajuan pergantian hanya dapat dilakukan dalam ${WINDOW_DAYS} hari pertama cohort`,
    };
  }

  // Count existing requests in window
  const existingCount = await prisma.pairingRequest.count({
    where: {
      requesterUserId: userId,
      cohortId,
      type: 'RE_PAIR_KASUH',
      status: { in: ['PENDING', 'APPROVED', 'FULFILLED'] },
      createdAt: { gte: cohort.startDate },
    },
  });

  log.debug('Re-pair request count', { userId, cohortId, existingCount, max: MAX_REPAIT_REQUESTS });

  if (existingCount >= MAX_REPAIT_REQUESTS) {
    return {
      allowed: false,
      reason: `Anda telah mencapai batas ${MAX_REPAIT_REQUESTS} pengajuan pergantian untuk cohort ini`,
      currentCount: existingCount,
      maxCount: MAX_REPAIT_REQUESTS,
    };
  }

  return {
    allowed: true,
    currentCount: existingCount,
    maxCount: MAX_REPAIT_REQUESTS,
  };
}
