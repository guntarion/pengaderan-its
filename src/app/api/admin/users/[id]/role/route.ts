/**
 * POST /api/admin/users/[id]/role
 * Change a user's role with mandatory reason.
 *
 * Roles: SC, SUPERADMIN
 * Body: { role, reason } — reason min 20 chars
 *
 * After role change: increment sessionEpoch → force re-login on next request.
 */

import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { BadRequestError, NotFoundError, ForbiddenError } from '@/lib/api/errors';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';
import { logRoleChange } from '@/lib/audit/audit-helpers';

const SENSITIVE_ROLES = ['SC', 'PEMBINA', 'BLM', 'SUPERADMIN'] as const;

const roleChangeSchema = z.object({
  role: z.enum([
    'MABA', 'KP', 'KASUH', 'OC', 'ELDER', 'SC',
    'PEMBINA', 'BLM', 'SATGAS', 'ALUMNI', 'DOSEN_WALI', 'SUPERADMIN',
  ]),
  reason: z.string().min(20, 'Alasan minimal 20 karakter'),
});

export const POST = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const { id: targetUserId } = params;
    const body = await validateBody(req, roleChangeSchema);
    const { role: newRole, reason } = body;

    // Fetch target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        organizationId: true,
        role: true,
        fullName: true,
        email: true,
      },
    });

    if (!targetUser) throw NotFoundError('User');

    // Org scoping (SC can only change users in their org)
    if (
      user.role !== 'SUPERADMIN' &&
      targetUser.organizationId !== user.organizationId
    ) {
      throw ForbiddenError('Tidak dapat mengubah role user dari organisasi lain');
    }

    // Prevent self-role-change
    if (targetUserId === user.id) {
      throw BadRequestError('Tidak dapat mengubah role diri sendiri');
    }

    // SC cannot assign SUPERADMIN role
    if (user.role === 'SC' && newRole === 'SUPERADMIN') {
      throw ForbiddenError('SC tidak dapat menetapkan role SUPERADMIN');
    }

    const oldRole = targetUser.role;

    if (oldRole === newRole) {
      throw BadRequestError('Role baru sama dengan role saat ini');
    }

    log.info('Changing user role', {
      targetUserId,
      oldRole,
      newRole,
      actorId: user.id,
    });

    // 1. Update role + increment sessionEpoch (force re-login)
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        role: newRole,
        sessionEpoch: { increment: 1 },
      },
    });

    // 2. Write audit log
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    await logRoleChange({
      actorUserId: user.id,
      subjectUserId: targetUserId,
      organizationId: targetUser.organizationId,
      oldRole,
      newRole,
      reason,
      ipAddress,
    });

    return ApiResponse.success({
      changed: true,
      userId: targetUserId,
      oldRole,
      newRole,
      isSensitive: SENSITIVE_ROLES.includes(newRole as typeof SENSITIVE_ROLES[number]),
    });
  },
});
