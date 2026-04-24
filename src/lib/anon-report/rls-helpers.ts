/**
 * src/lib/anon-report/rls-helpers.ts
 * NAWASENA M12 — RLS session variable helpers for anonymous channel.
 *
 * These helpers set PostgreSQL session variables used by RLS policies
 * on anon_reports, anon_report_access_logs, anon_report_config tables.
 *
 * Usage (in protected API handler):
 *   import { setAnonSessionVars, setBypassRls } from '@/lib/anon-report/rls-helpers';
 *
 *   const report = await prisma.$transaction(async (tx) => {
 *     await setAnonSessionVars(tx, user);  // Sets role + org_id
 *     return tx.anonReport.findMany();
 *   });
 *
 * For public submit / status tracker (bypass RLS):
 *   await prisma.$transaction(async (tx) => {
 *     await setBypassRls(tx);
 *     // ... public insert or narrow select
 *   });
 */

import { Prisma } from '@prisma/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('anon-rls-helpers');

export interface AnonSessionUser {
  id: string;
  role: string;
  organizationId?: string | null;
}

/**
 * Set RLS session variables for an authenticated BLM/Satgas/SUPERADMIN handler.
 * Must be called inside a transaction before any AnonReport queries.
 *
 * Sets:
 *   - app.current_user_role → user's role
 *   - app.current_user_org_id → user's organization (for BLM org scoping)
 *   - app.bypass_rls → false (ensure default deny is active)
 */
export async function setAnonSessionVars(
  tx: Prisma.TransactionClient,
  user: AnonSessionUser,
): Promise<void> {
  const role = user.role;
  const orgId = user.organizationId ?? '';

  log.debug('Setting anon RLS session vars', { role, hasOrg: !!orgId });

  await tx.$executeRawUnsafe(
    `SET LOCAL app.current_user_role = '${role.replace(/'/g, "''")}'`,
  );
  await tx.$executeRawUnsafe(
    `SET LOCAL app.current_user_org_id = '${orgId.replace(/'/g, "''")}'`,
  );
  await tx.$executeRawUnsafe(`SET LOCAL app.bypass_rls = 'false'`);
}

/**
 * Set bypass_rls = 'true' in a transaction.
 * Use for:
 *   - Public submit (INSERT with no session)
 *   - Public status tracker (narrow SELECT by trackingCode)
 *   - Retention cron (service-to-service)
 *
 * IMPORTANT: Only use in narrow, well-audited code paths.
 * After setting bypass, immediately do the operation and return.
 */
export async function setBypassRls(tx: Prisma.TransactionClient): Promise<void> {
  log.debug('Setting RLS bypass for anon operation');
  await tx.$executeRawUnsafe(`SET LOCAL app.bypass_rls = 'true'`);
}
