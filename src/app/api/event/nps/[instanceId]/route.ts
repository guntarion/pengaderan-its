/**
 * POST /api/event/nps/[instanceId]
 * Submit NPS for an instance.
 * Auth required. Guards: must be HADIR, instance DONE, within 7-day window, no duplicate.
 */

import { createApiHandler, ApiResponse, validateBody, validateParams, ConflictError, ForbiddenError, NotFoundError } from '@/lib/api';
import { submitNPS } from '@/lib/event/services/nps.service';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';

const paramsSchema = z.object({ instanceId: z.string().min(1) });

const bodySchema = z.object({
  npsScore: z.number().int().min(0).max(10),
  feltSafe: z.number().int().min(1).max(5),
  meaningful: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export const POST = createApiHandler({
  auth: true,
  handler: async (req, { user, params, log }) => {
    const { instanceId } = validateParams(params, paramsSchema);
    const body = await validateBody(req, bodySchema);

    log.info('NPS submit', { userId: user.id, instanceId });

    // Get user's organizationId
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true },
    });

    if (!dbUser) {
      throw NotFoundError('User not found');
    }

    try {
      const nps = await submitNPS(user.id, instanceId, dbUser.organizationId, body);
      return ApiResponse.success({ id: nps.id, submittedAt: nps.recordedAt }, 201);
    } catch (err) {
      const message = (err as Error).message ?? '';
      if (message.startsWith('CONFLICT:')) {
        // Audit duplicate attempt
        await prisma.nawasenaAuditLog.create({
          data: {
            action: 'EVENT_NPS_SUBMIT_REJECTED_DUPLICATE',
            actorUserId: user.id,
            entityType: 'EventNPS',
            entityId: instanceId,
            organizationId: dbUser.organizationId,
            metadata: { instanceId },
          },
        });
        throw ConflictError('Feedback sudah terkirim sebelumnya.');
      }
      if (message.startsWith('FORBIDDEN:')) {
        // Audit window/attendance rejection
        await prisma.nawasenaAuditLog.create({
          data: {
            action: 'EVENT_NPS_SUBMIT_REJECTED_WINDOW',
            actorUserId: user.id,
            entityType: 'EventNPS',
            entityId: instanceId,
            organizationId: dbUser.organizationId,
            metadata: { reason: message, instanceId },
          },
        });
        throw ForbiddenError(message.replace('FORBIDDEN: ', ''));
      }
      throw err;
    }
  },
});
