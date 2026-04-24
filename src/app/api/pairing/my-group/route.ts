/**
 * GET /api/pairing/my-group
 * KP Coordinator fetches their KP Group and its members.
 * Sanitized output using sanitizeUserForM03 (kp_group_view).
 * Roles: KP
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
  roles: ['KP'],
  handler: async (req, ctx) => {
    const user = ctx.user as { id: string };

    ctx.log.info('KP fetching their group', { userId: user.id });

    const kpGroup = await prisma.kPGroup.findFirst({
      where: {
        kpCoordinatorUserId: user.id,
        status: 'ACTIVE',
      },
      include: {
        cohort: { select: { id: true, code: true, name: true } },
        members: {
          where: { leftAt: null },
          include: {
            user: { select: userSelect },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!kpGroup) {
      return ApiResponse.success(null);
    }

    const sanitizedMembers = kpGroup.members.map((m) =>
      sanitizeUserForM03(
        m.user as Parameters<typeof sanitizeUserForM03>[0],
        'kp_group_view'
      )
    );

    return ApiResponse.success({
      id: kpGroup.id,
      code: kpGroup.code,
      name: kpGroup.name,
      status: kpGroup.status,
      capacityTarget: kpGroup.capacityTarget,
      capacityMax: kpGroup.capacityMax,
      cohort: kpGroup.cohort,
      memberCount: kpGroup.members.length,
      members: sanitizedMembers,
    });
  },
});
