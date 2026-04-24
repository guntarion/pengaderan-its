/**
 * POST /api/admin/event/instances/[id]/trigger-nps
 * SC manual NPS trigger recovery.
 * Roles: SC, SUPERADMIN.
 */

import { createApiHandler, ApiResponse, validateParams, validateBody } from '@/lib/api';
import { triggerNPSForInstance } from '@/lib/event/services/nps-trigger';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({ reason: z.string().optional() });

export const POST = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const { id: instanceId } = validateParams(params, paramsSchema);
    const { reason } = await validateBody(req, bodySchema);

    log.info('SC manual NPS trigger', { instanceId, actorUserId: user.id, reason });

    const result = await triggerNPSForInstance(instanceId);

    // Audit manual trigger
    const instance = await prisma.kegiatanInstance.findUnique({
      where: { id: instanceId },
      select: { organizationId: true },
    });

    await prisma.nawasenaAuditLog.create({
      data: {
        action: 'NPS_TRIGGER_MANUAL',
        actorUserId: user.id,
        entityType: 'KegiatanInstance',
        entityId: instanceId,
        organizationId: instance?.organizationId ?? null,
        afterValue: { scheduled: result.scheduled, skipped: result.skipped },
        reason: reason ?? 'Manual recovery trigger',
        metadata: { skipReason: result.skipReason },
      },
    });

    return ApiResponse.success(result);
  },
});
