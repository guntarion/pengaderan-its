/**
 * src/lib/m09-aggregate/weekly-cache.ts
 * NAWASENA M09 — Cache wrapper for weekly aggregate context.
 *
 * Cache key: m09:weekly-agg:{kpUserId}:{yearNumber}:{weekNumber}
 * TTL: 7 days
 * Invalidated when KPLogDaily is upserted within the same week.
 */

import { withCache, invalidateCache } from '@/lib/cache';
import { createLogger } from '@/lib/logger';
import type { WeeklyContext } from '@/lib/m09-aggregate/weekly-context';

const log = createLogger('m09:weekly-cache');

const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Build the cache key for a weekly aggregate.
 */
export function buildWeeklyCacheKey(kpUserId: string, yearNumber: number, weekNumber: number): string {
  return `m09:weekly-agg:${kpUserId}:${yearNumber}:${weekNumber}`;
}

/**
 * Get weekly context from cache, or fetch via fetchFn on miss.
 */
export async function withWeeklyCache(
  kpUserId: string,
  yearNumber: number,
  weekNumber: number,
  fetchFn: () => Promise<WeeklyContext>,
): Promise<WeeklyContext> {
  const key = buildWeeklyCacheKey(kpUserId, yearNumber, weekNumber);

  log.debug('Accessing weekly cache', { kpUserId, yearNumber, weekNumber });

  return withCache(key, TTL_SECONDS, fetchFn);
}

/**
 * Invalidate the weekly cache for a specific week.
 * Called when KPLogDaily is upserted within the same week.
 */
export async function invalidateWeeklyCache(
  kpUserId: string,
  weekNumber: number,
  yearNumber: number,
): Promise<void> {
  const key = buildWeeklyCacheKey(kpUserId, yearNumber, weekNumber);

  log.debug('Invalidating weekly cache', { kpUserId, yearNumber, weekNumber });

  await invalidateCache(key);
}
