/**
 * src/lib/tenant/superadmin-bypass.ts
 * SUPERADMIN cross-organization access helper.
 *
 * The ONLY sanctioned way to access another organization's data as SUPERADMIN.
 * Automatically:
 *   1. Validates actor is SUPERADMIN
 *   2. Requires reason (min 20 chars)
 *   3. Sets bypass_rls = true for the duration
 *   4. Writes NawasenaAuditLog entry before executing
 *   5. Unsets bypass after
 */

import { PrismaClient, UserRole } from '@prisma/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('superadmin-bypass');

interface CrossOrgOptions {
  targetOrgId: string;
  reason: string;
  actorUserId: string;
  actorRole: string;
}

/**
 * Execute a function with cross-org SUPERADMIN access.
 * Always writes an audit log entry.
 *
 * @param prisma    - Prisma client
 * @param options   - Who, why, and which org to access
 * @param fn        - Function to execute with bypass access
 */
export async function withCrossOrgAccess<T>(
  prisma: PrismaClient,
  options: CrossOrgOptions,
  fn: () => Promise<T>,
): Promise<T> {
  const { targetOrgId, reason, actorUserId, actorRole } = options;

  // Validate role
  if (actorRole !== UserRole.SUPERADMIN) {
    throw new Error(
      `withCrossOrgAccess requires SUPERADMIN role. Actor ${actorUserId} has role ${actorRole}.`,
    );
  }

  // Validate reason
  if (!reason || reason.trim().length < 20) {
    throw new Error(
      'Cross-org access requires a reason of at least 20 characters. Provided reason is too short.',
    );
  }

  log.warn('SUPERADMIN cross-org access initiated', {
    actorUserId,
    targetOrgId,
    reason: reason.substring(0, 50),
  });

  return prisma.$transaction(async (tx) => {
    // Set bypass RLS + target org
    await (tx as unknown as PrismaClient).$executeRaw`
      SELECT
        set_config('app.bypass_rls', 'true', true),
        set_config('app.current_org_id', ${targetOrgId}, true),
        set_config('app.current_user_id', ${actorUserId}, true)
    `;

    // Write audit log BEFORE executing the action
    await (tx as unknown as PrismaClient).nawasenaAuditLog.create({
      data: {
        action: 'SUPERADMIN_CROSS_ORG_ACCESS',
        actorUserId,
        entityType: 'Organization',
        entityId: targetOrgId,
        reason: reason.trim(),
        metadata: {
          targetOrgId,
          timestamp: new Date().toISOString(),
        },
      },
    });

    // Execute the cross-org operation
    const result = await fn();

    // Unset bypass
    await (tx as unknown as PrismaClient).$executeRaw`
      SELECT
        set_config('app.bypass_rls', 'false', true)
    `;

    return result;
  });
}
