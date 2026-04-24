/**
 * GET /api/pairing/request/[id]
 * MABA views the status of their own pairing request.
 * Only the owner (requester) can read this.
 * Roles: MABA
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateParams, NotFoundError, ForbiddenError } from '@/lib/api';
import { z } from 'zod';

const idSchema = z.object({ id: z.string().min(1) });

export const GET = createApiHandler({
  roles: ['MABA'],
  handler: async (req, ctx) => {
    const { id } = validateParams(ctx.params, idSchema);
    const user = ctx.user as { id: string };

    ctx.log.info('MABA fetching pairing request status', { requestId: id, userId: user.id });

    const request = await prisma.pairingRequest.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, fullName: true, displayName: true } },
        resolver: { select: { id: true, fullName: true, displayName: true } },
        currentKasuhPair: {
          include: {
            kasuh: { select: { id: true, fullName: true, displayName: true, nrp: true, role: true, province: true, interests: true } },
          },
        },
        fulfilledKasuhPair: {
          include: {
            kasuh: { select: { id: true, fullName: true, displayName: true, nrp: true, role: true, province: true, interests: true } },
          },
        },
        cohort: { select: { id: true, code: true, name: true } },
      },
    });

    if (!request) throw NotFoundError('Pairing Request');

    // Only owner can view
    if (request.requesterUserId !== user.id) {
      throw ForbiddenError('Anda tidak berhak melihat request ini');
    }

    return ApiResponse.success(request);
  },
});
