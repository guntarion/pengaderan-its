/**
 * GET /api/pairing/my-relations
 * MABA sees their 3 pairing relations: KP Group, Buddy, Kasuh.
 * Sanitized output using sanitizeUserForM03.
 * Roles: MABA
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
} as const;

export const GET = createApiHandler({
  roles: ['MABA'],
  handler: async (req, ctx) => {
    const user = ctx.user as { id: string; currentCohortId?: string };

    ctx.log.info('MABA fetching their pairing relations', { userId: user.id });

    const [kpMembership, buddyMembership, kasuhPair] = await Promise.all([
      // KP Group membership
      prisma.kPGroupMember.findFirst({
        where: { userId: user.id, leftAt: null },
        include: {
          kpGroup: {
            include: {
              coordinator: { select: userSelect },
              members: {
                where: { leftAt: null },
                include: {
                  user: { select: userSelect },
                },
              },
            },
          },
        },
      }),

      // Buddy pair
      prisma.buddyPairMember.findFirst({
        where: { userId: user.id, buddyPair: { status: 'ACTIVE' } },
        include: {
          buddyPair: {
            include: {
              members: {
                include: {
                  user: { select: userSelect },
                },
              },
            },
          },
        },
      }),

      // Kasuh pair
      prisma.kasuhPair.findFirst({
        where: { mabaUserId: user.id, status: 'ACTIVE' },
        include: {
          kasuh: { select: userSelect },
          cohort: { select: { id: true, code: true, name: true } },
        },
      }),
    ]);

    // Sanitize KP Group members (kp_group_view)
    const kpGroupData = kpMembership?.kpGroup
      ? {
          id: kpMembership.kpGroup.id,
          code: kpMembership.kpGroup.code,
          name: kpMembership.kpGroup.name,
          coordinator: kpMembership.kpGroup.coordinator
            ? sanitizeUserForM03(kpMembership.kpGroup.coordinator as Parameters<typeof sanitizeUserForM03>[0], 'kp_group_view')
            : null,
          members: kpMembership.kpGroup.members
            .filter((m) => m.user.id !== user.id)
            .map((m) => sanitizeUserForM03(m.user as Parameters<typeof sanitizeUserForM03>[0], 'kp_group_view')),
          memberCount: kpMembership.kpGroup.members.length,
        }
      : null;

    // Sanitize buddy pair (buddy_view)
    const buddyData = buddyMembership?.buddyPair
      ? {
          id: buddyMembership.buddyPair.id,
          buddies: buddyMembership.buddyPair.members
            .filter((m) => m.user.id !== user.id)
            .map((m) => sanitizeUserForM03(m.user as Parameters<typeof sanitizeUserForM03>[0], 'buddy_view')),
        }
      : null;

    // Sanitize Kasuh (buddy_view — basic + interests + province; no emergency contact)
    const kasuhData = kasuhPair?.kasuh
      ? {
          pairId: kasuhPair.id,
          kasuh: sanitizeUserForM03(kasuhPair.kasuh as Parameters<typeof sanitizeUserForM03>[0], 'buddy_view'),
          cohort: kasuhPair.cohort,
        }
      : null;

    return ApiResponse.success({
      kpGroup: kpGroupData,
      buddyPair: buddyData,
      kasuhPair: kasuhData,
    });
  },
});
