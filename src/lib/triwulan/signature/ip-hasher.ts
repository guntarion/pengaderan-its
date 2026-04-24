/**
 * src/lib/triwulan/signature/ip-hasher.ts
 * NAWASENA M14 — IP address hashing for signature events.
 *
 * Never stores raw IP (PII). Hashes with a secret salt.
 * Used whenever emitting TriwulanSignatureEvent.
 */

import { createHash } from 'crypto';
import { createLogger } from '@/lib/logger';

const log = createLogger('m14/ip-hasher');

/**
 * Hash an IP address with the TRIWULAN_IP_SALT env var.
 * Falls back to a deterministic placeholder if salt is not configured.
 *
 * @param ip - raw IP address string (e.g. "1.2.3.4")
 * @returns SHA256 hex string (64 chars)
 */
export function hashIP(ip: string): string {
  const salt = process.env.TRIWULAN_IP_SALT;
  if (!salt) {
    log.warn('TRIWULAN_IP_SALT not set — using default salt for IP hashing. Set in production.');
  }
  const effectiveSalt = salt ?? 'nawasena-triwulan-default-salt-dev';
  return createHash('sha256').update(`${ip}|${effectiveSalt}`).digest('hex');
}

/**
 * Extract IP from a Next.js request header.
 * Checks x-forwarded-for (reverse proxy), then x-real-ip, then falls back to unknown.
 *
 * @param request - NextRequest or Headers
 */
export function extractIP(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list — take the first (client IP)
    return forwarded.split(',')[0].trim();
  }
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

/**
 * Convenience: extract IP from request headers and hash it.
 * Use this in all route handlers before emitting signature events.
 */
export function hashRequestIP(headers: Headers): string {
  return hashIP(extractIP(headers));
}
