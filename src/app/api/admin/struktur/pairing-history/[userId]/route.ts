/**
 * GET /api/admin/struktur/pairing-history/[userId]
 * Full pairing history timeline for a user (all pair types).
 * Roles: SC, OC, SUPERADMIN
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateParams } from '@/lib/api';
import { z } from 'zod';

const idSchema = z.object({ userId: z.string().min(1) });

export const GET = createApiHandler({
  roles: ['SC', 'OC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { userId } = validateParams(ctx.params, idSchema);

    ctx.log.info('Fetching pairing history', { userId });

    const [kasuhPairsMaba, kasuhPairsKasuh, kpGroupMemberships, buddyPairMemberships, pairingRequests] =
      await Promise.all([
        // KasuhPair as MABA
        prisma.kasuhPair.findMany({
          where: { mabaUserId: userId },
          include: {
            kasuh: { select: { id: true, fullName: true, displayName: true, nrp: true } },
            cohort: { select: { id: true, code: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
        }),

        // KasuhPair as KASUH
        prisma.kasuhPair.findMany({
          where: { kasuhUserId: userId },
          include: {
            maba: { select: { id: true, fullName: true, displayName: true, nrp: true } },
            cohort: { select: { id: true, code: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
        }),

        // KP Group memberships
        prisma.kPGroupMember.findMany({
          where: { userId },
          include: {
            kpGroup: { select: { id: true, code: true, name: true } },
            cohort: { select: { id: true, code: true, name: true } },
          },
          orderBy: { joinedAt: 'asc' },
        }),

        // Buddy pair memberships
        prisma.buddyPairMember.findMany({
          where: { userId },
          include: {
            buddyPair: {
              select: {
                id: true,
                status: true,
                createdAt: true,
                archivedAt: true,
                members: {
                  include: {
                    user: { select: { id: true, fullName: true, displayName: true, nrp: true } },
                  },
                },
              },
            },
            cohort: { select: { id: true, code: true, name: true } },
          },
          orderBy: { joinedAt: 'asc' },
        }),

        // Pairing requests submitted by user
        prisma.pairingRequest.findMany({
          where: { requesterUserId: userId },
          include: {
            resolver: { select: { id: true, fullName: true, displayName: true } },
            cohort: { select: { id: true, code: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    return ApiResponse.success({
      userId,
      kasuhPairsMaba,
      kasuhPairsKasuh,
      kpGroupMemberships,
      buddyPairMemberships,
      pairingRequests,
    });
  },
});
