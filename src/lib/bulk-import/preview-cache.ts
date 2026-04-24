/**
 * src/lib/bulk-import/preview-cache.ts
 * Redis-backed preview cache for bulk user import.
 *
 * A preview token is a one-time use key — deleted after commit or expiry.
 * TTL: 10 minutes (600 seconds).
 * Gracefully degrades to in-memory Map when Redis is not configured (dev).
 */

import { createLogger } from '@/lib/logger';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import type { ParseResult } from './csv-parser';
import type { ImportDecision } from './csv-schema';

const log = createLogger('preview-cache');

export const PREVIEW_TTL_SECONDS = 600; // 10 minutes

// In-memory fallback for development (no Redis)
const memoryCache = new Map<string, { data: CachedPreview; expiresAt: number }>();

export interface CachedPreview {
  organizationId: string;
  actorUserId: string;
  fileHash: string;
  parseResult: ParseResult;
  cohortIds: Record<string, string>; // cohortCode → cohortId (resolved during preview)
  createdAt: string; // ISO string
}

function redisKey(token: string): string {
  return `bulk_import:preview:${token}`;
}

/**
 * Store a parsed preview result in Redis (or memory fallback).
 * Returns the token to use for commit.
 */
export async function storePreview(token: string, data: CachedPreview): Promise<void> {
  const ttl = PREVIEW_TTL_SECONDS;

  if (isRedisConfigured()) {
    try {
      const redis = getRedisClient();
      await redis.set(redisKey(token), JSON.stringify(data), { ex: ttl });
      log.info('Preview stored in Redis', { token, ttl });
      return;
    } catch (err) {
      log.warn('Redis store failed, falling back to memory', { token, error: err });
    }
  }

  // In-memory fallback
  memoryCache.set(token, {
    data,
    expiresAt: Date.now() + ttl * 1000,
  });
  log.info('Preview stored in memory (Redis not configured)', { token, ttl });
}

/**
 * Retrieve and optionally delete a preview from cache.
 * Pass `consume = true` to delete after retrieval (one-time use).
 */
export async function getPreview(
  token: string,
  consume = false
): Promise<CachedPreview | null> {
  if (isRedisConfigured()) {
    try {
      const redis = getRedisClient();
      const key = redisKey(token);
      const raw = await redis.get<string>(key);
      if (!raw) {
        log.debug('Preview not found in Redis', { token });
        return null;
      }
      if (consume) {
        await redis.del(key);
        log.info('Preview consumed from Redis', { token });
      }
      return typeof raw === 'string' ? (JSON.parse(raw) as CachedPreview) : (raw as CachedPreview);
    } catch (err) {
      log.warn('Redis get failed, trying memory fallback', { token, error: err });
    }
  }

  // In-memory fallback
  const entry = memoryCache.get(token);
  if (!entry) {
    log.debug('Preview not found in memory', { token });
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(token);
    log.debug('Preview expired in memory', { token });
    return null;
  }
  if (consume) {
    memoryCache.delete(token);
    log.info('Preview consumed from memory', { token });
  }
  return entry.data;
}

/**
 * Explicitly delete a preview token (used when upload is cancelled or replaced).
 */
export async function deletePreview(token: string): Promise<void> {
  if (isRedisConfigured()) {
    try {
      const redis = getRedisClient();
      await redis.del(redisKey(token));
    } catch (err) {
      log.warn('Redis delete failed', { token, error: err });
    }
  }
  memoryCache.delete(token);
}

/**
 * Prune expired entries from memory fallback (called periodically if needed).
 */
export function pruneMemoryCache(): void {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (now > entry.expiresAt) {
      memoryCache.delete(key);
    }
  }
}

// Add ImportDecision to csv-schema.ts export (re-export for consumers)
export type { ImportDecision };
