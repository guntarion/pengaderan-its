/**
 * src/lib/qr/signing.ts
 * NAWASENA M05 — Shared QR HMAC signing utility.
 *
 * Supports module discriminator to prevent cross-module forgery.
 * Used by passport QR (M05) and attendance QR (M08 - future).
 *
 * Payload format (before signing):
 *   {module}|{...sorted field values joined with |}
 *
 * Signature: HMAC-SHA256 hex of payload, key = env PASSPORT_QR_SECRET
 */

import crypto from 'crypto';
import { createLogger } from '@/lib/logger';

const log = createLogger('qr:signing');

export type QrModule = 'passport' | 'attendance';

export interface SignPayloadOptions {
  module: QrModule;
  itemId: string;
  sessionId: string;
  expiresAt: string; // ISO date string
}

export interface VerifyPayloadOptions extends SignPayloadOptions {
  sig: string;
}

/**
 * Build the canonical payload string for HMAC.
 */
function buildPayloadString(opts: Omit<VerifyPayloadOptions, 'sig'>): string {
  return `${opts.module}|${opts.itemId}|${opts.sessionId}|${opts.expiresAt}`;
}

/**
 * Get the QR secret from env.
 * Throws if not configured (required for security).
 */
function getSecret(): string {
  const secret = process.env.PASSPORT_QR_SECRET;
  if (!secret) {
    log.error('PASSPORT_QR_SECRET not configured');
    throw new Error('PASSPORT_QR_SECRET env var not set');
  }
  return secret;
}

/**
 * Sign a QR payload with HMAC-SHA256.
 *
 * @returns hex signature string
 */
export function signPayload(opts: SignPayloadOptions): string {
  const secret = getSecret();
  const payload = buildPayloadString(opts);
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  log.debug('QR payload signed', { module: opts.module, sessionId: opts.sessionId });
  return sig;
}

/**
 * Verify a QR payload signature.
 *
 * @returns true if valid, false if tampered/invalid
 */
export function verifyPayload(opts: VerifyPayloadOptions): boolean {
  try {
    const secret = getSecret();
    const payload = buildPayloadString(opts);
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    // Constant-time comparison to prevent timing attacks
    const isValid =
      expected.length === opts.sig.length &&
      crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(opts.sig, 'hex'));
    if (!isValid) {
      log.debug('QR signature mismatch', { module: opts.module, sessionId: opts.sessionId });
    }
    return isValid;
  } catch (err) {
    log.warn('QR verification error', { error: err });
    return false;
  }
}

/**
 * Build the full QR payload URL string.
 *
 * Format: nawasena://passport/{itemId}/stamp/{sessionId}?sig={hmac}
 */
export function buildQrPayloadUrl(opts: SignPayloadOptions): string {
  const sig = signPayload(opts);
  return `nawasena://passport/${opts.itemId}/stamp/${opts.sessionId}?sig=${sig}&exp=${encodeURIComponent(opts.expiresAt)}`;
}

/**
 * Parse QR payload URL.
 *
 * @returns parsed fields or null if invalid format
 */
export function parseQrPayloadUrl(
  payloadUrl: string,
): { itemId: string; sessionId: string; sig: string; expiresAt: string } | null {
  try {
    // Format: nawasena://passport/{itemId}/stamp/{sessionId}?sig={sig}&exp={exp}
    const match = payloadUrl.match(
      /^nawasena:\/\/passport\/([^/]+)\/stamp\/([^?]+)\?sig=([^&]+)&exp=(.+)$/,
    );
    if (!match) {
      log.warn('Invalid QR payload URL format', { payloadUrl: payloadUrl.slice(0, 100) });
      return null;
    }
    return {
      itemId: match[1],
      sessionId: match[2],
      sig: match[3],
      expiresAt: decodeURIComponent(match[4]),
    };
  } catch (err) {
    log.warn('QR payload parse error', { error: err });
    return null;
  }
}
