/**
 * GET /api/admin/struktur/pairing-requests
 * List Pairing Requests queue (SC review).
 * Roles: SC, SUPERADMIN
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateQuery } from '@/lib/api';
import { z } from 'zod';

const querySchema = z.object({
  cohortId: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED', 'CANCELLED']).optional(),
  type: z.enum(['RE_PAIR_KASUH', 'KASUH_UNREACHABLE']).optional(),
});

export const GET = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { cohortId, status, type } = validateQuery(req, querySchema);

    ctx.log.info('Fetching pairing requests queue', { cohortId, status, type });

    const requests = await prisma.pairingRequest.findMany({
      where: {
        ...(cohortId ? { cohortId } : {}),
        ...(status ? { status } : { status: 'PENDING' }),
        ...(type ? { type } : {}),
      },
      include: {
        requester: { select: { id: true, fullName: true, displayName: true, nrp: true, role: true } },
        subject: { select: { id: true, fullName: true, displayName: true, nrp: true, role: true } },
        cohort: { select: { id: true, code: true, name: true } },
        resolver: { select: { id: true, fullName: true, displayName: true } },
        currentKasuhPair: {
          select: {
            id: true,
            kasuh: { select: { id: true, fullName: true, displayName: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return ApiResponse.success(requests);
  },
});
