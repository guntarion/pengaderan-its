// src/lib/api/middleware.ts
// Composable API route middleware for Next.js App Router.
//
// Two usage patterns:
//
// 1. Config-based (recommended):
//    export const GET = createApiHandler({
//      auth: true,
//      roles: ['admin'],
//      rateLimit: true,
//      handler: async (req, ctx) => { ... }
//    });
//
// 2. Individual wrappers (for simple cases):
//    export const GET = withAuth(async (req, ctx) => { ... });

import { type NextRequest, NextResponse } from 'next/server';
import { type LLMAuthUser, getAuthUser } from '@/lib/llm-auth';
import { createLogger } from '@/lib/logger';
import { ApiError, UnauthorizedError, ForbiddenError, RateLimitError } from './errors';
import { ApiResponse } from './response';

const log = createLogger('api');

// ---- Types ----

export interface ApiContext {
  user: LLMAuthUser;
  params: Record<string, string>;
  requestId: string;
  log: ReturnType<typeof createLogger>;
}

/** Handler that receives the enriched context. */
export type AuthenticatedHandler = (
  request: NextRequest,
  context: ApiContext,
) => Promise<NextResponse>;

/** Raw Next.js App Router handler signature (Next.js 15: params is a Promise). */
type NextRouteContext = { params: Promise<Record<string, string>> };

/**
 * Function returned by our wrappers — compatible with Next.js App Router exports.
 * The second param uses `any` to satisfy Next.js's generated route type checks
 * which vary between dynamic and non-dynamic routes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NextRouteHandler = (request: NextRequest, context?: any) => Promise<NextResponse>;

// ---- Config-based handler ----

export interface ApiHandlerConfig {
  /** Require authentication (session or LLM key). Default: false. */
  auth?: boolean;
  /** Require one of these roles. Implies auth: true. */
  roles?: string[];
  /** Apply per-request rate limiting. Requires auth. */
  rateLimit?: boolean;
  /** The route handler. */
  handler: AuthenticatedHandler;
}

/**
 * Create a fully-configured API route handler.
 *
 * Handles: auth → roles → rate-limit → handler.
 * Catches ApiError and unexpected errors, returns standardized JSON.
 */
export function createApiHandler(config: ApiHandlerConfig): NextRouteHandler {
  const requiresAuth = config.auth || !!config.roles;

  return async (request: NextRequest, routeContext?: NextRouteContext) => {
    const requestId = crypto.randomUUID().slice(0, 8);
    const method = request.method;
    const path = request.nextUrl.pathname;
    const reqLog = log.child({ requestId, method, path });
    const start = performance.now();

    try {
      // Resolve params — Next.js 15 passes Promise<params>, earlier versions pass plain object
      const rawParams = routeContext?.params;
      const params: Record<string, string> = rawParams
        ? (rawParams instanceof Promise ? await rawParams : rawParams as unknown as Record<string, string>)
        : {};

      // --- Auth ---
      let user: LLMAuthUser | null = null;
      if (requiresAuth) {
        user = await getAuthUser(request);
        if (!user) throw UnauthorizedError();
      } else {
        // Optional auth — try but don't require
        user = await getAuthUser(request);
      }

      // --- Role check ---
      if (config.roles && config.roles.length > 0) {
        if (!user || !config.roles.includes(user.role)) {
          throw ForbiddenError(
            `Requires role: ${config.roles.join(' or ')}`,
          );
        }
      }

      // --- Rate limit ---
      if (config.rateLimit && user) {
        const { checkRateLimit } = await import('@/lib/ratelimit');
        const key = `user:${user.id}`;
        const result = await checkRateLimit(key, user.role);
        if (!result.success) {
          throw RateLimitError(
            result.message || 'Rate limit exceeded',
            result.retryAfterSeconds,
          );
        }
      }

      // --- Handler ---
      const ctx: ApiContext = {
        user: user ?? { id: '', email: '', name: '', role: 'guest' },
        params,
        requestId,
        log: reqLog,
      };
      const response = await config.handler(request, ctx);

      reqLog.info('Request completed', {
        status: response.status,
        durationMs: Math.round(performance.now() - start),
        userId: user?.id,
      });

      // Set requestId header on response
      response.headers.set('x-request-id', requestId);
      return response;
    } catch (err) {
      const response = handleError(err, reqLog);
      reqLog.warn('Request failed', {
        status: response.status,
        durationMs: Math.round(performance.now() - start),
        errorCode: err instanceof ApiError ? err.code : 'INTERNAL_ERROR',
      });
      response.headers.set('x-request-id', requestId);
      return response;
    }
  };
}

// ---- Individual wrappers ----

/**
 * Wrap a handler that requires authentication.
 *
 *   export const GET = withAuth(async (req, { user }) => {
 *     return ApiResponse.success({ email: user.email });
 *   });
 */
export function withAuth(handler: AuthenticatedHandler): NextRouteHandler {
  return createApiHandler({ auth: true, handler });
}

/**
 * Wrap a handler that requires specific roles.
 *
 *   export const DELETE = withRoles(['admin'], async (req, { user }) => { ... });
 */
export function withRoles(roles: string[], handler: AuthenticatedHandler): NextRouteHandler {
  return createApiHandler({ auth: true, roles, handler });
}

// ---- Error handler ----

function handleError(err: unknown, reqLog?: ReturnType<typeof createLogger>): NextResponse {
  if (err instanceof ApiError) {
    return ApiResponse.error(err);
  }

  // Prisma known errors
  if (isPrismaNotFoundError(err)) {
    return ApiResponse.fail(404, 'NOT_FOUND', 'Record not found');
  }
  if (isPrismaUniqueConstraintError(err)) {
    return ApiResponse.fail(409, 'CONFLICT', 'A record with this value already exists');
  }

  // Unexpected error
  (reqLog ?? log).error('Unhandled error', { error: err });
  return ApiResponse.fail(
    500,
    'INTERNAL_ERROR',
    process.env.NODE_ENV === 'development' && err instanceof Error
      ? err.message
      : 'Internal server error',
  );
}

// Prisma error detection without importing Prisma types
function isPrismaNotFoundError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2025'
  );
}

function isPrismaUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2002'
  );
}
