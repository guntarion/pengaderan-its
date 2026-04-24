/**
 * GET /api/pairing/my-adik-asuh
 * Kasuh fetches their active adik asuh (maba) with full profile (kasuh_adik_view).
 * Roles: KASUH
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse } from '@/lib/api';
import { sanitizeUserForM03 } from '@/lib/user/sanitize';

const userSelect = {
  id: true,
  fullName: true,
  displayName: true,
  nrp: true,
  role: true,
  province: true,
  interests: true,
  shareContact: true,
  isRantau: true,
  isKIP: true,
  status: true,
  email: true,
  createdAt: true,
  phone: true,
} as const;

export const GET = createApiHandler({
  roles: ['KASUH'],
  handler: async (req, ctx) => {
    const user = ctx.user as { id: string };

    ctx.log.info('KASUH fetching their adik asuh', { userId: user.id });

    const pairs = await prisma.kasuhPair.findMany({
      where: {
        kasuhUserId: user.id,
        status: 'ACTIVE',
      },
      include: {
        maba: { select: userSelect },
        cohort: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const adikAsuhList = pairs.map((pair) => ({
      pairId: pair.id,
      cohort: pair.cohort,
      matchScore: pair.matchScore,
      matchReasons: pair.matchReasons,
      createdAt: pair.createdAt,
      maba: sanitizeUserForM03(
        pair.maba as Parameters<typeof sanitizeUserForM03>[0],
        'kasuh_adik_view'
      ),
    }));

    return ApiResponse.success(adikAsuhList);
  },
});
