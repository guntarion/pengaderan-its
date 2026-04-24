/**
 * src/lib/mh-screening/encryption.ts
 * NAWASENA M11 — pgcrypto encryption SQL fragment helpers.
 *
 * DESIGN: Encryption is done at the DB layer via pgcrypto session variables.
 * These helpers return SQL fragment strings for use in Prisma $executeRaw / $queryRaw.
 * The actual key is NEVER in application memory at encryption time — it is
 * SET LOCAL app.mh_encryption_key inside the transaction by withMHContext.
 *
 * PRIVACY-CRITICAL: Do NOT log any values that pass through these helpers.
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('mh-encryption');

/**
 * Returns the SQL fragment to encrypt a text value using pgcrypto session key.
 * Use inside $executeRaw / $queryRaw template literals.
 *
 * Example:
 *   await tx.$executeRaw`
 *     INSERT INTO "mh_screenings" (..., "rawScoreEncrypted", ...)
 *     VALUES (..., pgp_sym_encrypt(${jsonPayload}::text, current_setting('app.mh_encryption_key')), ...)
 *   `;
 *
 * @param field - The field name being encrypted (for logging only, not the value)
 */
export function buildEncryptSQL(field: string): string {
  log.debug('Building encrypt SQL fragment', { field });
  return `pgp_sym_encrypt(${field}::text, current_setting('app.mh_encryption_key'))`;
}

/**
 * Returns the SQL fragment to decrypt a bytea column using pgcrypto session key.
 * Use inside $queryRaw template literals.
 *
 * Example:
 *   const rows = await tx.$queryRaw`
 *     SELECT pgp_sym_decrypt("rawScoreEncrypted", current_setting('app.mh_encryption_key'))::text AS score
 *     FROM "mh_screenings"
 *     WHERE id = ${screeningId}
 *   `;
 *
 * @param field - The column name to decrypt (for logging only, not the value)
 */
export function buildDecryptSQL(field: string): string {
  log.debug('Building decrypt SQL fragment', { field });
  return `pgp_sym_decrypt(${field}, current_setting('app.mh_encryption_key'))::text`;
}

/**
 * Validates that a string is a safe cuid (to prevent injection in SET LOCAL).
 * cuids are alphanumeric strings starting with 'c', no special chars.
 */
export function isSafeCuid(value: string): boolean {
  // cuid2: starts with letter, alphanumeric only, min 8 chars
  // cuid1: starts with 'c', alphanumeric, ~25 chars
  // We accept any alphanumeric string ≥ 8 chars starting with a letter (safe for SET LOCAL)
  return /^[a-z][a-z0-9]{7,}$/.test(value);
}

/**
 * Sanitizes an actor ID for use in SET LOCAL session variable.
 * Throws if the value is not a valid cuid format.
 * This prevents SQL injection in SET LOCAL statements.
 */
export function sanitizeActorId(actorId: string): string {
  if (actorId === 'system') return 'system';
  if (!isSafeCuid(actorId)) {
    throw new Error(`Invalid actor ID format: ${actorId}. Must be a valid cuid.`);
  }
  return actorId;
}
