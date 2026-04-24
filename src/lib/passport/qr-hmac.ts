/**
 * src/lib/passport/qr-hmac.ts
 * NAWASENA M05 — Thin wrapper around src/lib/qr/signing.ts for passport module.
 *
 * Re-exports with module='passport' discriminator pre-applied.
 */

import { signPayload, verifyPayload, buildQrPayloadUrl, parseQrPayloadUrl } from '@/lib/qr/signing';

export interface SignQrPayloadOptions {
  itemId: string;
  sessionId: string;
  expiresAt: string; // ISO date string
}

/**
 * Sign a passport QR payload.
 */
export function signQrPayload(opts: SignQrPayloadOptions): string {
  return signPayload({ module: 'passport', ...opts });
}

/**
 * Verify a passport QR payload signature.
 */
export function verifyQrPayload(opts: SignQrPayloadOptions & { sig: string }): boolean {
  return verifyPayload({ module: 'passport', ...opts });
}

/**
 * Build the full QR payload URL for a passport stamp.
 */
export function buildPassportQrUrl(opts: SignQrPayloadOptions): string {
  return buildQrPayloadUrl({ module: 'passport', ...opts });
}

export { parseQrPayloadUrl };
