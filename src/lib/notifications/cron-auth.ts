/**
 * src/lib/notifications/cron-auth.ts
 * NAWASENA M15 — Verifies CRON_SECRET bearer token for cron endpoints.
 *
 * Vercel Cron automatically sets the Authorization header.
 * Manual "Run now" triggers from admin also include this header.
 */

import type { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';
import { ForbiddenError } from '@/lib/api';

const log = createLogger('notifications:cron-auth');

/**
 * Verify that the request has a valid CRON_SECRET Authorization header.
 * Throws ForbiddenError (ApiError 403) if verification fails — createApiHandler catches it.
 */
export function verifyCronAuth(req: NextRequest): void {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    log.error('CRON_SECRET not configured — rejecting all cron requests');
    throw ForbiddenError('CRON_SECRET not configured');
  }

  const authHeader = req.headers.get('authorization');

  if (!authHeader) {
    log.warn('Cron request missing Authorization header', {
      path: req.nextUrl.pathname,
    });
    throw ForbiddenError('Missing Authorization header');
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    log.warn('Invalid Authorization header format', {
      scheme,
      path: req.nextUrl.pathname,
    });
    throw ForbiddenError('Invalid Authorization header format');
  }

  if (token !== cronSecret) {
    log.warn('Invalid CRON_SECRET', { path: req.nextUrl.pathname });
    throw ForbiddenError('Invalid cron secret');
  }

  log.debug('Cron auth verified', { path: req.nextUrl.pathname });
}
