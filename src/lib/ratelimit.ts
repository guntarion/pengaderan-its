// src/lib/ratelimit.ts
// Per-request rate limiting using Upstash Redis.
// Role-based limits — degrades gracefully if Redis is not configured.
//
// Roles: admin > moderator/editor > member > viewer/guest
//
// Key format:
//   Authenticated users: user:{userId}
//   Anonymous users:     ip:{ipAddress}

import { Ratelimit } from '@upstash/ratelimit';
import { getRedisClient, isRedisConfigured } from './redis';
import { createLogger } from './logger';

const log = createLogger('ratelimit');

const BASE_REQUESTS_PER_MINUTE = 5;
const BASE_REQUESTS_PER_DAY = 10;

// Role-based multipliers (applied to base limits)
const ROLE_MULTIPLIERS = {
  admin:     { minute: 50, day: 50 },  // 250/min, 500/day
  moderator: { minute: 4,  day: 5  },  // 20/min,  50/day
  editor:    { minute: 4,  day: 5  },  // 20/min,  50/day
  member:    { minute: 1,  day: 5  },  //  5/min,  50/day
  viewer:    { minute: 1,  day: 1  },  //  5/min,  10/day
  guest:     { minute: 1,  day: 1  },  //  5/min,  10/day
} as const;

type UserRole = keyof typeof ROLE_MULTIPLIERS;

/**
 * Get per-minute and per-day limits for a role.
 */
export function getRateLimitsForRole(role: string = 'member') {
  const userRole = (role in ROLE_MULTIPLIERS ? role : 'member') as UserRole;
  const m = ROLE_MULTIPLIERS[userRole];
  return {
    perMinute: BASE_REQUESTS_PER_MINUTE * m.minute,
    perDay: BASE_REQUESTS_PER_DAY * m.day,
  };
}

// Cached rate limiter instances per role
const rateLimiterCache = new Map<string, { perMinute: Ratelimit; perDay: Ratelimit }>();

function createRateLimiters(role: string = 'member') {
  const userRole = (role in ROLE_MULTIPLIERS ? role : 'member') as UserRole;
  if (rateLimiterCache.has(userRole)) return rateLimiterCache.get(userRole)!;

  const limits = getRateLimitsForRole(userRole);
  const redis = getRedisClient();

  const limiters = {
    perMinute: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limits.perMinute, '60 s'),
      prefix: `rl:ai:1m:${userRole}`,
      analytics: true,
    }),
    perDay: new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(limits.perDay, '24 h'),
      prefix: `rl:ai:1d:${userRole}`,
      analytics: true,
    }),
  };

  rateLimiterCache.set(userRole, limiters);
  return limiters;
}

export function getRateLimitersForRole(role: string = 'member') {
  return createRateLimiters(role);
}

export interface RateLimitCheckResult {
  success: boolean;
  limit: { perMinute: number; perDay: number };
  remaining: { perMinute: number; perDay: number };
  reset: { perMinute: number; perDay: number };
  retryAfterSeconds?: number;
  message?: string;
}

/**
 * Check and consume rate limit quota for a user.
 * Returns success=true if request is allowed.
 * Falls back to allow-all if Redis is not configured (dev mode).
 */
export async function checkRateLimit(
  userKey: string,
  role: string = 'member'
): Promise<RateLimitCheckResult> {
  if (!isRedisConfigured()) {
    const limits = getRateLimitsForRole(role);
    log.warn('Redis not configured, allowing request');
    return {
      success: true,
      limit: limits,
      remaining: limits,
      reset: { perMinute: Date.now() + 60_000, perDay: Date.now() + 86_400_000 },
    };
  }

  const limits = getRateLimitsForRole(role);
  const { perMinute, perDay } = getRateLimitersForRole(role);

  const [minuteResult, dayResult] = await Promise.all([
    perMinute.limit(userKey),
    perDay.limit(userKey),
  ]);

  const success = minuteResult.success && dayResult.success;

  const result: RateLimitCheckResult = {
    success,
    limit: limits,
    remaining: { perMinute: minuteResult.remaining, perDay: dayResult.remaining },
    reset: { perMinute: minuteResult.reset, perDay: dayResult.reset },
  };

  if (!success) {
    if (!minuteResult.success) {
      result.retryAfterSeconds = Math.ceil((minuteResult.reset - Date.now()) / 1000);
      result.message = `Rate limit exceeded: ${limits.perMinute} requests/minute. Retry in ${result.retryAfterSeconds}s.`;
    } else {
      result.retryAfterSeconds = Math.ceil((dayResult.reset - Date.now()) / 1000);
      result.message = `Daily limit exceeded: ${limits.perDay} requests/day. Resets tomorrow.`;
    }
  }

  return result;
}

/**
 * Get current rate limit status without consuming quota.
 */
export async function getRateLimitStatus(
  userKey: string,
  role: string = 'member'
): Promise<RateLimitCheckResult> {
  if (!isRedisConfigured()) {
    const limits = getRateLimitsForRole(role);
    return {
      success: true,
      limit: limits,
      remaining: limits,
      reset: { perMinute: Date.now() + 60_000, perDay: Date.now() + 86_400_000 },
    };
  }

  const limits = getRateLimitsForRole(role);
  const { perMinute, perDay } = getRateLimitersForRole(role);

  const [minuteResult, dayResult] = await Promise.all([
    perMinute.getRemaining(userKey),
    perDay.getRemaining(userKey),
  ]);

  return {
    success: true,
    limit: limits,
    remaining: { perMinute: minuteResult.remaining, perDay: dayResult.remaining },
    reset: { perMinute: minuteResult.reset, perDay: dayResult.reset },
  };
}

export const RATE_LIMIT_CONFIG = {
  base: { perMinute: BASE_REQUESTS_PER_MINUTE, perDay: BASE_REQUESTS_PER_DAY },
  roles: ROLE_MULTIPLIERS,
} as const;
