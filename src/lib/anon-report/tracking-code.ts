/**
 * src/lib/anon-report/tracking-code.ts
 * NAWASENA M12 — Pure entropy tracking code generator.
 *
 * Format: NW-[A-Z0-9]{8} (36^8 = 2.8e12 space)
 * Entropy: crypto.randomBytes — NOT timestamp-based, NOT derivable.
 *
 * Usage:
 *   const code = generateTrackingCode();       // → "NW-A3KZ8QP2"
 *   const code = await createTrackingCode(tx); // DB-unique with retry
 */

import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('anon-tracking-code');

// Base36 uppercase alphabet (no ambiguous chars like 0/O, 1/I removed intentionally
// to keep maximum entropy — full 36 chars)
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 8;
const ALPHABET_SIZE = ALPHABET.length; // 36

/**
 * Generate a cryptographically random tracking code.
 * Format: "NW-XXXXXXXX" where X ∈ [A-Z0-9].
 *
 * Guaranteed:
 * - NOT derived from timestamp, userId, IP, or any request metadata.
 * - Pure randomness from crypto.randomBytes (CSPRNG).
 *
 * Note: This is a pure generation function — uniqueness enforcement
 * happens in createTrackingCode() via DB constraint + retry.
 */
export function generateTrackingCode(): string {
  // Use 16 bytes (128 bits) for unbiased selection
  // We use each byte mod 36 — slight bias but negligible for this use case
  const bytes = randomBytes(16);
  let result = '';
  let byteIndex = 0;

  for (let i = 0; i < CODE_LENGTH; i++) {
    // Use rejection sampling for unbiased selection
    let byte: number;
    do {
      if (byteIndex >= bytes.length) {
        // Should not happen with 16 bytes for 8 chars, but be safe
        throw new Error('Insufficient entropy bytes');
      }
      byte = bytes[byteIndex++];
      // Reject bytes that would cause bias (256 % 36 = 4, so reject 252-255)
    } while (byte >= 252);
    result += ALPHABET[byte % ALPHABET_SIZE];
  }

  return `NW-${result}`;
}

/**
 * Generate a tracking code that is guaranteed unique in the database.
 * Uses retry logic (up to maxRetries) to handle collision edge cases.
 *
 * Must be called inside a Prisma transaction.
 *
 * @param tx - Prisma transaction client
 * @param maxRetries - Maximum collision retry attempts (default: 3)
 * @returns Unique tracking code string
 * @throws Error if all retries exhausted (statistically impossible in practice)
 */
export async function createTrackingCode(
  tx: Prisma.TransactionClient,
  maxRetries = 3,
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const code = generateTrackingCode();

    const existing = await tx.anonReport.findUnique({
      where: { trackingCode: code },
      select: { id: true },
    });

    if (!existing) {
      if (attempt > 1) {
        log.info('Tracking code generated on retry', { attempt });
      }
      return code;
    }

    log.warn('Tracking code collision, retrying', { attempt, maxRetries });
  }

  throw new Error(`Tracking code generation failed after ${maxRetries} retries`);
}
