/**
 * src/app/api/life-map/[goalId]/share/route.ts
 * NAWASENA M07 — Toggle sharedWithKasuh for a Life Map goal.
 *
 * PATCH /api/life-map/:goalId/share
 * Auth required. Owner only.
 * Triggers LIFE_MAP_UPDATE_SHARED notification when toggled ON.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, validateParams } from '@/lib/api';
import { ForbiddenError, NotFoundError } from '@/lib/api';
import { auditLog } from '@/services/audit-log.service';
import { invalidatePortfolio } from '@/lib/portfolio/cache';
import { sendNotification } from '@/lib/notifications/send';
import { z } from 'zod';

const paramsSchema = z.object({ goalId: z.string().cuid() });
const bodySchema = z.object({ sharedWithKasuh: z.boolean() });

export const PATCH = createApiHandler({
  auth: true,
  handler: async (req, { user, params, log: ctx }) => {
    const { goalId } = validateParams(params, paramsSchema);
    const { sharedWithKasuh } = await validateBody(req, bodySchema);

    ctx.info('Toggling Life Map share', { goalId, userId: user.id, sharedWithKasuh });

    const goal = await prisma.lifeMap.findUnique({
      where: { id: goalId },
      select: { id: true, userId: true, cohortId: true, sharedWithKasuh: true, area: true },
    });

    if (!goal) throw NotFoundError('Goal tidak ditemukan');
    if (goal.userId !== user.id) throw ForbiddenError('Akses ditolak');

    const oldValue = goal.sharedWithKasuh;

    const updated = await prisma.lifeMap.update({
      where: { id: goalId },
      data: { sharedWithKasuh },
    });

    // Audit log
    await auditLog.record({
      userId: user.id,
      action: 'LIFE_MAP_SHARE_TOGGLE' as Parameters<typeof auditLog.record>[0]['action'],
      resource: 'LifeMap',
      resourceId: goalId,
      oldValue: { sharedWithKasuh: oldValue },
      newValue: { sharedWithKasuh },
      request: req,
    });

    // Invalidate portfolio cache
    void invalidatePortfolio(user.id, goal.cohortId);

    // Notify Kasuh when toggled ON
    if (sharedWithKasuh && !oldValue) {
      const kasuhPair = await prisma.kasuhPair.findFirst({
        where: {
          mabaUserId: user.id,
          cohortId: goal.cohortId,
          status: 'ACTIVE',
        },
        select: { kasuhUserId: true },
      });

      if (kasuhPair) {
        void sendNotification({
          userId: kasuhPair.kasuhUserId,
          templateKey: 'LIFE_MAP_UPDATE_SHARED',
          payload: {
            mabaId: user.id,
            goalId,
            area: goal.area,
          },
          category: 'NORMAL',
        }).catch((err) => {
          ctx.error('Failed to send share notification to Kasuh', {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }
    }

    ctx.info('Share toggle complete', { goalId, newValue: sharedWithKasuh });

    return ApiResponse.success({ sharedWithKasuh: updated.sharedWithKasuh });
  },
});
