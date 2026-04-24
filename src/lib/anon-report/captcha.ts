/**
 * src/lib/anon-report/captcha.ts
 * NAWASENA M12 — Server-side captcha verification.
 *
 * Supports Cloudflare Turnstile (primary) and hCaptcha (fallback).
 * Captcha replaces CSRF on the public anonymous submit form because there
 * is no session cookie to pair with.
 *
 * Environment variables required:
 *   TURNSTILE_SECRET    — Cloudflare Turnstile secret key
 *   HCAPTCHA_SECRET     — hCaptcha secret key
 *
 * In test/development with CAPTCHA_BYPASS_IN_DEV=true:
 *   Token "test-bypass" is accepted unconditionally.
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('anon-captcha');

export type CaptchaProvider = 'turnstile' | 'hcaptcha';

export interface CaptchaVerifyResult {
  success: boolean;
  provider: CaptchaProvider;
  errorCodes?: string[];
}

/**
 * Verify a captcha token with the specified provider.
 *
 * @param token - The captcha response token from the client
 * @param provider - Which provider to verify against ('turnstile' | 'hcaptcha')
 * @returns Verification result
 */
export async function verifyCaptcha(
  token: string,
  provider: CaptchaProvider = 'turnstile',
): Promise<CaptchaVerifyResult> {
  // Development bypass for testing
  if (
    process.env.CAPTCHA_BYPASS_IN_DEV === 'true' &&
    process.env.NODE_ENV !== 'production'
  ) {
    if (token === 'test-bypass') {
      log.debug('Captcha bypass accepted (dev mode)');
      return { success: true, provider };
    }
  }

  // If no token, reject immediately
  if (!token || token.trim() === '') {
    log.warn('Captcha verification rejected — empty token');
    return { success: false, provider, errorCodes: ['missing-input-response'] };
  }

  try {
    if (provider === 'turnstile') {
      return await verifyTurnstile(token);
    } else {
      return await verifyHCaptcha(token);
    }
  } catch (err) {
    log.error('Captcha verification request failed', { error: err, provider });
    return { success: false, provider, errorCodes: ['network-error'] };
  }
}

async function verifyTurnstile(token: string): Promise<CaptchaVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) {
    log.warn('TURNSTILE_SECRET not configured — captcha will fail');
    return { success: false, provider: 'turnstile', errorCodes: ['secret-not-configured'] };
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    log.warn('Turnstile API returned non-200', { status: response.status });
    return { success: false, provider: 'turnstile', errorCodes: ['network-error'] };
  }

  const data = await response.json() as { success: boolean; 'error-codes'?: string[] };

  return {
    success: data.success === true,
    provider: 'turnstile',
    errorCodes: data['error-codes'],
  };
}

async function verifyHCaptcha(token: string): Promise<CaptchaVerifyResult> {
  const secret = process.env.HCAPTCHA_SECRET;
  if (!secret) {
    log.warn('HCAPTCHA_SECRET not configured — captcha will fail');
    return { success: false, provider: 'hcaptcha', errorCodes: ['secret-not-configured'] };
  }

  const response = await fetch('https://hcaptcha.com/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    log.warn('hCaptcha API returned non-200', { status: response.status });
    return { success: false, provider: 'hcaptcha', errorCodes: ['network-error'] };
  }

  const data = await response.json() as { success: boolean; 'error-codes'?: string[] };

  return {
    success: data.success === true,
    provider: 'hcaptcha',
    errorCodes: data['error-codes'],
  };
}
