/**
 * src/lib/pulse/red-flag-engine.ts
 * NAWASENA M04 — Red-flag trigger engine.
 *
 * Checks if a user's recent 3 pulses all have mood ≤ 2.
 * Uses Redis SETNX for 7-day cooldown (no double-trigger).
 * If no KP assigned, falls back to SC for the cohort.
 *
 * Pure-function friendly for unit testing.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { resolveKPForMaba } from '@/lib/kp-group-resolver/resolve-kp-for-maba';
import { UserRole } from '@prisma/client';

const log = createLogger('red-flag-engine');

const RED_FLAG_THRESHOLD = 2.0;    // avg mood ≤ this triggers alert
const COOLDOWN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const MIN_PULSES_REQUIRED = 3;

export interface RedFlagCheckResult {
  triggered: boolean;
  eventId?: string;
  reason?: 'cooldown' | 'insufficient_pulses' | 'mood_ok' | 'no_notifiable_user';
}

/**
 * Main red-flag check. Called after each pulse submit.
 * Does NOT block the HTTP response — call with void or catch.
 */
export async function checkAndTrigger(
  userId: string,
  organizationId: string,
  cohortId: string,
  triggerPulseId: string,
): Promise<RedFlagCheckResult> {
  log.info('Red-flag check start', { userId });

  // 1. Fetch last 3 pulses
  const recentPulses = await prisma.pulseCheck.findMany({
    where: { userId },
    orderBy: { recordedAt: 'desc' },
    take: MIN_PULSES_REQUIRED,
    select: { id: true, mood: true, emoji: true, comment: true, recordedAt: true, localDate: true },
  });

  // 2. Need exactly MIN_PULSES_REQUIRED to evaluate
  if (recentPulses.length < MIN_PULSES_REQUIRED) {
    log.debug('Not enough pulses for red-flag check', { userId, count: recentPulses.length });
    return { triggered: false, reason: 'insufficient_pulses' };
  }

  // 3. Check if all 3 moods are ≤ threshold
  const allLow = recentPulses.every((p) => p.mood <= RED_FLAG_THRESHOLD);
  if (!allLow) {
    log.debug('Mood OK, no red-flag', { userId, moods: recentPulses.map((p) => p.mood) });
    return { triggered: false, reason: 'mood_ok' };
  }

  // 4. Check cooldown via Redis
  if (isRedisConfigured()) {
    const redis = getRedisClient();
    const cooldownKey = `redflag:cooldown:${userId}`;

    // SETNX + EXPIRE — only set if key doesn't exist
    const pipeline = redis.pipeline();
    pipeline.set(cooldownKey, '1', { nx: true, ex: COOLDOWN_TTL_SECONDS });
    const results = await pipeline.exec();

    // If set returned null, key already existed → cooldown active
    const setResult = results?.[0];
    if (setResult === null) {
      log.info('Red-flag cooldown active, skipping trigger', { userId });
      return { triggered: false, reason: 'cooldown' };
    }
  }

  log.info('Red-flag threshold met, triggering', { userId, moods: recentPulses.map((p) => p.mood) });

  // 5. Resolve KP for this Maba
  let notifiedUserId: string | null = null;
  let kpGroupId: string | null = null;

  const kpInfo = await resolveKPForMaba(userId, cohortId);
  if (kpInfo) {
    notifiedUserId = kpInfo.kpUserId;
    kpGroupId = kpInfo.kpGroupId;
  } else {
    // Fallback: find SC for the cohort
    const sc = await prisma.user.findFirst({
      where: {
        organizationId,
        currentCohortId: cohortId,
        role: UserRole.SC,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    notifiedUserId = sc?.id ?? null;
    log.warn('No KP found for Maba, falling back to SC', { userId, scId: notifiedUserId });
  }

  if (!notifiedUserId) {
    log.error('No KP or SC found to notify for red-flag', { userId, organizationId, cohortId });
    return { triggered: false, reason: 'no_notifiable_user' };
  }

  // 6. Create RedFlagEvent
  const pulseSnapshot = recentPulses.map((p) => ({
    mood: p.mood,
    emoji: p.emoji,
    comment: p.comment,
    recordedAt: p.recordedAt.toISOString(),
    localDate: p.localDate.toISOString().split('T')[0],
  }));

  const event = await prisma.redFlagEvent.create({
    data: {
      organizationId,
      subjectUserId: userId,
      kpGroupId,
      notifiedUserId,
      cohortId,
      triggerPulseId,
      pulseSnapshot,
      status: 'ACTIVE',
    },
  });

  log.info('RedFlagEvent created', { eventId: event.id, userId, notifiedUserId });

  // 7. TODO: call sendNotification (M15) when M15 Phase A-D is stable
  // sendNotification({ userId: notifiedUserId, templateKey: 'RED_FLAG_MABA', ... })

  return { triggered: true, eventId: event.id };
}

/**
 * Pure function version for unit testing — takes pulses as input, no DB.
 */
export function evaluateRedFlagCondition(moods: number[]): boolean {
  if (moods.length < MIN_PULSES_REQUIRED) return false;
  const recent = moods.slice(0, MIN_PULSES_REQUIRED);
  return recent.every((m) => m <= RED_FLAG_THRESHOLD);
}
