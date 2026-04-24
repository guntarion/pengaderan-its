/**
 * src/lib/mood-aggregate/service.ts
 * NAWASENA M04 — Mood aggregate for KP dashboard.
 *
 * Computes average mood and distribution for a KP group on a given date.
 * Caches result in Redis (1 hour TTL).
 * Invalidates on pulse submit.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { withCache, invalidateCache } from '@/lib/cache';
import { resolveMabaForKP } from '@/lib/kp-group-resolver/resolve-maba-for-kp';
import { getLocalDateString, localDateStringToDate } from '@/lib/pulse/local-date';

const log = createLogger('mood-aggregate');

const CACHE_TTL_SECONDS = 3600; // 1 hour

export interface MoodAggregate {
  generatedAt: string;
  avgMood: number | null;
  distribution: Record<string, number>;  // { "1": count, "2": count, ... "5": count }
  totalSubmitted: number;
  totalMembers: number;
}

function getCacheKey(kpGroupId: string, dateStr: string): string {
  return `mood:aggregate:${kpGroupId}:${dateStr}`;
}

/**
 * Compute mood aggregate for a KP group on a specific date.
 */
export async function computeAggregate(
  kpGroupId: string,
  localDateStr: string,
  mabaUserIds: string[],
): Promise<MoodAggregate> {
  const localDate = localDateStringToDate(localDateStr);

  const pulses = await prisma.pulseCheck.findMany({
    where: {
      userId: { in: mabaUserIds },
      localDate,
    },
    select: { mood: true },
  });

  const totalMembers = mabaUserIds.length;
  const totalSubmitted = pulses.length;

  const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  let moodSum = 0;

  for (const pulse of pulses) {
    distribution[String(pulse.mood)] = (distribution[String(pulse.mood)] ?? 0) + 1;
    moodSum += pulse.mood;
  }

  const avgMood = totalSubmitted > 0 ? moodSum / totalSubmitted : null;

  return {
    generatedAt: new Date().toISOString(),
    avgMood,
    distribution,
    totalSubmitted,
    totalMembers,
  };
}

/**
 * Get mood aggregate for a KP group, using Redis cache.
 */
export async function getAggregateCached(
  kpUserId: string,
  cohortId: string,
  kpGroupId: string,
  timezone = 'Asia/Jakarta',
): Promise<MoodAggregate | null> {
  const mabaInfo = await resolveMabaForKP(kpUserId, cohortId);
  if (!mabaInfo || mabaInfo.mabaUserIds.length === 0) {
    return null;
  }

  const localDateStr = getLocalDateString(new Date(), timezone);
  const cacheKey = getCacheKey(kpGroupId, localDateStr);

  return withCache(
    cacheKey,
    CACHE_TTL_SECONDS,
    () => computeAggregate(kpGroupId, localDateStr, mabaInfo.mabaUserIds),
  );
}

/**
 * Invalidate the mood aggregate cache for a KP group.
 * Called when a Maba submits a pulse.
 */
export async function invalidateAggregateCache(
  kpGroupId: string,
  timezone = 'Asia/Jakarta',
): Promise<void> {
  const localDateStr = getLocalDateString(new Date(), timezone);
  const cacheKey = getCacheKey(kpGroupId, localDateStr);
  await invalidateCache(cacheKey);
  log.debug('Mood aggregate cache invalidated', { kpGroupId, localDateStr });
}

/**
 * List Maba who have NOT submitted a pulse today.
 * Only meaningful after 20:00 local time (per PRD).
 *
 * @param kpGroupId    - KP group to check
 * @param mabaUserIds  - All Maba in the group
 * @param localDateStr - Today's local date string (YYYY-MM-DD)
 * @param currentHour  - Current local hour (0-23), for 20:00 gate
 */
export async function listNotCheckedIn(
  kpGroupId: string,
  mabaUserIds: string[],
  localDateStr: string,
  currentHour: number,
): Promise<string[]> {
  // PRD: only show list after 20:00
  if (currentHour < 20) {
    return [];
  }

  const localDate = localDateStringToDate(localDateStr);

  const submitted = await prisma.pulseCheck.findMany({
    where: {
      userId: { in: mabaUserIds },
      localDate,
    },
    select: { userId: true },
  });

  const submittedIds = new Set(submitted.map((p) => p.userId));
  return mabaUserIds.filter((id) => !submittedIds.has(id));
}
