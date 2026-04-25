/**
 * src/lib/dashboard/cache.ts
 * Dashboard cache helpers for M13.
 *
 * Key strategy:
 *   Per-user payload:  dashboard:{role}:{userId}:{cohortId}   TTL 5min
 *   Shared live mood:  live:mood:{cohortId}                   TTL 60s
 *   Alert cache:       dashboard:alerts:{cohortId}             TTL 60s
 */

import { withCache, invalidateCache } from '@/lib/cache';
import { createLogger } from '@/lib/logger';

const log = createLogger('m13/dashboard-cache');

// Dashboard cache TTL: 5 minutes (300s)
export const DASHBOARD_CACHE_TTL = 5 * 60;

// Alert cache TTL: 60 seconds
export const ALERT_CACHE_TTL = 60;

/**
 * Generate a per-user per-role dashboard cache key.
 */
export function dashboardCacheKey(role: string, userId: string, cohortId: string): string {
  return `dashboard:${role.toLowerCase()}:${userId}:${cohortId}`;
}

/**
 * Get cached dashboard payload or build it fresh.
 * Wraps withCache with the correct key/TTL for dashboard payloads.
 */
export async function getCachedDashboardPayload<T>(
  role: string,
  userId: string,
  cohortId: string,
  builderFn: () => Promise<T>,
): Promise<T> {
  const key = dashboardCacheKey(role, userId, cohortId);
  return withCache(key, DASHBOARD_CACHE_TTL, builderFn);
}

/**
 * Invalidate dashboard cache for a given scope.
 *
 * @param scope - Which cache keys to invalidate
 *   - userId only  → invalidate all roles for this user
 *   - cohortId only → invalidate all users in this cohort
 *   - role + cohortId → invalidate a specific role × cohort
 */
export async function invalidateDashboardCache(scope: {
  userId?: string;
  role?: string;
  cohortId?: string;
}): Promise<void> {
  const { userId, role, cohortId } = scope;

  try {
    if (userId && !role && !cohortId) {
      // Invalidate all caches for this user
      await invalidateCache(`dashboard:*:${userId}:*`);
    } else if (cohortId && !userId && !role) {
      // Invalidate all caches for this cohort (all roles, all users)
      await invalidateCache(`dashboard:*:*:${cohortId}`);
      // Also invalidate live mood
      await invalidateCache(`live:mood:${cohortId}`);
      await invalidateCache(`dashboard:alerts:${cohortId}`);
    } else if (role && cohortId && !userId) {
      // Invalidate specific role for entire cohort
      await invalidateCache(`dashboard:${role.toLowerCase()}:*:${cohortId}`);
    } else if (userId && cohortId) {
      // Invalidate specific user in specific cohort (all roles)
      await invalidateCache(`dashboard:*:${userId}:${cohortId}`);
    } else {
      log.warn('invalidateDashboardCache called with insufficient scope', scope);
    }

    log.debug('Dashboard cache invalidated', scope);
  } catch (err) {
    // Non-blocking — log but don't throw
    log.warn('Dashboard cache invalidation failed (non-blocking)', { scope, error: err });
  }
}

/**
 * Invalidate the alert cache for a cohort.
 * Called by the red flag engine after running rules.
 */
export async function invalidateAlertCache(cohortId: string): Promise<void> {
  try {
    await invalidateCache(`dashboard:alerts:${cohortId}`);
    await invalidateCache(`live:alerts:${cohortId}:*`);
    log.debug('Alert cache invalidated', { cohortId });
  } catch (err) {
    // Non-blocking
    log.warn('Alert cache invalidation failed (non-blocking)', { cohortId, error: err });
  }
}

/**
 * Get cached live mood or compute fresh (60s TTL).
 * Shared key per cohortId — one cache entry serves all SC viewers.
 */
export async function getCachedLiveMood<T>(
  cohortId: string,
  computeFn: () => Promise<T>,
): Promise<T> {
  return withCache(`live:mood:${cohortId}`, ALERT_CACHE_TTL, computeFn);
}
