/**
 * GET /api/admin/struktur/kp-groups — list KP Groups for active cohort
 * POST /api/admin/struktur/kp-groups — create new KP Group
 *
 * Roles: SC, OC, SUPERADMIN
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, validateQuery } from '@/lib/api';
import { z } from 'zod';
import { createKPGroupSchema } from '@/lib/schemas/kp-group';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';

const querySchema = z.object({
  cohortId: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
});

export const GET = createApiHandler({
  roles: ['SC', 'OC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { cohortId, status } = validateQuery(req, querySchema);

    ctx.log.info('Fetching KP Groups', { cohortId, status });

    const groups = await prisma.kPGroup.findMany({
      where: {
        ...(cohortId ? { cohortId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        coordinator: {
          select: { id: true, fullName: true, displayName: true, email: true },
        },
        cohort: {
          select: { id: true, code: true, name: true },
        },
        _count: { select: { members: { where: { status: 'ACTIVE' } } } },
      },
      orderBy: [{ cohortId: 'asc' }, { code: 'asc' }],
    });

    return ApiResponse.success(groups);
  },
});

export const POST = createApiHandler({
  roles: ['SC', 'OC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const data = await validateBody(req, createKPGroupSchema);
    const user = ctx.user as { id: string; organizationId?: string };

    ctx.log.info('Creating KP Group', { code: data.code, cohortId: data.cohortId });

    // Verify cohort exists and get organizationId
    const cohort = await prisma.cohort.findUnique({
      where: { id: data.cohortId },
      select: { id: true, organizationId: true, code: true },
    });

    if (!cohort) {
      const { BadRequestError } = await import('@/lib/api');
      throw BadRequestError('Cohort tidak ditemukan');
    }

    const group = await prisma.kPGroup.create({
      data: {
        organizationId: cohort.organizationId,
        cohortId: data.cohortId,
        code: data.code,
        name: data.name,
        kpCoordinatorUserId: data.kpCoordinatorUserId,
        assistantUserIds: data.assistantUserIds,
        capacityTarget: data.capacityTarget,
        capacityMax: data.capacityMax,
        createdBy: user.id,
      },
      include: {
        coordinator: { select: { id: true, fullName: true, email: true } },
        cohort: { select: { id: true, code: true, name: true } },
      },
    });

    await logAudit({
      action: AuditAction.KP_GROUP_CREATE,
      organizationId: cohort.organizationId,
      actorUserId: user.id,
      entityType: 'KPGroup',
      entityId: group.id,
      afterValue: { code: group.code, name: group.name, cohortId: data.cohortId },
    });

    ctx.log.info('KP Group created', { id: group.id, code: group.code });
    return ApiResponse.success(group, 201);
  },
});
