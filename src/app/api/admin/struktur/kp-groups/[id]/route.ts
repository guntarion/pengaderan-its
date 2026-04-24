/**
 * GET /api/admin/struktur/kp-groups/[id] — get KP Group detail
 * PATCH /api/admin/struktur/kp-groups/[id] — update KP Group
 * DELETE /api/admin/struktur/kp-groups/[id] — archive KP Group
 *
 * Roles: SC, OC, SUPERADMIN
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, validateParams, NotFoundError } from '@/lib/api';
import { z } from 'zod';
import { updateKPGroupSchema, archiveKPGroupSchema } from '@/lib/schemas/kp-group';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';

const idSchema = z.object({ id: z.string().min(1) });

export const GET = createApiHandler({
  roles: ['SC', 'OC', 'SUPERADMIN'],
  handler: async (_req, ctx) => {
    const { id } = validateParams(ctx.params, idSchema);

    const group = await prisma.kPGroup.findUnique({
      where: { id },
      include: {
        coordinator: { select: { id: true, fullName: true, displayName: true, email: true } },
        creator: { select: { id: true, fullName: true } },
        cohort: { select: { id: true, code: true, name: true, startDate: true, endDate: true } },
        members: {
          where: { status: 'ACTIVE' },
          include: {
            user: { select: { id: true, fullName: true, displayName: true, nrp: true, email: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!group) throw NotFoundError('KP Group');

    return ApiResponse.success(group);
  },
});

export const PATCH = createApiHandler({
  roles: ['SC', 'OC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { id } = validateParams(ctx.params, idSchema);
    const data = await validateBody(req, updateKPGroupSchema);
    const user = ctx.user as { id: string };

    const existing = await prisma.kPGroup.findUnique({ where: { id } });
    if (!existing) throw NotFoundError('KP Group');

    ctx.log.info('Updating KP Group', { id, changes: Object.keys(data) });

    const updated = await prisma.kPGroup.update({
      where: { id },
      data,
      include: {
        coordinator: { select: { id: true, fullName: true, email: true } },
      },
    });

    await logAudit({
      action: AuditAction.KP_GROUP_UPDATE,
      organizationId: existing.organizationId,
      actorUserId: user.id,
      entityType: 'KPGroup',
      entityId: id,
      beforeValue: { status: existing.status, name: existing.name },
      afterValue: data,
    });

    return ApiResponse.success(updated);
  },
});

export const DELETE = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { id } = validateParams(ctx.params, idSchema);
    const data = await validateBody(req, archiveKPGroupSchema);
    const user = ctx.user as { id: string };

    const existing = await prisma.kPGroup.findUnique({ where: { id } });
    if (!existing) throw NotFoundError('KP Group');

    ctx.log.info('Archiving KP Group', { id });

    await prisma.kPGroup.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });

    await logAudit({
      action: AuditAction.KP_GROUP_ARCHIVE,
      organizationId: existing.organizationId,
      actorUserId: user.id,
      entityType: 'KPGroup',
      entityId: id,
      reason: data.reason,
    });

    return ApiResponse.success({ archived: true, id });
  },
});
