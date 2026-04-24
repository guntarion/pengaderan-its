/**
 * src/app/api/portfolio/route.ts
 * NAWASENA M07 — Portfolio view API.
 *
 * GET /api/portfolio?userId=... (optional, defaults to self)
 * Auth required.
 * Kasuh can view their adik asuh's portfolio (double gate check).
 * Admins can view any portfolio.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateQuery } from '@/lib/api';
import { ForbiddenError, NotFoundError } from '@/lib/api';
import { getPortfolio } from '@/lib/portfolio/composer';
import { resolveKasuhForMaba } from '@/lib/kasuh-share-resolver/resolve-kasuh-for-maba';
import { auditLog } from '@/services/audit-log.service';
import { z } from 'zod';

const querySchema = z.object({
  userId: z.string().cuid().optional(),
});

export const GET = createApiHandler({
  auth: true,
  handler: async (req, { user, log: ctx }) => {
    const query = validateQuery(req, querySchema);
    const targetUserId = query.userId ?? user.id;

    const isSelf = targetUserId === user.id;

    ctx.info('Portfolio view requested', { requesterId: user.id, targetUserId, isSelf });

    // If requesting another user's portfolio, verify access
    if (!isSelf) {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, currentCohortId: true },
      });

      if (!targetUser) throw NotFoundError('User tidak ditemukan');

      const pair = await resolveKasuhForMaba(
        targetUserId,
        { id: user.id, role: user.role },
        targetUser.currentCohortId ?? undefined,
      );

      if (!pair) {
        throw ForbiddenError('Akses ditolak: bukan Kakak Kasuh aktif atau admin');
      }

      // Audit log for Kasuh viewing portfolio
      await auditLog.record({
        userId: user.id,
        action: 'PORTFOLIO_VIEW_ACCESS' as Parameters<typeof auditLog.record>[0]['action'],
        resource: 'Portfolio',
        resourceId: targetUserId,
        newValue: { mabaId: targetUserId },
        request: req,
      });
    }

    // Get target user's cohort
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { currentCohortId: true },
    });

    if (!targetUser?.currentCohortId) {
      return ApiResponse.success({
        userId: targetUserId,
        cohortId: null,
        timeCapsule: { totalEntries: 0, sharedEntries: 0, recentEntries: [] },
        lifeMap: { totalGoals: 0, activeGoals: 0, achievedGoals: 0, byArea: [] },
        passport: null,
      });
    }

    const portfolio = await getPortfolio(targetUserId, targetUser.currentCohortId);

    ctx.info('Portfolio fetched', { targetUserId });

    return ApiResponse.success(portfolio);
  },
});
