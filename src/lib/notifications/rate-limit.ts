/**
 * src/lib/notifications/rate-limit.ts
 * NAWASENA M15 — Redis-based rate limiting for FORM_REMINDER notifications.
 *
 * Key: notif:ratelimit:{orgId}:{userId}:{templateKey}:{year}-W{week}
 * TTL: 8 days (auto-expires after week boundary + buffer)
 * Fail-open: if Redis unavailable, allow send
 */

import { createLogger } from '@/lib/logger';
import { isRedisConfigured, getRedisClient } from '../redis';

const log = createLogger('notifications:rate-limit');

/**
 * Get the ISO week key for a given date.
 * Format: {year}-W{week} e.g. "2026-W17"
 */
function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

interface RateLimitResult {
  shouldSend: boolean;
  escalate: boolean;
  count: number;
  failOpen: boolean; // true if Redis was unavailable
}

/**
 * Check rate limit and increment counter.
 * Max 3 sends per user per template per week.
 * On 4th attempt: escalate (notify KP).
 */
export async function checkAndIncrement(
  userId: string,
  templateKey: string,
  orgId: string,
  maxPerWeek = 3,
): Promise<RateLimitResult> {
  if (!isRedisConfigured()) {
    log.warn('Redis not configured — rate limit fail-open', { userId, templateKey });
    return { shouldSend: true, escalate: false, count: 0, failOpen: true };
  }

  const weekKey = isoWeekKey(new Date());
  const key = `notif:ratelimit:${orgId}:${userId}:${templateKey}:${weekKey}`;

  try {
    const redis = getRedisClient();

    // Atomic increment
    const count = await redis.incr(key);

    // Set TTL on first increment (8 days for week boundary + buffer)
    if (count === 1) {
      await redis.expire(key, 8 * 24 * 3600);
    }

    const shouldSend = count <= maxPerWeek;
    const escalate = count === maxPerWeek + 1; // 4th attempt triggers escalation

    if (!shouldSend) {
      log.info('Rate limit reached for user', {
        userId,
        templateKey,
        orgId,
        count,
        maxPerWeek,
        weekKey,
        escalate,
      });
    } else {
      log.debug('Rate limit check passed', { userId, templateKey, count, maxPerWeek });
    }

    return { shouldSend, escalate, count, failOpen: false };
  } catch (err) {
    log.warn('Redis rate-limit error — fail-open', { userId, templateKey, error: err });
    return { shouldSend: true, escalate: false, count: 0, failOpen: true };
  }
}

/**
 * Check current count without incrementing (for preview/dry-run).
 */
export async function getCurrentCount(
  userId: string,
  templateKey: string,
  orgId: string,
): Promise<number> {
  if (!isRedisConfigured()) return 0;

  const weekKey = isoWeekKey(new Date());
  const key = `notif:ratelimit:${orgId}:${userId}:${templateKey}:${weekKey}`;

  try {
    const redis = getRedisClient();
    const val = await redis.get<number>(key);
    return val ?? 0;
  } catch {
    return 0;
  }
}
