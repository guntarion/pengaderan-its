/**
 * src/app/api/time-capsule/[entryId]/share/route.ts
 * NAWASENA M07 — Toggle sharedWithKasuh for a Time Capsule entry.
 *
 * PATCH /api/time-capsule/:entryId/share
 * Auth required. Owner only.
 * Triggers TIME_CAPSULE_NEW_SHARED notification to active Kasuh when toggled ON.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, validateParams } from '@/lib/api';
import { ForbiddenError, NotFoundError } from '@/lib/api';
import { auditLog } from '@/services/audit-log.service';
import { invalidatePortfolio } from '@/lib/portfolio/cache';
import { sendNotification } from '@/lib/notifications/send';
import { z } from 'zod';

const paramsSchema = z.object({ entryId: z.string().cuid() });
const bodySchema = z.object({ sharedWithKasuh: z.boolean() });

export const PATCH = createApiHandler({
  auth: true,
  handler: async (req, { user, params, log: ctx }) => {
    const { entryId } = validateParams(params, paramsSchema);
    const { sharedWithKasuh } = await validateBody(req, bodySchema);

    ctx.info('Toggling Time Capsule share', { entryId, userId: user.id, sharedWithKasuh });

    const entry = await prisma.timeCapsuleEntry.findUnique({
      where: { id: entryId },
      select: { id: true, userId: true, cohortId: true, sharedWithKasuh: true, title: true },
    });

    if (!entry) throw NotFoundError('Catatan tidak ditemukan');
    if (entry.userId !== user.id) throw ForbiddenError('Akses ditolak');

    const oldValue = entry.sharedWithKasuh;

    const updated = await prisma.timeCapsuleEntry.update({
      where: { id: entryId },
      data: { sharedWithKasuh },
    });

    // Audit log
    await auditLog.record({
      userId: user.id,
      action: 'TIME_CAPSULE_SHARE_TOGGLE' as Parameters<typeof auditLog.record>[0]['action'],
      resource: 'TimeCapsuleEntry',
      resourceId: entryId,
      oldValue: { sharedWithKasuh: oldValue },
      newValue: { sharedWithKasuh },
      request: req,
    });

    // Invalidate portfolio cache
    void invalidatePortfolio(user.id, entry.cohortId);

    // Notify Kasuh when toggled ON
    if (sharedWithKasuh && !oldValue) {
      const kasuhPair = await prisma.kasuhPair.findFirst({
        where: {
          mabaUserId: user.id,
          cohortId: entry.cohortId,
          status: 'ACTIVE',
        },
        select: { kasuhUserId: true },
      });

      if (kasuhPair) {
        void sendNotification({
          userId: kasuhPair.kasuhUserId,
          templateKey: 'TIME_CAPSULE_NEW_SHARED',
          payload: {
            mabaId: user.id,
            entryId,
            entryTitle: entry.title ?? 'Tanpa Judul',
          },
          category: 'NORMAL',
        }).catch((err) => {
          ctx.error('Failed to send share notification to Kasuh', {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }
    }

    ctx.info('Share toggle complete', { entryId, newValue: sharedWithKasuh });

    return ApiResponse.success({ sharedWithKasuh: updated.sharedWithKasuh });
  },
});
