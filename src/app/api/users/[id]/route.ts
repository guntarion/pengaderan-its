// src/app/api/users/[id]/route.ts
import { prisma } from '@/utils/prisma';
import {
  createApiHandler,
  ApiResponse,
  validateBody,
  validateParams,
  idParamSchema,
  ForbiddenError,
  NotFoundError,
} from '@/lib/api';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  namaPanggilan: true,
  nomerHandphone: true,
  gender: true,
  tanggalLahir: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * GET /api/users/:id — Get user profile.
 * Users can access their own profile; admins can access any.
 */
export const GET = createApiHandler({
  auth: true,
  handler: async (_req, { user, params }) => {
    const { id } = validateParams(params, idParamSchema);

    if (user.id !== id && user.role !== 'admin') {
      throw ForbiddenError();
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });

    if (!target) throw NotFoundError('User');

    return ApiResponse.success(target);
  },
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  image: z.string().nullable().optional(),
  namaPanggilan: z.string().nullable().optional(),
  nomerHandphone: z.string().nullable().optional(),
  gender: z.enum(['lelaki', 'perempuan']).nullable().optional(),
  tanggalLahir: z.coerce.date().nullable().optional(),
});

/**
 * PATCH /api/users/:id — Update user profile.
 * Users can update their own profile; admins can update any.
 */
export const PATCH = createApiHandler({
  auth: true,
  handler: async (req, { user, params }) => {
    const { id } = validateParams(params, idParamSchema);

    if (user.id !== id && user.role !== 'admin') {
      throw ForbiddenError();
    }

    const data = await validateBody(req, updateUserSchema);

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    });

    return ApiResponse.success(updatedUser);
  },
});
