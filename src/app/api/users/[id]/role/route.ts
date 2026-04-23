// src/app/api/users/[id]/role/route.ts
import { prisma } from '@/utils/prisma';
import {
  createApiHandler,
  ApiResponse,
  validateBody,
  validateParams,
  idParamSchema,
  roleSchema,
} from '@/lib/api';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateRoleSchema = z.object({
  role: roleSchema,
});

/**
 * PUT /api/users/:id/role — Update user role (admin only).
 */
export const PUT = createApiHandler({
  roles: ['admin'],
  handler: async (req, { params }) => {
    const { id } = validateParams(params, idParamSchema);
    const { role } = await validateBody(req, updateRoleSchema);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });

    return ApiResponse.success(updatedUser);
  },
});
