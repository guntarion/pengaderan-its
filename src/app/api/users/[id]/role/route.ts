// src/app/api/users/[id]/role/route.ts
// NAWASENA: Role assignment with audit log via admin panel.
// This legacy endpoint is kept but redirects to the new admin pattern.
// Full implementation in Phase 6: /api/admin/users/[id]/role

import { createApiHandler, ApiResponse, validateBody, validateParams, idParamSchema } from '@/lib/api';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { prisma } from '@/utils/prisma';

export const dynamic = 'force-dynamic';

const nawasenaRoleSchema = z.enum([
  UserRole.MABA, UserRole.KP, UserRole.KASUH, UserRole.OC,
  UserRole.ELDER, UserRole.SC, UserRole.PEMBINA, UserRole.BLM,
  UserRole.SATGAS, UserRole.ALUMNI, UserRole.DOSEN_WALI, UserRole.SUPERADMIN,
]);

const updateRoleSchema = z.object({
  role: nawasenaRoleSchema,
  reason: z.string().min(20, 'Reason must be at least 20 characters'),
});

/**
 * PUT /api/users/:id/role — Update user role (SUPERADMIN only).
 * Note: Full role change with session epoch increment is in Phase 6 admin routes.
 */
export const PUT = createApiHandler({
  roles: [UserRole.SUPERADMIN],
  handler: async (req, { params }) => {
    const { id } = validateParams(params, idParamSchema);
    const { role } = await validateBody(req, updateRoleSchema);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        role,
        sessionEpoch: { increment: 1 }, // Force re-login on role change
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });

    return ApiResponse.success(updatedUser);
  },
});
