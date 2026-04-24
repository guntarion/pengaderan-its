/**
 * src/lib/logger-mh-redactor.ts
 * NAWASENA M11 — Allowlist-based MH data redactor for structured logging.
 *
 * DESIGN: Allowlist (not denylist) — unknown fields are REDACTED by default.
 * This prevents accidental plaintext leaks when new fields are added.
 *
 * PRIVACY-CRITICAL:
 *   - rawScoreEncrypted, answerValueEncrypted, resolutionNoteEncrypted → always REDACTED
 *   - severity, instrument, phase, status → allowlisted (needed for ops visibility)
 *   - Any field NOT in the allowlist → REDACTED by default
 *
 * Usage:
 *   import { createMHRedactingLogger } from '@/lib/logger-mh-redactor';
 *   import { createLogger } from '@/lib/logger';
 *
 *   const base = createLogger('mh-screening');
 *   const log = createMHRedactingLogger(base);
 *   log.info('Screening submitted', { screeningId, severity, rawScore: 15 });
 *   // Output: { screeningId: 'cxxx', severity: 'RED', rawScore: '[REDACTED]' }
 */

import { createLogger } from '@/lib/logger';

// ============================================
// Allowlist — ONLY these field names are allowed through
// All others are replaced with '[REDACTED]'
// ============================================

const MH_LOG_ALLOWLIST = new Set([
  // IDs (non-sensitive identifiers)
  'id',
  'screeningId',
  'referralId',
  'userId',
  'cohortId',
  'organizationId',
  'kpGroupId',
  'actorId',
  'referredToId',
  'takenOverById',
  'targetId',
  'targetUserId',

  // Enum fields (classification, not content)
  'instrument',
  'phase',
  'severity',
  'status',
  'action',
  'actorRole',
  'targetType',

  // Boolean flags (no content value)
  'flagged',
  'immediateContact',

  // Key management (version only, not key value)
  'encryptionKeyVersion',

  // Timestamps (no PII)
  'createdAt',
  'updatedAt',
  'recordedAt',
  'referredAt',
  'slaDeadlineAt',
  'escalatedAt',
  'statusChangedAt',

  // Audit/logging context
  'reason',
  'assignmentReason',
  'requestId',
  'method',
  'path',
  'durationMs',
  'count',
  'escalated',
  'processed',
]);

// ============================================
// Redaction logic
// ============================================

/**
 * Redact a value: if it's an object, recursively redact its keys.
 * If it's primitive, return as-is (only object keys are checked against allowlist).
 */
export function redactMH(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(redactMH);
  if (typeof value !== 'object') return value;
  return redactMHObject(value as Record<string, unknown>);
}

function redactMHObject(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      MH_LOG_ALLOWLIST.has(k)
        ? (typeof v === 'object' && v !== null ? redactMH(v) : v)
        : '[REDACTED]',
    ]),
  );
}

// ============================================
// Logger wrapper
// ============================================

type BaseLogger = ReturnType<typeof createLogger>;

export interface MHRedactingLogger {
  info: (msg: string, meta?: unknown) => void;
  warn: (msg: string, meta?: unknown) => void;
  error: (msg: string, meta?: unknown) => void;
  debug: (msg: string, meta?: unknown) => void;
}

/**
 * Wraps a base logger with MH-specific allowlist-based redaction.
 * All log calls pass metadata through redactMH() before logging.
 *
 * @param base - The base logger instance from createLogger()
 * @returns A logger wrapper with the same interface but with MH redaction applied
 */
export function createMHRedactingLogger(base: BaseLogger): MHRedactingLogger {
  return {
    info: (msg: string, meta?: unknown) =>
      base.info(msg, meta !== undefined ? (redactMH(meta) as Record<string, unknown>) : undefined),
    warn: (msg: string, meta?: unknown) =>
      base.warn(msg, meta !== undefined ? (redactMH(meta) as Record<string, unknown>) : undefined),
    error: (msg: string, meta?: unknown) =>
      base.error(msg, meta !== undefined ? (redactMH(meta) as Record<string, unknown>) : undefined),
    debug: (msg: string, meta?: unknown) =>
      base.debug(msg, meta !== undefined ? (redactMH(meta) as Record<string, unknown>) : undefined),
  };
}
