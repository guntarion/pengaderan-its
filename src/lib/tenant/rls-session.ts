/**
 * src/lib/tenant/rls-session.ts
 * Sets PostgreSQL session variables for Row Level Security per request.
 *
 * These session-local settings are read by RLS policies:
 *   app.current_org_id  — filters rows by organization
 *   app.current_user_id — allows user to read own record
 *   app.bypass_rls      — SUPERADMIN cross-org access (always audited)
 *
 * IMPORTANT: Use SET LOCAL (transaction-scoped) rather than SET SESSION
 * to prevent leaking context across requests in connection pools.
 */

import { PrismaClient } from '@prisma/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('rls-session');

export interface RlsContext {
  orgId: string;
  userId: string;
  bypass?: boolean;
}

/**
 * Set RLS session variables for the current request/transaction.
 * Must be called at the start of each request that touches org-scoped tables.
 *
 * @param prisma - Prisma client instance (or transaction client)
 * @param ctx    - RLS context to set
 */
export async function setRlsContext(
  prisma: PrismaClient | Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
  ctx: RlsContext,
): Promise<void> {
  log.debug('Setting RLS context', {
    orgId: ctx.orgId,
    userId: ctx.userId,
    bypass: ctx.bypass ?? false,
  });

  await (prisma as PrismaClient).$executeRaw`
    SELECT
      set_config('app.current_org_id', ${ctx.orgId}, true),
      set_config('app.current_user_id', ${ctx.userId}, true),
      set_config('app.bypass_rls', ${ctx.bypass ? 'true' : 'false'}, true)
  `;
}

/**
 * Clear RLS context (set empty values).
 * Call this after request processing in cleanup/teardown.
 */
export async function clearRlsContext(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRaw`
    SELECT
      set_config('app.current_org_id', '', true),
      set_config('app.current_user_id', '', true),
      set_config('app.bypass_rls', 'false', true)
  `;
}
