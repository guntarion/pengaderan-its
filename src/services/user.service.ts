/**
 * src/services/user.service.ts
 * UserService — org transfer + facultyCode mirror + sessionEpoch invalidation.
 * Phase RV-B — M01 Revisi Multi-HMJ
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';

const log = createLogger('user-service');

/**
 * Transfer a user to a new organization.
 *
 * Side effects (atomic transaction):
 *   1. Updates User.organizationId = newOrgId
 *   2. Mirrors User.facultyCode = newOrg.facultyCode
 *   3. Increments User.sessionEpoch (force re-login)
 *   4. Writes audit log USER_ORG_TRANSFER
 *
 * @param userId      - User to transfer
 * @param newOrgId    - Target organization
 * @param reason      - Mandatory reason (e.g., "Mutasi jurusan")
 * @param actorUserId - SUPERADMIN performing the transfer
 */
export async function transferUserOrg(
  userId: string,
  newOrgId: string,
  reason: string,
  actorUserId: string,
): Promise<void> {
  // Fetch user + target org in parallel
  const [user, newOrg] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        organizationId: true,
        facultyCode: true,
        sessionEpoch: true,
      },
    }),
    prisma.organization.findUnique({
      where: { id: newOrgId },
      select: { id: true, code: true, facultyCode: true, registrationStatus: true },
    }),
  ]);

  if (!user) throw new Error('USER_NOT_FOUND');
  if (!newOrg) throw new Error('ORG_NOT_FOUND');
  if (newOrg.registrationStatus === 'SUSPENDED') {
    throw new Error('ORG_SUSPENDED');
  }
  if (user.organizationId === newOrgId) {
    throw new Error('USER_ALREADY_IN_ORG');
  }

  const fromOrgId = user.organizationId;

  log.info('Transferring user to new org', {
    userId,
    fromOrgId,
    toOrgId: newOrgId,
    actorUserId,
  });

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        organizationId: newOrgId,
        facultyCode: newOrg.facultyCode ?? null,
        sessionEpoch: { increment: 1 },
      },
    });
  });

  await logAudit({
    action: AuditAction.USER_UPDATE,
    organizationId: newOrgId,
    actorUserId,
    subjectUserId: userId,
    entityType: 'User',
    entityId: userId,
    beforeValue: { organizationId: fromOrgId, facultyCode: user.facultyCode },
    afterValue: { organizationId: newOrgId, facultyCode: newOrg.facultyCode },
    reason,
    metadata: {
      action: 'USER_ORG_TRANSFER',
      fromOrgId,
      toOrgId: newOrgId,
      sessionEpochIncremented: true,
    },
  });

  log.info('User org transfer complete', {
    userId,
    fromOrgId,
    toOrgId: newOrgId,
  });
}
