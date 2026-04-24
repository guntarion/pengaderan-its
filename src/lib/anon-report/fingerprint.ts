/**
 * src/lib/anon-report/fingerprint.ts
 * NAWASENA M12 — Anonymity-preserving fingerprint computation.
 *
 * Returns a SHA-256 hash — NEVER returns raw IP, UA, or any PII.
 * The hash rotates daily (includes YYYY-MM-DD in input) to limit
 * long-term tracking to a maximum window of 24 hours.
 *
 * Salt is read from ANON_FINGERPRINT_SALT env var, rotated annually.
 * If salt is missing, a warning is logged and a default insecure salt is used
 * (suitable for development only).
 *
 * Usage:
 *   const fingerprint = computeFingerprint(request); // SHA-256 hex string
 *   // Use for rate limiting only — never persist to DB
 */

import { createHash } from 'crypto';
import { createLogger } from '@/lib/logger';

const log = createLogger('anon-fingerprint');

/**
 * Extract the best-available client IP from a Next.js request.
 * Tries multiple headers in order of reliability.
 * Never returns raw IP to callers — only used internally for hashing.
 */
function getClientIP(req: Request): string {
  // Next.js sets this from x-forwarded-for / socket
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    // x-forwarded-for can be comma-separated list; take the first (client)
    const ip = xff.split(',')[0].trim();
    if (ip) return ip;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  // Fallback — cannot determine IP
  return 'unknown';
}

/**
 * Compute a daily-salted SHA-256 fingerprint from request metadata.
 *
 * Input: SHA-256(ip | ua | YYYY-MM-DD | salt)
 *
 * Properties:
 * - One-way: cannot derive IP from fingerprint
 * - Daily rotation: fingerprint changes each day (max 24h window)
 * - Salt: prevents rainbow table attacks
 * - Unique per day per device: sufficient for rate limiting
 */
export function computeFingerprint(req: Request): string {
  const ip = getClientIP(req);
  const ua = req.headers.get('user-agent') ?? 'unknown';
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const salt = process.env.ANON_FINGERPRINT_SALT;
  if (!salt) {
    log.warn('ANON_FINGERPRINT_SALT not set — using insecure default (not safe for production)');
  }
  const effectiveSalt = salt ?? 'nawasena-dev-insecure-salt-change-in-production';

  return createHash('sha256')
    .update(`${ip}|${ua}|${date}|${effectiveSalt}`)
    .digest('hex');
}
