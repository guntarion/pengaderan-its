/**
 * src/lib/passport/progress-cache.ts
 * NAWASENA M05 — Redis cache helpers for passport progress.
 *
 * Cache key: passport:progress:{userId}       TTL 60s
 * Cohort aggregate: passport:agg:{cohortId}:{hash} TTL 300s
 */

import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { createLogger } from '@/lib/logger';

const log = createLogger('passport:progress-cache');

const PROGRESS_TTL = 60; // 60 seconds
const AGG_TTL = 300; // 5 minutes

/**
 * Get cached progress for a user. Returns null on cache miss or Redis unavailable.
 */
export async function getCachedProgress<T>(userId: string): Promise<T | null> {
  if (!isRedisConfigured()) return null;
  const redis = getRedisClient();
  const key = `passport:progress:${userId}`;
  try {
    const cached = await redis.get<T>(key);
    if (cached !== null && cached !== undefined) {
      log.debug('Progress cache hit', { userId });
      return cached;
    }
    log.debug('Progress cache miss', { userId });
    return null;
  } catch (err) {
    log.warn('Progress cache read failed', { userId, error: err });
    return null;
  }
}

/**
 * Set progress cache for a user.
 */
export async function setCachedProgress<T>(userId: string, data: T): Promise<void> {
  if (!isRedisConfigured()) return;
  const redis = getRedisClient();
  const key = `passport:progress:${userId}`;
  try {
    await redis.set(key, JSON.stringify(data), { ex: PROGRESS_TTL });
    log.debug('Progress cache set', { userId });
  } catch (err) {
    log.warn('Progress cache write failed', { userId, error: err });
  }
}

/**
 * Invalidate progress cache for a user.
 */
export async function invalidateProgressCache(userId: string): Promise<void> {
  if (!isRedisConfigured()) return;
  const redis = getRedisClient();
  const key = `passport:progress:${userId}`;
  try {
    await redis.del(key);
    log.debug('Progress cache invalidated', { userId });
  } catch (err) {
    log.warn('Progress cache invalidation failed', { userId, error: err });
  }
}

/**
 * Get cached cohort aggregate.
 */
export async function getCachedAggregate<T>(cohortId: string, filterHash: string): Promise<T | null> {
  if (!isRedisConfigured()) return null;
  const redis = getRedisClient();
  const key = `passport:agg:${cohortId}:${filterHash}`;
  try {
    const cached = await redis.get<T>(key);
    return cached ?? null;
  } catch (err) {
    log.warn('Aggregate cache read failed', { cohortId, error: err });
    return null;
  }
}

/**
 * Set cohort aggregate cache.
 */
export async function setCachedAggregate<T>(
  cohortId: string,
  filterHash: string,
  data: T,
): Promise<void> {
  if (!isRedisConfigured()) return;
  const redis = getRedisClient();
  const key = `passport:agg:${cohortId}:${filterHash}`;
  try {
    await redis.set(key, JSON.stringify(data), { ex: AGG_TTL });
  } catch (err) {
    log.warn('Aggregate cache write failed', { cohortId, error: err });
  }
}

/**
 * Acquire Redis lock for escalation idempotency.
 * Returns true if lock acquired (i.e., not already processing).
 */
export async function acquireEscalationLock(entryId: string): Promise<boolean> {
  if (!isRedisConfigured()) return true; // allow if Redis unavailable
  const redis = getRedisClient();
  const key = `passport:escalating:${entryId}`;
  try {
    // SETNX pattern: SET if Not eXists
    const result = await redis.set(key, '1', { ex: 300, nx: true });
    return result !== null; // null means key already existed
  } catch (err) {
    log.warn('Escalation lock acquire failed', { entryId, error: err });
    return true; // allow on error (fail-open)
  }
}

/**
 * Check Redis idempotency key for verifier actions.
 * Returns true if action was already processed.
 */
export async function checkVerifyIdempotency(entryId: string, verifierId: string): Promise<boolean> {
  if (!isRedisConfigured()) return false;
  const redis = getRedisClient();
  const key = `passport:verify-idempo:${entryId}:${verifierId}`;
  try {
    const exists = await redis.exists(key);
    return exists > 0;
  } catch (err) {
    log.warn('Verify idempotency check failed', { entryId, verifierId, error: err });
    return false;
  }
}

/**
 * Record verifier action idempotency key (TTL 1h).
 */
export async function recordVerifyIdempotency(entryId: string, verifierId: string): Promise<void> {
  if (!isRedisConfigured()) return;
  const redis = getRedisClient();
  const key = `passport:verify-idempo:${entryId}:${verifierId}`;
  try {
    await redis.set(key, '1', { ex: 3600 });
  } catch (err) {
    log.warn('Verify idempotency record failed', { entryId, verifierId, error: err });
  }
}
