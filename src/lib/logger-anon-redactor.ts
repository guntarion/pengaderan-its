/**
 * src/lib/logger-anon-redactor.ts
 * NAWASENA M12 — Denylist-based Anonymous Channel redactor for structured logging.
 *
 * DESIGN: Denylist approach — specific sensitive fields are ALWAYS redacted.
 * This prevents PII / identifying information from leaking into logs.
 *
 * PRIVACY-CRITICAL fields that are ALWAYS redacted:
 *   - body, bodyText — report content (anonymous, must not appear in logs)
 *   - ip, ipAddress, x-forwarded-for — raw IP (never persist)
 *   - userAgent, user-agent — browser fingerprint
 *   - attachmentUrl — S3 signed URL (short-lived but sensitive)
 *   - trackingCode — reporter's unique code (non-linkable by design)
 *   - captchaToken — Turnstile / hCaptcha token
 *   - fingerprint — daily-salted hash (must not appear in logs)
 *
 * Usage:
 *   import { createAnonRedactingLogger } from '@/lib/logger-anon-redactor';
 *   import { createLogger } from '@/lib/logger';
 *
 *   const base = createLogger('anon-report-submit');
 *   const log = createAnonRedactingLogger(base);
 *   log.info('Submit received', { bodyText: '...', ip: '1.2.3.4' });
 *   // Output: { bodyText: '[REDACTED]', ip: '[REDACTED]' }
 */

import { createLogger } from '@/lib/logger';

// ============================================
// Denylist — these field names are ALWAYS redacted
// Case-insensitive match applied
// ============================================

const ANON_REDACT_KEYS = new Set([
  'body',
  'bodytext',
  'ip',
  'ipaddress',
  'x-forwarded-for',
  'xforwardedfor',
  'useragent',
  'user-agent',
  'attachmenturl',
  'trackingcode',
  'captchatoken',
  'fingerprint',
  // Additional safety
  'rawip',
  'clientip',
  'remoteaddr',
  'remoteaddress',
]);

// ============================================
// Redaction logic
// ============================================

/**
 * Redact anonymous-channel sensitive fields from an object.
 * Keys in ANON_REDACT_KEYS are replaced with '[REDACTED]'.
 * Recurses into nested objects.
 */
export function redactAnon(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(redactAnon);
  if (typeof value !== 'object') return value;
  return redactAnonObject(value as Record<string, unknown>);
}

function redactAnonObject(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      const keyLower = k.toLowerCase();
      if (ANON_REDACT_KEYS.has(keyLower)) {
        return [k, '[REDACTED]'];
      }
      // Recurse into nested objects
      if (typeof v === 'object' && v !== null) {
        return [k, redactAnon(v)];
      }
      return [k, v];
    }),
  );
}

// ============================================
// Logger wrapper
// ============================================

type BaseLogger = ReturnType<typeof createLogger>;

export interface AnonRedactingLogger {
  info: (msg: string, meta?: unknown) => void;
  warn: (msg: string, meta?: unknown) => void;
  error: (msg: string, meta?: unknown) => void;
  debug: (msg: string, meta?: unknown) => void;
}

/**
 * Wraps a base logger with M12 anonymous channel denylist-based redaction.
 * All log calls pass metadata through redactAnon() before logging.
 *
 * @param base - The base logger instance from createLogger()
 * @returns A logger wrapper with the same interface but with anon redaction applied
 */
export function createAnonRedactingLogger(base: BaseLogger): AnonRedactingLogger {
  return {
    info: (msg: string, meta?: unknown) =>
      base.info(msg, meta !== undefined ? (redactAnon(meta) as Record<string, unknown>) : undefined),
    warn: (msg: string, meta?: unknown) =>
      base.warn(msg, meta !== undefined ? (redactAnon(meta) as Record<string, unknown>) : undefined),
    error: (msg: string, meta?: unknown) =>
      base.error(msg, meta !== undefined ? (redactAnon(meta) as Record<string, unknown>) : undefined),
    debug: (msg: string, meta?: unknown) =>
      base.debug(msg, meta !== undefined ? (redactAnon(meta) as Record<string, unknown>) : undefined),
  };
}
