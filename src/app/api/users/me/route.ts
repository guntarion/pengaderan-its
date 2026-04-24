/**
 * /api/users/me
 * GET  — get current user profile
 * PATCH — update fullName, displayName, nrp
 */

import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';

const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(200).optional(),
  displayName: z.string().max(100).optional(),
  nrp: z
    .string()
    .regex(/^\d{10}$/, 'NRP harus 10 digit')
    .optional()
    .nullable(),
});

export const GET = createApiHandler({
  auth: true,
  handler: async (_req, { user }) => {
    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true, email: true, fullName: true, displayName: true, nrp: true,
        role: true, status: true, image: true, organizationId: true,
        currentCohortId: true, createdAt: true, lastLoginAt: true,
        paktaPanitiaStatus: true, socialContractStatus: true, paktaPengader2027Status: true,
        currentCohort: { select: { code: true, name: true } },
        organization: { select: { code: true, name: true } },
      },
    });
    return ApiResponse.success(me);
  },
});

export const PATCH = createApiHandler({
  auth: true,
  handler: async (req, { user }) => {
    const body = await validateBody(req, updateProfileSchema);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: body,
      select: {
        id: true, fullName: true, displayName: true, nrp: true, status: true,
      },
    });
    return ApiResponse.success(updated);
  },
});
