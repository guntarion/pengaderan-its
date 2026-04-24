/**
 * src/lib/mh-screening/rls-helpers.ts
 * NAWASENA M11 — RLS session variable helpers for MH data access.
 *
 * withMHContext: Sets session vars for normal 3-pathway access.
 *   SET LOCAL app.current_user_id = actorId
 *   SET LOCAL app.mh_encryption_key = MH_ENCRYPTION_KEY env var
 *
 * withMHBypass: Adds bypass_rls=true + mandatory audit (BYPASS_RLS).
 *   If audit INSERT fails → transaction rolls back → bypass NOT applied (fail-closed).
 *
 * SECURITY: actor.id is sanitized before use in SET LOCAL to prevent injection.
 * The encryption key comes from process.env and is never user-supplied.
 *
 * PRIVACY-CRITICAL: Do NOT log the encryption key value.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { sanitizeActorId } from './encryption';
import { recordMHAccess } from './access-log';
import type { UserRole } from '@prisma/client';

const log = createLogger('mh-rls-helpers');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaTransactionClient = any;

/**
 * Execute a function within a MH-scoped transaction.
 *
 * Sets the following session variables (LOCAL scope — auto-reset on tx end):
 *   app.current_user_id     — for RLS policy evaluation
 *   app.mh_encryption_key   — for pgcrypto encrypt/decrypt
 *
 * @param actor - The user performing the operation
 * @param fn - The function to execute within the transaction
 */
export async function withMHContext<T>(
  actor: { id: string; isPoliPsikologiCoord?: boolean },
  fn: (tx: PrismaTransactionClient) => Promise<T>,
): Promise<T> {
  const safeActorId = sanitizeActorId(actor.id);
  const encryptionKey = process.env.MH_ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('MH_ENCRYPTION_KEY environment variable is not configured');
  }

  log.debug('Entering MH context', { actorId: safeActorId });

  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${safeActorId}'`);
    // eslint-disable-next-line no-useless-escape
    await tx.$executeRaw`SELECT set_config('app.mh_encryption_key', ${encryptionKey}, true)`;

    if (actor.isPoliPsikologiCoord === true) {
      await tx.$executeRawUnsafe(`SET LOCAL "app.is_poli_psikologi_coordinator" = 'true'`);
    }

    return fn(tx);
  });
}

/**
 * Execute a function with RLS bypass.
 *
 * This is ONLY for maintenance/aggregate operations.
 * The audit entry is mandatory and executed BEFORE the bypass is applied.
 * If the audit INSERT fails, the transaction rolls back and the bypass is NOT applied.
 *
 * @param actor - The admin user requesting bypass (must have appropriate role)
 * @param reason - Why bypass is needed (required for audit trail)
 * @param fn - The function to execute with bypass active
 */
export async function withMHBypass<T>(
  actor: { id: string; role: UserRole },
  reason: string,
  fn: (tx: PrismaTransactionClient) => Promise<T>,
): Promise<T> {
  const safeActorId = sanitizeActorId(actor.id);
  const encryptionKey = process.env.MH_ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('MH_ENCRYPTION_KEY environment variable is not configured');
  }

  log.info('Entering MH bypass context — mandatory audit', {
    actorId: safeActorId,
    actorRole: actor.role,
    reason,
  });

  return prisma.$transaction(async (tx) => {
    // AUDIT FIRST — if this fails, bypass not applied (fail-closed)
    await recordMHAccess(tx, {
      actorId: actor.id,
      actorRole: actor.role,
      action: 'BYPASS_RLS',
      targetType: 'MHScreening',
      reason,
    });

    // Apply bypass after successful audit
    await tx.$executeRawUnsafe(`SET LOCAL "app.bypass_rls" = 'true'`);
    // eslint-disable-next-line no-useless-escape
    await tx.$executeRaw`SELECT set_config('app.mh_encryption_key', ${encryptionKey}, true)`;

    return fn(tx);
  });
}

/**
 * Execute a function with superadmin session var set (for audit log access).
 */
export async function withMHSuperadminContext<T>(
  fn: (tx: PrismaTransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL "app.is_superadmin" = 'true'`);
    return fn(tx);
  });
}
