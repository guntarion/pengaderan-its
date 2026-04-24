/**
 * src/lib/anon-report/public-api-handler.ts
 * NAWASENA M12 — Custom public API handler for anonymous channel endpoints.
 *
 * Purpose: Public endpoints (submit, status-lookup, presign) need a handler
 * that explicitly BYPASSES session/CSRF while enforcing captcha + rate limit.
 *
 * NEVER modify createApiHandler for this purpose — that handler is for
 * authenticated routes. This is a completely separate wrapper.
 *
 * Security guarantees:
 *   - Session cookies are NOT read / extracted
 *   - No CSRF check (captcha replaces it on public forms)
 *   - Fingerprint computed but NEVER stored in logs or DB
 *   - Rate limit via Redis ZSET sliding window (fingerprint-based)
 *   - Captcha verified server-side if requireCaptcha=true
 *   - Zod validates body schema
 *   - Anon-redacting logger strips body/IP/UA/trackingCode from all log output
 *
 * Usage:
 *   export const POST = createPublicAnonHandler({
 *     schema: z.object({ ... }),
 *     rateLimitKey: 'submit',
 *     rateLimitMax: 5,
 *     rateLimitWindowSeconds: 86400,
 *     requireCaptcha: true,
 *     handler: async ({ body, fingerprint, log }) => {
 *       return ApiResponse.success({ ok: true });
 *     },
 *   });
 */

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodSchema } from 'zod';
import { computeFingerprint } from '@/lib/anon-report/fingerprint';
import { checkAnonRateLimit, type AnonRateLimitKey } from '@/lib/anon-report/rate-limit';
import { verifyCaptcha } from '@/lib/anon-report/captcha';
import { ApiResponse } from '@/lib/api/response';
import { createLogger } from '@/lib/logger';
import { createAnonRedactingLogger } from '@/lib/logger-anon-redactor';

const baseLog = createLogger('anon-public-handler');

// ---- Types ----

export interface PublicAnonHandlerConfig<T> {
  /** Zod schema to validate the request body */
  schema: ZodSchema<T>;
  /** Which rate limit bucket to use */
  rateLimitKey: AnonRateLimitKey;
  /** Maximum requests allowed in the time window */
  rateLimitMax: number;
  /** Time window in seconds */
  rateLimitWindowSeconds: number;
  /** Whether captcha verification is required */
  requireCaptcha: boolean;
  /** The handler function */
  handler: (ctx: PublicAnonContext<T>) => Promise<NextResponse>;
}

export interface PublicAnonContext<T> {
  /** Validated request body */
  body: T;
  /**
   * SHA-256 fingerprint hash (daily-salted).
   * Use only for rate limiting — never store or log.
   */
  fingerprint: string;
  /** Anon-redacting logger (strips IP/UA/body/trackingCode) */
  log: ReturnType<typeof createAnonRedactingLogger>;
  /** Request params (for dynamic routes like /api/anon-reports/status/[code]) */
  params: Record<string, string>;
}

// ---- Main factory ----

/**
 * Create a public API handler for M12 anonymous channel endpoints.
 *
 * Does NOT extract session or check CSRF.
 * Does NOT pass user to handler.
 * Does compute fingerprint, check rate limit, and verify captcha.
 */
export function createPublicAnonHandler<T>(
  config: PublicAnonHandlerConfig<T>,
): (request: NextRequest, routeContext?: { params: Promise<Record<string, string>> }) => Promise<NextResponse> {
  return async (
    request: NextRequest,
    routeContext?: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    const requestId = crypto.randomUUID().slice(0, 8);
    const method = request.method;
    const path = request.nextUrl.pathname;

    const reqLog = createAnonRedactingLogger(
      baseLog.child({ requestId, method, path }) as ReturnType<typeof createLogger>,
    );

    const start = performance.now();

    try {
      // Resolve route params (Next.js 15: Promise)
      const rawParams = routeContext?.params;
      const params: Record<string, string> = rawParams
        ? rawParams instanceof Promise
          ? await rawParams
          : (rawParams as unknown as Record<string, string>)
        : {};

      // Step 1: Compute fingerprint (hash only, never raw IP)
      const fingerprint = computeFingerprint(request as unknown as Request);

      // Step 2: Rate limit check
      const rlResult = await checkAnonRateLimit(
        fingerprint,
        config.rateLimitKey,
        config.rateLimitMax,
        config.rateLimitWindowSeconds,
      );

      if (!rlResult.allowed) {
        reqLog.warn('Rate limit exceeded', {
          key: config.rateLimitKey,
          remaining: 0,
        });

        const retryAfter = Math.ceil(
          (rlResult.resetAt.getTime() - Date.now()) / 1000,
        );

        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: 'Terlalu banyak permintaan. Silakan coba lagi nanti.',
            },
          },
          {
            status: 429,
            headers: { 'Retry-After': String(retryAfter) },
          },
        );
      }

      // Step 3: Parse body
      let rawBody: unknown = {};
      if (method !== 'GET' && method !== 'HEAD') {
        try {
          rawBody = await request.json();
        } catch {
          return NextResponse.json(
            {
              success: false,
              error: { code: 'BAD_REQUEST', message: 'Request body must be valid JSON.' },
            },
            { status: 400 },
          );
        }
      } else {
        // For GET requests, parse from query params (for status lookup schema)
        const url = request.nextUrl;
        const queryObj: Record<string, string> = {};
        url.searchParams.forEach((value, key) => {
          queryObj[key] = value;
        });
        // Also include route params as potential schema fields
        rawBody = { ...queryObj, ...params };
      }

      // Step 4: Captcha verification (before Zod validation to fail fast)
      if (config.requireCaptcha) {
        const bodyObj = rawBody as Record<string, unknown>;
        const captchaToken = bodyObj?.captchaToken as string | undefined;

        if (!captchaToken) {
          return NextResponse.json(
            {
              success: false,
              error: { code: 'BAD_REQUEST', message: 'Captcha token diperlukan.' },
            },
            { status: 400 },
          );
        }

        const captchaResult = await verifyCaptcha(captchaToken, 'turnstile');
        if (!captchaResult.success) {
          reqLog.warn('Captcha verification failed', { provider: captchaResult.provider });
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'BAD_REQUEST',
                message: 'Verifikasi captcha gagal. Silakan muat ulang halaman dan coba lagi.',
              },
            },
            { status: 400 },
          );
        }
      }

      // Step 5: Zod validation
      const parseResult = config.schema.safeParse(rawBody);
      if (!parseResult.success) {
        const details = parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return NextResponse.json(
          {
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Validasi gagal.', details },
          },
          { status: 400 },
        );
      }

      // Step 6: Execute handler
      const ctx: PublicAnonContext<T> = {
        body: parseResult.data,
        fingerprint,
        log: reqLog,
        params,
      };

      const response = await config.handler(ctx);

      reqLog.info('Public anon request completed', {
        status: response.status,
        durationMs: Math.round(performance.now() - start),
        rateLimitKey: config.rateLimitKey,
      });

      response.headers.set('x-request-id', requestId);
      return response;
    } catch (err) {
      reqLog.error('Unhandled error in public anon handler', { error: err });

      const durationMs = Math.round(performance.now() - start);
      reqLog.warn('Public anon request failed', { durationMs });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message:
              process.env.NODE_ENV === 'development' && err instanceof Error
                ? err.message
                : 'Terjadi kesalahan server. Silakan coba lagi.',
          },
        },
        { status: 500 },
      );
    }
  };
}

// Re-export ApiResponse for convenience in handlers
export { ApiResponse };
// Re-export z for convenience
export { z };
