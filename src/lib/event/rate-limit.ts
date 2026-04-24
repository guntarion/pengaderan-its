/**
 * src/lib/event/rate-limit.ts
 * NAWASENA M06 — RSVP rate limiting via Upstash Redis.
 *
 * Limits: max 10 RSVP actions per user per hour.
 * Key: event:rsvp:rate:{userId}
 * Fail-open on Redis error (with warning log).
 */

import { isRedisConfigured, getRedisClient } from '@/lib/redis';
import { createLogger } from '@/lib/logger';

const log = createLogger('event:rate-limit');

const RSVP_LIMIT = 10;
const RSVP_WINDOW_SECONDS = 3600; // 1 hour
const KEY_PREFIX = 'event:rsvp:rate';

export interface RSVPRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check RSVP rate limit for a user.
 * Returns allowed=true if under limit.
 * Fails open if Redis is unavailable.
 */
export async function checkRSVPRateLimit(userId: string): Promise<RSVPRateLimitResult> {
  const key = `${KEY_PREFIX}:${userId}`;
  const resetAt = new Date(Date.now() + RSVP_WINDOW_SECONDS * 1000);

  try {
    if (!isRedisConfigured()) {
      log.warn('Redis not available — RSVP rate limit bypassed (fail-open)', { userId });
      return { allowed: true, remaining: RSVP_LIMIT, resetAt };
    }

    const redis = getRedisClient();
    const current = await redis.incr(key);

    // Set expiry on first increment
    if (current === 1) {
      await redis.expire(key, RSVP_WINDOW_SECONDS);
    }

    if (current > RSVP_LIMIT) {
      log.warn('RSVP rate limit exceeded', { userId, count: current, limit: RSVP_LIMIT });
      return { allowed: false, remaining: 0, resetAt };
    }

    return {
      allowed: true,
      remaining: RSVP_LIMIT - current,
      resetAt,
    };
  } catch (err) {
    // Fail open — log warning but allow the RSVP
    log.warn('RSVP rate limit check failed — failing open', { error: err, userId });
    return { allowed: true, remaining: RSVP_LIMIT, resetAt };
  }
}
