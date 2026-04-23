// src/lib/redis.ts
// Upstash Redis client singleton.
// Requires: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
// Get credentials at: https://console.upstash.com

import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

/**
 * Get the Redis client instance (singleton).
 * Throws if env vars are not configured — use isRedisConfigured() before calling.
 */
export function getRedisClient(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error(
        'Redis not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local'
      );
    }

    redis = new Redis({ url, token });
  }

  return redis;
}

/**
 * Check if Redis is configured (env vars present).
 * Use this to conditionally enable Redis-dependent features.
 * Rate limiting degrades gracefully without Redis (allows all requests in dev).
 */
export function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/**
 * Key generators for Redis storage.
 * Convention: namespace:entity:id[:suffix]
 */
export const REDIS_KEYS = {
  // Monthly AI usage cache: ai_usage:{userId}:{year}:{month}
  monthlyUsage: (userId: string, year: number, month: number) =>
    `ai_usage:${userId}:${year}:${month}`,

  // Session cache
  sessionCache: (sessionToken: string) => `session:${sessionToken}`,

  // Webhook idempotency: webhook:idempotency:{key}
  webhookIdempotency: (key: string) => `webhook:idempotency:${key}`,
};

export { redis };
