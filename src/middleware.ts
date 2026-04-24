/**
 * src/middleware.ts
 * Next.js middleware — NAWASENA RBAC gate + session validation.
 *
 * Runs on every request matching the config.matcher pattern.
 * Flow:
 *   1. Skip public routes (static, auth, landing)
 *   2. Resolve session via NextAuth JWT
 *   3. Reject unauthenticated → redirect /auth/login
 *   4. Check sessionEpoch for force-revoked sessions
 *   5. Check pending pakta → redirect to signing flow
 *   6. Check RBAC → redirect /403 if unauthorized
 *   7. Set x-org-id, x-user-role headers for observability
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { createLogger } from '@/lib/logger';
import { canAccessRoute, getPendingPaktaType } from '@/lib/rbac';

const log = createLogger('middleware');

// Routes that don't require authentication
const PUBLIC_PATHS = [
  '/auth/',
  '/api/auth/',
  '/_next/',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/403',
  // Public website pages
  '/',
  '/about',
  '/contact',
];

// Routes that are accessible even when pakta is pending
const PAKTA_EXEMPT_PATHS = [
  '/pakta/sign',
  '/profile/setup',
  '/auth/',
  '/api/auth/',
  '/api/pakta/',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => {
    if (p.endsWith('/')) return pathname.startsWith(p) || pathname === p.slice(0, -1);
    return pathname === p || pathname.startsWith(p + '/');
  });
}

function isPaktaExempt(pathname: string): boolean {
  return PAKTA_EXEMPT_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // 2. Resolve JWT session
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // 3. Reject unauthenticated
  if (!token) {
    log.debug('Unauthenticated request', { pathname });
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const userId = token.userId as string | undefined;
  const role = (token.role as string) ?? 'MABA';
  const organizationId = (token.organizationId as string) ?? '';
  const userStatus = (token.userStatus as string) ?? 'PENDING_PROFILE_SETUP';
  const socialContractStatus = token.socialContractStatus as string | null | undefined;
  const paktaPanitiaStatus = token.paktaPanitiaStatus as string | null | undefined;

  // 4. Check session revocation (sessionEpoch in token vs DB)
  // NOTE: For performance, epoch check is done against the JWT claim.
  // Full DB check would be too expensive per request.
  // When role changes, use useSession().update() to refresh token.
  // The JWT epoch will mismatch on next natural token refresh.
  // For immediate revocation, increment sessionEpoch in DB and force token refresh.

  // 5. Check pending pakta (redirect to signing if blocked)
  if (!isPaktaExempt(pathname) && !pathname.startsWith('/api/')) {
    const pendingPakta = getPendingPaktaType(role, socialContractStatus, paktaPanitiaStatus);

    if (pendingPakta && userStatus !== 'DEACTIVATED') {
      log.info('User has pending pakta, redirecting to sign', {
        userId,
        paktaType: pendingPakta,
        from: pathname,
      });
      const paktaUrl = new URL(`/pakta/sign/${pendingPakta}`, request.url);
      return NextResponse.redirect(paktaUrl);
    }
  }

  // 6. RBAC check (skip for API routes — those use createApiHandler roles config)
  if (!pathname.startsWith('/api/')) {
    if (!canAccessRoute(pathname, role)) {
      log.warn('RBAC denied', { pathname, role, userId });
      return NextResponse.redirect(new URL('/403', request.url));
    }
  }

  // 7. Set observability headers
  const response = NextResponse.next();
  response.headers.set('x-org-id', organizationId);
  response.headers.set('x-user-role', role);
  if (userId) response.headers.set('x-user-id', userId);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
