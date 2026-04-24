/**
 * src/lib/anon-report/rate-limit.ts
 * NAWASENA M12 — Redis ZSET sliding window rate limiter for anonymous channel.
 *
 * Uses fingerprint hash (never raw IP) as the rate limit key.
 * Graceful degradation: if Redis is unavailable, allow request and log warning.
 *
 * Limits:
 *   submit: 5 per 24h (sliding window)
 *   status-lookup: 30 per 5 min
 *   presign: 10 per 24h
 *
 * Redis key format: anon-rl:{key}:{fingerprintHash}
 * ZSET value: "${timestamp}-${randomSuffix}" (unique members)
 * ZSET score: Date.now() (millisecond timestamp)
 */

import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import { createLogger } from '@/lib/logger';

const log = createLogger('anon-rate-limit');

export type AnonRateLimitKey = 'submit' | 'status-lookup' | 'presign';

export interface AnonRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  count: number;
}

/**
 * Check if the request should be allowed based on sliding window rate limit.
 *
 * @param fingerprint - SHA-256 fingerprint hash (never raw IP/UA)
 * @param key - Which rate limit bucket to check
 * @param limit - Maximum requests allowed
 * @param windowSeconds - Time window in seconds
 * @returns Rate limit result with allowed/remaining/resetAt
 */
export async function checkAnonRateLimit(
  fingerprint: string,
  key: AnonRateLimitKey,
  limit: number,
  windowSeconds: number,
): Promise<AnonRateLimitResult> {
  // Graceful degradation if Redis is not configured
  if (!isRedisConfigured()) {
    log.warn('Redis not configured — rate limit bypassed (allow-all fallback)');
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: new Date(Date.now() + windowSeconds * 1000),
      count: 0,
    };
  }

  const redis = getRedisClient();
  const redisKey = `anon-rl:${key}:${fingerprint}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = now - windowMs;

  try {
    // Sliding window log approach:
    // 1. Remove old entries outside the window
    // 2. Add the current request
    // 3. Count entries (including current)

    // Remove expired entries
    await redis.zremrangebyscore(redisKey, 0, windowStart);

    // Count existing entries BEFORE adding this request
    const countBefore = await redis.zcard(redisKey);

    if (countBefore >= limit) {
      // Over limit — don't add this request to the ZSET
      const resetAt = new Date(now + windowSeconds * 1000);
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        count: countBefore,
      };
    }

    // Under limit — record this request
    const member = `${now}-${Math.random().toString(36).slice(2)}`;
    await redis.zadd(redisKey, { score: now, member });

    // Set TTL on the key (auto-cleanup)
    await redis.expire(redisKey, windowSeconds + 60); // +60s buffer

    const newCount = countBefore + 1;
    return {
      allowed: true,
      remaining: Math.max(0, limit - newCount),
      resetAt: new Date(now + windowSeconds * 1000),
      count: newCount,
    };
  } catch (err) {
    // Redis error — fail open (allow request) to avoid blocking genuine reporters
    log.error('Redis rate limit check failed — fail-open', { error: err, key });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: new Date(Date.now() + windowSeconds * 1000),
      count: 0,
    };
  }
}

/**
 * Increment rate limit counter after successful submit.
 * Called only AFTER the handler succeeds (to not count failed attempts).
 *
 * Note: This is already handled in checkAnonRateLimit when allowed=true.
 * This function is kept for explicit increment use cases.
 */
export async function incrementAnonRateLimit(
  fingerprint: string,
  key: AnonRateLimitKey,
  windowSeconds: number,
): Promise<void> {
  if (!isRedisConfigured()) return;

  const redis = getRedisClient();
  const redisKey = `anon-rl:${key}:${fingerprint}`;
  const now = Date.now();
  const member = `${now}-${Math.random().toString(36).slice(2)}`;

  try {
    await redis.zadd(redisKey, { score: now, member });
    await redis.expire(redisKey, windowSeconds + 60);
  } catch (err) {
    log.warn('Failed to increment rate limit counter', { error: err });
  }
}
