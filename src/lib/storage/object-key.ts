/**
 * src/lib/storage/object-key.ts
 * NAWASENA M05 — Object key builder for passport evidence uploads.
 *
 * Format: passport/{orgId}/{userId}/{itemId}/{uuid}-{sanitizedFilename}
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('storage:object-key');

/**
 * Sanitize a filename: remove path separators, special chars, truncate.
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[/\\]/g, '') // no path separators
    .replace(/[^a-zA-Z0-9._-]/g, '_') // allow only safe chars
    .replace(/_{2,}/g, '_') // collapse multiple underscores
    .slice(0, 100); // max 100 chars
}

/**
 * Generate a UUID v4 (using crypto.randomUUID if available, else fallback).
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: simple pseudo-random
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface BuildKeyOptions {
  orgId: string;
  userId: string;
  itemId: string;
  filename: string;
}

/**
 * Build the S3 object key for a passport evidence file.
 *
 * @returns e.g. "passport/org-hmtc/user-123/PI-D5-03/a3f4b2c1-photo.jpg"
 */
export function buildKey({ orgId, userId, itemId, filename }: BuildKeyOptions): string {
  const sanitized = sanitizeFilename(filename);
  const uuid = generateUUID().split('-')[0]; // use first segment for brevity
  const key = `passport/${orgId}/${userId}/${itemId}/${uuid}-${sanitized}`;

  log.debug('Object key generated', { orgId, userId, itemId, filename: sanitized, key });
  return key;
}
