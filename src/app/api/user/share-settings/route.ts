/**
 * src/app/api/user/share-settings/route.ts
 * NAWASENA M07 — Update global share defaults for current user.
 *
 * PATCH /api/user/share-settings
 * Auth required. Updates timeCapsuleShareDefault + lifeMapShareDefault.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { auditLog } from '@/services/audit-log.service';
import { z } from 'zod';

const bodySchema = z.object({
  timeCapsuleShareDefault: z.boolean().optional(),
  lifeMapShareDefault: z.boolean().optional(),
});

export const PATCH = createApiHandler({
  auth: true,
  handler: async (req, { user, log: ctx }) => {
    const data = await validateBody(req, bodySchema);

    ctx.info('Updating share settings', { userId: user.id, data });

    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { timeCapsuleShareDefault: true, lifeMapShareDefault: true },
    });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(data.timeCapsuleShareDefault !== undefined && {
          timeCapsuleShareDefault: data.timeCapsuleShareDefault,
        }),
        ...(data.lifeMapShareDefault !== undefined && {
          lifeMapShareDefault: data.lifeMapShareDefault,
        }),
      },
      select: { timeCapsuleShareDefault: true, lifeMapShareDefault: true },
    });

    await auditLog.record({
      userId: user.id,
      action: 'SHARE_GLOBAL_SETTING_CHANGE' as Parameters<typeof auditLog.record>[0]['action'],
      resource: 'User',
      resourceId: user.id,
      oldValue: current,
      newValue: updated,
      request: req,
    });

    ctx.info('Share settings updated', { userId: user.id });

    return ApiResponse.success(updated);
  },
});

export const GET = createApiHandler({
  auth: true,
  handler: async (_req, { user }) => {
    const settings = await prisma.user.findUnique({
      where: { id: user.id },
      select: { timeCapsuleShareDefault: true, lifeMapShareDefault: true },
    });

    return ApiResponse.success(settings ?? { timeCapsuleShareDefault: false, lifeMapShareDefault: false });
  },
});
