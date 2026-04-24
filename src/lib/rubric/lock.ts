/**
 * src/lib/rubric/lock.ts
 * NAWASENA M04 — Redis-based lock for rubric scoring.
 *
 * Prevents 2 KPs from scoring the same journal concurrently.
 * Lock TTL: 5 minutes (300 seconds).
 * Heartbeat: refresh TTL every 60 seconds while KP is on page.
 */

import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { createLogger } from '@/lib/logger';

const log = createLogger('rubric-lock');

const LOCK_TTL_SECONDS = 300; // 5 minutes
const LOCK_KEY_PREFIX = 'rubric:lock:';

function getLockKey(journalId: string): string {
  return `${LOCK_KEY_PREFIX}${journalId}`;
}

/**
 * Acquire a lock on a journal for scoring.
 * Returns true if lock acquired, false if already locked by someone else.
 *
 * @param journalId - Journal being scored
 * @param userId    - KP acquiring the lock
 * @param ttl       - Lock TTL in seconds (default 300)
 */
export async function acquireLock(
  journalId: string,
  userId: string,
  ttl = LOCK_TTL_SECONDS,
): Promise<{ acquired: boolean; lockedByUserId?: string }> {
  if (!isRedisConfigured()) {
    log.warn('Redis not configured — lock not enforced');
    return { acquired: true };
  }

  const redis = getRedisClient();
  const key = getLockKey(journalId);

  // Try to set with NX (only if not exists)
  const result = await redis.set(key, userId, { nx: true, ex: ttl });

  if (result === 'OK') {
    log.info('Lock acquired', { journalId, userId });
    return { acquired: true };
  }

  // Lock exists — get current holder
  const currentHolder = await redis.get<string>(key);
  log.info('Lock already held', { journalId, userId, lockedBy: currentHolder ?? 'unknown' });
  return { acquired: false, lockedByUserId: currentHolder ?? undefined };
}

/**
 * Release a lock (only by the current lock holder).
 *
 * @param journalId - Journal to unlock
 * @param userId    - Must match the lock holder
 * @returns true if lock was released, false if not held by userId
 */
export async function releaseLock(journalId: string, userId: string): Promise<boolean> {
  if (!isRedisConfigured()) return true;

  const redis = getRedisClient();
  const key = getLockKey(journalId);

  const current = await redis.get<string>(key);
  if (current !== userId) {
    log.warn('Cannot release lock: not holder', { journalId, userId, holder: current });
    return false;
  }

  await redis.del(key);
  log.info('Lock released', { journalId, userId });
  return true;
}

/**
 * Refresh TTL on an existing lock (heartbeat).
 * Only works if the caller is the current lock holder.
 *
 * @param journalId - Journal being scored
 * @param userId    - Current lock holder
 * @param ttl       - New TTL in seconds
 * @returns true if refreshed, false if lock not held by userId
 */
export async function heartbeat(
  journalId: string,
  userId: string,
  ttl = LOCK_TTL_SECONDS,
): Promise<boolean> {
  if (!isRedisConfigured()) return true;

  const redis = getRedisClient();
  const key = getLockKey(journalId);

  const current = await redis.get<string>(key);
  if (current !== userId) {
    log.warn('Heartbeat failed: not lock holder', { journalId, userId });
    return false;
  }

  await redis.expire(key, ttl);
  log.debug('Lock TTL refreshed', { journalId, userId });
  return true;
}

/**
 * Check if a lock is held (and by whom).
 */
export async function getLockHolder(journalId: string): Promise<string | null> {
  if (!isRedisConfigured()) return null;

  const redis = getRedisClient();
  return redis.get<string>(getLockKey(journalId));
}
