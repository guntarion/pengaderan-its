/**
 * src/app/api/konsekuensi/me/route.ts
 * NAWASENA M10 — Maba self-list of consequences.
 *
 * GET /api/konsekuensi/me — Returns paginated consequences assigned to the current user.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateQuery } from '@/lib/api';
import { z } from 'zod';
import { ConsequenceStatus } from '@prisma/client';

const querySchema = z.object({
  status: z.nativeEnum(ConsequenceStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const GET = createApiHandler({
  auth: true,
  handler: async (req, ctx) => {
    ctx.log.info('Fetching self consequences');

    const rawUser = ctx.user as unknown as { id: string };
    const q = validateQuery(req, querySchema);
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const status = q.status;

    const where = {
      userId: rawUser.id,
      ...(status ? { status } : {}),
    };

    const [consequences, total] = await Promise.all([
      prisma.consequenceLog.findMany({
        where,
        include: {
          assignedBy: { select: { id: true, fullName: true, displayName: true } },
          relatedIncident: {
            select: { id: true, type: true, severity: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.consequenceLog.count({ where }),
    ]);

    return ApiResponse.paginated(consequences, { page, limit, total });
  },
});
