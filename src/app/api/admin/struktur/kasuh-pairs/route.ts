/**
 * GET /api/admin/struktur/kasuh-pairs — list Kasuh Pairs
 * Roles: SC, OC, SUPERADMIN
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateQuery } from '@/lib/api';
import { z } from 'zod';

const querySchema = z.object({
  cohortId: z.string().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'REASSIGNED']).optional(),
  kasuhUserId: z.string().optional(),
});

export const GET = createApiHandler({
  roles: ['SC', 'OC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { cohortId, status, kasuhUserId } = validateQuery(req, querySchema);

    ctx.log.info('Fetching Kasuh Pairs', { cohortId, status });

    const pairs = await prisma.kasuhPair.findMany({
      where: {
        ...(cohortId ? { cohortId } : {}),
        ...(status ? { status } : {}),
        ...(kasuhUserId ? { kasuhUserId } : {}),
      },
      include: {
        maba: { select: { id: true, fullName: true, displayName: true, nrp: true } },
        kasuh: { select: { id: true, fullName: true, displayName: true, nrp: true } },
        cohort: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ApiResponse.success(pairs);
  },
});
