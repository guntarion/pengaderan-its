// src/lib/csrf.ts
// CSRF token generation and validation.
// Uses double-submit cookie pattern — works with stateless sessions.
//
// Server-side (API route):
//   import { generateCsrfToken, validateCsrfToken } from '@/lib/csrf';
//
//   // Generate: set cookie + return token
//   const token = generateCsrfToken(response);
//
//   // Validate: compare cookie vs header/body
//   if (!validateCsrfToken(request)) throw new Error('CSRF validation failed');
//
// Client-side:
//   import { CsrfInput } from '@/components/shared/CsrfInput';
//   <form><CsrfInput /><button type="submit">Save</button></form>

import { type NextRequest, NextResponse } from 'next/server';
import { createLogger } from './logger';

const log = createLogger('csrf');

const CSRF_COOKIE_NAME = '__csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_BODY_FIELD = '_csrf';
const CSRF_COOKIE_MAX_AGE = 60 * 60; // 1 hour

/**
 * Generate a CSRF token and set it as an HttpOnly cookie on the response.
 * Returns the token to embed in forms or send in headers.
 */
export function generateCsrfToken(response?: NextResponse): string {
  const token = crypto.randomUUID();

  if (response) {
    response.cookies.set(CSRF_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: CSRF_COOKIE_MAX_AGE,
      path: '/',
    });
  }

  return token;
}

/**
 * Validate a CSRF token from the request.
 * Compares the token in the cookie against the token in the header or body.
 *
 * Token lookup order:
 * 1. `x-csrf-token` header
 * 2. `_csrf` field in JSON body (if already parsed)
 *
 * Returns true if tokens match, false otherwise.
 */
export async function validateCsrfToken(
  request: NextRequest,
  parsedBody?: Record<string, unknown>,
): Promise<boolean> {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (!cookieToken) {
    log.debug('CSRF validation failed: no cookie');
    return false;
  }

  // Check header first
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (headerToken) {
    return timingSafeEqual(cookieToken, headerToken);
  }

  // Check parsed body
  if (parsedBody && typeof parsedBody[CSRF_BODY_FIELD] === 'string') {
    return timingSafeEqual(cookieToken, parsedBody[CSRF_BODY_FIELD] as string);
  }

  log.debug('CSRF validation failed: no token in header or body');
  return false;
}

/**
 * Get the current CSRF token from the request cookie.
 * Useful for embedding in forms via server components.
 */
export function getCsrfTokenFromCookie(request: NextRequest): string | undefined {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value;
}

/**
 * Middleware helper: validate CSRF on mutating requests (POST, PUT, PATCH, DELETE).
 * Use in API routes or Next.js middleware.
 */
export async function requireCsrf(
  request: NextRequest,
  parsedBody?: Record<string, unknown>,
): Promise<NextResponse | null> {
  const method = request.method.toUpperCase();
  // Skip safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return null;
  }

  const valid = await validateCsrfToken(request, parsedBody);
  if (!valid) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'CSRF_INVALID', message: 'Invalid or missing CSRF token' },
      },
      { status: 403 },
    );
  }

  return null; // Validation passed
}

// ---- Helpers ----

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Export constants for use in components
export const CSRF_CONFIG = {
  cookieName: CSRF_COOKIE_NAME,
  headerName: CSRF_HEADER_NAME,
  bodyField: CSRF_BODY_FIELD,
} as const;
