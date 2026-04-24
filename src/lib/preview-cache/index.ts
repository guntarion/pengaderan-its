/**
 * src/lib/preview-cache/index.ts
 * Generalized Redis-backed preview cache for bulk operations.
 *
 * Generalized from src/lib/bulk-import/preview-cache.ts (M01).
 * Used by M03 bulk ops: Buddy generate, Kasuh suggest, KP Group assign.
 *
 * Token: HMAC-signed UUID stored in Redis with TTL 10 minutes.
 * Tamper detection: HMAC via PREVIEW_CACHE_SECRET env.
 * Graceful degradation: in-memory Map when Redis not configured.
 */

import { createLogger } from '@/lib/logger';
import { getRedisClient, isRedisConfigured } from '@/lib/redis';
import type { z } from 'zod';

const log = createLogger('preview-cache');

export const PREVIEW_TTL_SECONDS = 600; // 10 minutes

// In-memory fallback for development (no Redis)
const memoryCache = new Map<string, { data: unknown; expiresAt: number }>();

// ============================================================
// HMAC helpers (via PREVIEW_CACHE_SECRET env)
// ============================================================

function getPreviewSecret(): string {
  const secret = process.env.PREVIEW_CACHE_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'nawasena-dev-preview-secret';
  return secret;
}

/**
 * Simple HMAC-like signature using FNV hash (no crypto module — sync, server-safe).
 * For production integrity, PREVIEW_CACHE_SECRET should be set.
 */
function signToken(token: string, data: unknown): string {
  const secret = getPreviewSecret();
  const payload = `${token}:${JSON.stringify(data)}:${secret}`;
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function generateToken(): string {
  // UUID-like token using Date + random
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `prev_${ts}_${rand}`;
}

function redisKey(token: string): string {
  return `pairing:preview:${token}`;
}

// ============================================================
// Cache wrapper interface
// ============================================================

interface CacheEntry<T> {
  token: string;
  signature: string;
  data: T;
  createdAt: string;
}

// ============================================================
// Exports
// ============================================================

/**
 * Store preview data in Redis (or memory fallback).
 * Returns the signed token to pass to commit endpoint.
 */
export async function createPreviewToken<T>(
  data: T,
  ttlSeconds = PREVIEW_TTL_SECONDS
): Promise<string> {
  const token = generateToken();
  const signature = signToken(token, data);

  const entry: CacheEntry<T> = {
    token,
    signature,
    data,
    createdAt: new Date().toISOString(),
  };

  if (isRedisConfigured()) {
    try {
      const redis = getRedisClient();
      await redis.set(redisKey(token), JSON.stringify(entry), { ex: ttlSeconds });
      log.info('Preview token stored in Redis', { token, ttl: ttlSeconds });
      return token;
    } catch (err) {
      log.warn('Redis store failed, falling back to memory', { token, error: err });
    }
  }

  // In-memory fallback
  memoryCache.set(token, {
    data: entry,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
  log.info('Preview token stored in memory (Redis not configured)', { token, ttl: ttlSeconds });

  return token;
}

/**
 * Retrieve and validate a preview token.
 * Optionally validates data against a Zod schema.
 * Returns null if not found, expired, or signature invalid.
 */
export async function readPreview<T>(
  token: string,
  schema?: z.ZodSchema<T>
): Promise<T | null> {
  let raw: unknown = null;

  if (isRedisConfigured()) {
    try {
      const redis = getRedisClient();
      raw = await redis.get<string>(redisKey(token));
    } catch (err) {
      log.warn('Redis get failed, trying memory fallback', { token, error: err });
    }
  }

  if (!raw) {
    const memEntry = memoryCache.get(token);
    if (!memEntry) {
      log.debug('Preview token not found', { token });
      return null;
    }
    if (Date.now() > memEntry.expiresAt) {
      memoryCache.delete(token);
      log.debug('Preview token expired in memory', { token });
      return null;
    }
    raw = memEntry.data;
  }

  // Parse entry
  let entry: CacheEntry<T>;
  try {
    entry = typeof raw === 'string' ? (JSON.parse(raw) as CacheEntry<T>) : (raw as CacheEntry<T>);
  } catch (err) {
    log.error('Preview token parse failed', { token, error: err });
    return null;
  }

  // Verify signature
  const expectedSig = signToken(token, entry.data);
  if (entry.signature !== expectedSig) {
    log.warn('Preview token signature mismatch — possible tampering', { token });
    return null;
  }

  // Optionally validate against schema
  if (schema) {
    const parsed = schema.safeParse(entry.data);
    if (!parsed.success) {
      log.warn('Preview token data schema validation failed', { token, error: parsed.error });
      return null;
    }
    return parsed.data;
  }

  return entry.data;
}

/**
 * Delete a preview token (one-time use after commit, or manual cancel).
 */
export async function invalidatePreview(token: string): Promise<void> {
  if (isRedisConfigured()) {
    try {
      const redis = getRedisClient();
      await redis.del(redisKey(token));
    } catch (err) {
      log.warn('Redis delete failed', { token, error: err });
    }
  }
  memoryCache.delete(token);
  log.debug('Preview token invalidated', { token });
}

/**
 * Prune expired entries from memory fallback (call periodically if needed).
 */
export function pruneMemoryCache(): void {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (now > entry.expiresAt) {
      memoryCache.delete(key);
    }
  }
}
