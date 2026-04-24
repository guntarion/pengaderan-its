/**
 * GET /api/admin/struktur/kp-groups/[id]/members — list members
 * POST /api/admin/struktur/kp-groups/[id]/members — add member
 * DELETE /api/admin/struktur/kp-groups/[id]/members — remove member
 *
 * Roles: SC, OC, SUPERADMIN
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, validateParams, NotFoundError, BadRequestError } from '@/lib/api';
import { z } from 'zod';
import { addKPGroupMemberSchema, removeKPGroupMemberSchema } from '@/lib/schemas/kp-group';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';

const idSchema = z.object({ id: z.string().min(1) });

export const GET = createApiHandler({
  roles: ['SC', 'OC', 'SUPERADMIN'],
  handler: async (_req, ctx) => {
    const { id } = validateParams(ctx.params, idSchema);

    const group = await prisma.kPGroup.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!group) throw NotFoundError('KP Group');

    const members = await prisma.kPGroupMember.findMany({
      where: { kpGroupId: id },
      include: {
        user: {
          select: { id: true, fullName: true, displayName: true, nrp: true, email: true, role: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return ApiResponse.success(members);
  },
});

export const POST = createApiHandler({
  roles: ['SC', 'OC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { id } = validateParams(ctx.params, idSchema);
    const data = await validateBody(req, addKPGroupMemberSchema);
    const user = ctx.user as { id: string };

    const group = await prisma.kPGroup.findUnique({
      where: { id },
      select: { id: true, organizationId: true, cohortId: true, capacityMax: true },
    });
    if (!group) throw NotFoundError('KP Group');

    // Check capacity
    const currentCount = await prisma.kPGroupMember.count({
      where: { kpGroupId: id, status: 'ACTIVE' },
    });
    if (currentCount >= group.capacityMax) {
      throw BadRequestError(`KP Group sudah penuh (kapasitas maks: ${group.capacityMax})`);
    }

    ctx.log.info('Adding member to KP Group', { groupId: id, userId: data.userId });

    const member = await prisma.kPGroupMember.create({
      data: {
        organizationId: group.organizationId,
        cohortId: group.cohortId,
        kpGroupId: id,
        userId: data.userId,
        memberType: data.memberType,
      },
      include: {
        user: { select: { id: true, fullName: true, nrp: true } },
      },
    });

    await logAudit({
      action: AuditAction.KP_GROUP_ASSIGN_MEMBER,
      organizationId: group.organizationId,
      actorUserId: user.id,
      subjectUserId: data.userId,
      entityType: 'KPGroupMember',
      entityId: member.id,
      afterValue: { kpGroupId: id, userId: data.userId, memberType: data.memberType },
    });

    return ApiResponse.success(member, 201);
  },
});

export const DELETE = createApiHandler({
  roles: ['SC', 'OC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { id } = validateParams(ctx.params, idSchema);
    const data = await validateBody(req, removeKPGroupMemberSchema);
    const user = ctx.user as { id: string };

    const group = await prisma.kPGroup.findUnique({
      where: { id },
      select: { id: true, organizationId: true, cohortId: true },
    });
    if (!group) throw NotFoundError('KP Group');

    const member = await prisma.kPGroupMember.findFirst({
      where: { kpGroupId: id, userId: data.userId, status: 'ACTIVE' },
    });
    if (!member) throw NotFoundError('Member aktif');

    ctx.log.info('Removing member from KP Group', { groupId: id, userId: data.userId });

    await prisma.kPGroupMember.update({
      where: { id: member.id },
      data: {
        status: 'ARCHIVED',
        leftAt: new Date(),
        leftReason: data.reason,
      },
    });

    await logAudit({
      action: AuditAction.KP_GROUP_REMOVE_MEMBER,
      organizationId: group.organizationId,
      actorUserId: user.id,
      subjectUserId: data.userId,
      entityType: 'KPGroupMember',
      entityId: member.id,
      reason: data.reason,
    });

    return ApiResponse.success({ removed: true, userId: data.userId });
  },
});
