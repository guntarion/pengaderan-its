// src/lib/cache.ts
// Generic cache-aside utility using Upstash Redis.
// Degrades gracefully — returns fresh data if Redis is not configured.
//
// Usage:
//   import { withCache, invalidateCache, CACHE_KEYS } from '@/lib/cache';
//
//   const users = await withCache('users:all', 300, () => prisma.user.findMany());
//   await invalidateCache('users:*');

import { getRedisClient, isRedisConfigured } from './redis';
import { createLogger } from './logger';

const log = createLogger('cache');

/**
 * Cache-aside pattern: return cached value or fetch fresh.
 *
 * @param key     - Redis key (use CACHE_KEYS helpers for consistency)
 * @param ttl     - Time-to-live in seconds
 * @param fetchFn - Function to call on cache miss
 * @returns The cached or freshly-fetched value
 */
export async function withCache<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>,
): Promise<T> {
  if (!isRedisConfigured()) {
    return fetchFn();
  }

  const redis = getRedisClient();

  try {
    // Try cache first
    const cached = await redis.get<T>(key);
    if (cached !== null && cached !== undefined) {
      log.debug('Cache hit', { key });
      return cached;
    }

    log.debug('Cache miss', { key });
  } catch (err) {
    log.warn('Cache read failed, fetching fresh', { key, error: err });
  }

  // Fetch fresh data
  const data = await fetchFn();

  // Write to cache (fire-and-forget, don't block response)
  try {
    await redis.set(key, JSON.stringify(data), { ex: ttl });
  } catch (err) {
    log.warn('Cache write failed', { key, error: err });
  }

  return data;
}

/**
 * Invalidate cache entries by exact key or pattern.
 *
 * For exact key: `invalidateCache('users:all')`
 * For pattern:   `invalidateCache('users:*')` — uses SCAN to find matching keys
 */
export async function invalidateCache(keyOrPattern: string): Promise<number> {
  if (!isRedisConfigured()) return 0;

  const redis = getRedisClient();

  try {
    if (!keyOrPattern.includes('*')) {
      // Exact key
      const deleted = await redis.del(keyOrPattern);
      log.debug('Cache invalidated (exact)', { key: keyOrPattern, deleted });
      return deleted;
    }

    // Pattern — scan and delete in batches
    let cursor = 0;
    let totalDeleted = 0;

    do {
      // Upstash scan returns [cursor: string, keys: string[]]
      const result = await redis.scan(cursor, {
        match: keyOrPattern,
        count: 100,
      });
      const nextCursor = Number(result[0]);
      const keys = result[1] as string[];
      cursor = nextCursor;

      if (keys.length > 0) {
        const pipeline = redis.pipeline();
        for (const k of keys) {
          pipeline.del(k);
        }
        await pipeline.exec();
        totalDeleted += keys.length;
      }
    } while (cursor !== 0);

    log.debug('Cache invalidated (pattern)', { pattern: keyOrPattern, deleted: totalDeleted });
    return totalDeleted;
  } catch (err) {
    log.warn('Cache invalidation failed', { key: keyOrPattern, error: err });
    return 0;
  }
}

/**
 * Get a cached value without triggering a fetch.
 * Returns null if not found or Redis unavailable.
 */
export async function getCached<T>(key: string): Promise<T | null> {
  if (!isRedisConfigured()) return null;

  try {
    const redis = getRedisClient();
    return await redis.get<T>(key);
  } catch {
    return null;
  }
}

/**
 * Set a cache value directly.
 */
export async function setCache<T>(key: string, data: T, ttl: number): Promise<void> {
  if (!isRedisConfigured()) return;

  try {
    const redis = getRedisClient();
    await redis.set(key, JSON.stringify(data), { ex: ttl });
  } catch (err) {
    log.warn('Cache set failed', { key, error: err });
  }
}

// ---- Key generators ----

/** Standard cache key generators. Convention: {entity}:{qualifier} */
export const CACHE_KEYS = {
  /** All items of a type: entity:all */
  all: (entity: string) => `${entity}:all`,

  /** Single item by ID: entity:{id} */
  byId: (entity: string, id: string) => `${entity}:${id}`,

  /** Paginated list: entity:list:{page}:{limit}:{sort?} */
  list: (entity: string, page: number, limit: number, sort?: string) =>
    `${entity}:list:${page}:${limit}${sort ? `:${sort}` : ''}`,

  /** Custom qualifier: entity:{qualifier} */
  custom: (entity: string, qualifier: string) => `${entity}:${qualifier}`,

  /** Pattern for invalidation: entity:* */
  pattern: (entity: string) => `${entity}:*`,
};

// ---- Common TTL constants (seconds) ----

export const CACHE_TTL = {
  /** 30 seconds — for frequently changing data */
  SHORT: 30,
  /** 5 minutes — default for most queries */
  MEDIUM: 300,
  /** 30 minutes — for rarely changing data */
  LONG: 1800,
  /** 1 hour */
  HOUR: 3600,
  /** 24 hours — for static lookups */
  DAY: 86400,
} as const;
