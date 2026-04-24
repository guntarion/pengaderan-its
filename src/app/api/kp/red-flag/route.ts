/**
 * src/app/api/kp/red-flag/route.ts
 * NAWASENA M04 — Red flag list endpoint for KP.
 *
 * GET /api/kp/red-flag?cohortId=... — List active red-flag events for KP's Maba.
 */

import { createApiHandler, ApiResponse, validateQuery, BadRequestError } from '@/lib/api';
import { z } from 'zod';
import { resolveMabaForKP } from '@/lib/kp-group-resolver/resolve-maba-for-kp';
import { prisma } from '@/utils/prisma';

const querySchema = z.object({
  cohortId: z.string().min(1),
  status: z.enum(['ACTIVE', 'FOLLOWED_UP', 'ESCALATED', 'RESOLVED']).optional(),
});

/**
 * GET /api/kp/red-flag
 * Returns red-flag events for all Maba in the KP's group.
 */
export const GET = createApiHandler({
  auth: true,
  handler: async (req, { user, log }) => {
    if (!user.organizationId) {
      throw BadRequestError('User has no organization');
    }

    const { cohortId, status } = validateQuery(req, querySchema);

    log.info('Fetching red-flag events for KP', { kpUserId: user.id, cohortId, status });

    // Get all Maba in this KP's group
    const mabaInfo = await resolveMabaForKP(user.id, cohortId);
    if (!mabaInfo || mabaInfo.mabaUserIds.length === 0) {
      return ApiResponse.success([]);
    }

    const events = await prisma.redFlagEvent.findMany({
      where: {
        organizationId: user.organizationId,
        cohortId,
        subjectUserId: { in: mabaInfo.mabaUserIds },
        ...(status ? { status } : {}),
      },
      orderBy: { triggeredAt: 'desc' },
      include: {
        subject: {
          select: { id: true, fullName: true, displayName: true },
        },
        followUps: {
          orderBy: { followedUpAt: 'desc' },
          take: 1,
          include: {
            actor: {
              select: { id: true, fullName: true },
            },
          },
        },
      },
    });

    log.info('Red-flag events fetched', { kpUserId: user.id, count: events.length });

    return ApiResponse.success(events);
  },
});
