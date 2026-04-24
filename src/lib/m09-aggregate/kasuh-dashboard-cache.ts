/**
 * src/lib/m09-aggregate/kasuh-dashboard-cache.ts
 * NAWASENA M09 — Cache wrapper for Kasuh dashboard aggregate.
 *
 * Cache key: m09:kasuh-dashboard:{kasuhUserId}
 * TTL: 10 minutes
 * Invalidated on every KasuhLog write.
 */

import { withCache, invalidateCache } from '@/lib/cache';
import { createLogger } from '@/lib/logger';

const log = createLogger('m09:kasuh-dashboard-cache');

const TTL_SECONDS = 10 * 60; // 10 minutes

/**
 * Cache wrapper for Kasuh dashboard data.
 */
export async function withKasuhDashboardCache<T>(
  kasuhUserId: string,
  fetchFn: () => Promise<T>,
): Promise<T> {
  const key = `m09:kasuh-dashboard:${kasuhUserId}`;

  log.debug('Accessing Kasuh dashboard cache', { kasuhUserId });

  return withCache(key, TTL_SECONDS, fetchFn);
}

/**
 * Invalidate Kasuh dashboard cache.
 * Called after every KasuhLog write.
 */
export async function invalidateKasuhDashboard(kasuhUserId: string): Promise<void> {
  const key = `m09:kasuh-dashboard:${kasuhUserId}`;

  log.debug('Invalidating Kasuh dashboard cache', { kasuhUserId });

  await invalidateCache(key);
}
