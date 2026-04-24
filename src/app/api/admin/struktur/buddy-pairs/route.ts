/**
 * GET /api/admin/struktur/buddy-pairs — list Buddy Pairs for cohort
 * Roles: SC, OC, SUPERADMIN
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateQuery } from '@/lib/api';
import { z } from 'zod';

const querySchema = z.object({
  cohortId: z.string().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'REASSIGNED']).optional(),
});

export const GET = createApiHandler({
  roles: ['SC', 'OC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { cohortId, status } = validateQuery(req, querySchema);

    ctx.log.info('Fetching Buddy Pairs', { cohortId, status });

    const pairs = await prisma.buddyPair.findMany({
      where: {
        ...(cohortId ? { cohortId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, fullName: true, displayName: true, nrp: true, isRantau: true } },
          },
        },
        cohort: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ApiResponse.success(pairs);
  },
});
