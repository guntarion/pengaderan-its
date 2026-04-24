/**
 * PATCH /api/users/me/demographics
 * Update current user's demographic fields (opt-in, all nullable).
 */

import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';

const demographicsSchema = z.object({
  isRantau: z.boolean().optional().nullable(),
  isKIP: z.boolean().optional().nullable(),
  hasDisability: z.boolean().optional().nullable(),
  disabilityNotes: z.string().max(500).optional().nullable(),
  province: z.string().max(5).optional().nullable(),
  emergencyContactName: z.string().max(200).optional().nullable(),
  emergencyContactRelation: z.string().max(100).optional().nullable(),
  emergencyContactPhone: z.string().max(20).optional().nullable(),
});

export const PATCH = createApiHandler({
  auth: true,
  handler: async (req, { user }) => {
    const body = await validateBody(req, demographicsSchema);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...body,
        demographicsUpdatedAt: new Date(),
      },
      select: {
        id: true, isRantau: true, isKIP: true, hasDisability: true,
        disabilityNotes: true, province: true,
        emergencyContactName: true, emergencyContactRelation: true,
        emergencyContactPhone: true, demographicsUpdatedAt: true,
      },
    });

    return ApiResponse.success(updated);
  },
});
