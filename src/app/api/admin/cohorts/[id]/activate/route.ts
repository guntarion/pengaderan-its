/**
 * POST /api/admin/cohorts/[id]/activate
 * Activate a cohort (deactivates any currently active cohort first).
 * Roles: SC, SUPERADMIN
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { BadRequestError, NotFoundError } from '@/lib/api/errors';
import { prisma } from '@/utils/prisma';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';

export const POST = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (_req, { user, params, log }) => {
    const { id } = params;
    const orgId = user.organizationId ?? '';
    if (!orgId) throw BadRequestError('organizationId tidak ditemukan');

    const cohort = await prisma.cohort.findUnique({
      where: { id },
      select: { id: true, organizationId: true, code: true, name: true, status: true },
    });

    if (!cohort) throw NotFoundError('Cohort');
    if (cohort.organizationId !== orgId && user.role !== 'SUPERADMIN') {
      throw BadRequestError('Cohort ini bukan milik organisasi Anda');
    }

    log.info('Activating cohort', { id, orgId });

    await prisma.$transaction(async (tx) => {
      // Deactivate current active cohort
      await tx.cohort.updateMany({
        where: { organizationId: cohort.organizationId, isActive: true },
        data: { isActive: false },
      });

      // Activate this cohort
      await tx.cohort.update({
        where: { id },
        data: { isActive: true, status: 'ACTIVE' },
      });
    });

    await logAudit({
      action: AuditAction.COHORT_UPDATE,
      organizationId: orgId,
      actorUserId: user.id,
      entityType: 'Cohort',
      entityId: id,
      afterValue: { isActive: true, status: 'ACTIVE' },
    });

    return ApiResponse.success({ activated: true, cohortId: id });
  },
});
