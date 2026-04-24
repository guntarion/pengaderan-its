/**
 * src/app/api/safeguard/consequences/[id]/extend-deadline/route.ts
 * NAWASENA M10 — SC extends consequence deadline.
 *
 * POST /api/safeguard/consequences/[id]/extend-deadline
 * Roles: SC
 */

import { prisma } from '@/utils/prisma';
import {
  createApiHandler,
  ApiResponse,
  validateBody,
  validateParams,
  idParamSchema,
  NotFoundError,
  BadRequestError,
} from '@/lib/api';
import { z } from 'zod';
import { AuditAction } from '@prisma/client';

const extendSchema = z.object({
  newDeadline: z.string().datetime('Format tanggal tidak valid (ISO 8601 required)'),
  reason: z.string().min(10, 'Alasan perpanjangan minimal 10 karakter'),
});

export const POST = createApiHandler({
  roles: ['SC'],
  handler: async (req, ctx) => {
    const { id } = validateParams(ctx.params, idParamSchema);
    const body = await validateBody(req, extendSchema);

    const rawUser = ctx.user as unknown as { id: string; organizationId?: string };

    const consequence = await prisma.consequenceLog.findUnique({
      where: { id },
      select: { id: true, organizationId: true, deadline: true, status: true },
    });

    if (!consequence) throw NotFoundError('Consequence');

    const newDeadlineDate = new Date(body.newDeadline);

    // New deadline must be in the future
    if (newDeadlineDate <= new Date()) {
      throw BadRequestError('Deadline baru harus di masa depan.');
    }

    // New deadline must be after current deadline
    if (consequence.deadline && newDeadlineDate <= consequence.deadline) {
      throw BadRequestError('Deadline baru harus lebih lama dari deadline saat ini.');
    }

    ctx.log.info('Extending consequence deadline', {
      consequenceId: id,
      oldDeadline: consequence.deadline,
      newDeadline: newDeadlineDate,
      actorId: rawUser.id,
    });

    const updated = await prisma.consequenceLog.update({
      where: { id },
      data: { deadline: newDeadlineDate },
    });

    // Audit log
    try {
      await prisma.nawasenaAuditLog.create({
        data: {
          action: AuditAction.CONSEQUENCE_DEADLINE_EXTEND,
          actorUserId: rawUser.id,
          organizationId: consequence.organizationId,
          entityType: 'ConsequenceLog',
          entityId: id,
          beforeValue: { deadline: consequence.deadline?.toISOString() },
          afterValue: { deadline: newDeadlineDate.toISOString(), reason: body.reason },
        },
      });
    } catch (err) {
      ctx.log.error('Failed to write extend-deadline audit log', { error: err });
    }

    return ApiResponse.success(updated);
  },
});
