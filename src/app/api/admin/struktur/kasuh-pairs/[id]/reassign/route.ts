/**
 * PATCH /api/admin/struktur/kasuh-pairs/[id]/reassign
 * SC manual reassign Kasuh to a different MABA/Kasuh.
 * Roles: SC, SUPERADMIN
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, validateParams, NotFoundError, BadRequestError } from '@/lib/api';
import { z } from 'zod';
import { reassignKasuhSchema } from '@/lib/schemas/kp-group';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';

const idSchema = z.object({ id: z.string().min(1) });

export const PATCH = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { id } = validateParams(ctx.params, idSchema);
    const data = await validateBody(req, reassignKasuhSchema);
    const user = ctx.user as { id: string };

    const pair = await prisma.kasuhPair.findUnique({ where: { id } });
    if (!pair) throw NotFoundError('Kasuh Pair');

    // Verify new kasuh capacity
    const newKasuhCount = await prisma.kasuhPair.count({
      where: { kasuhUserId: data.newKasuhUserId, cohortId: pair.cohortId, status: 'ACTIVE' },
    });
    if (newKasuhCount >= 2) {
      throw BadRequestError('Kasuh baru sudah memiliki 2 adik asuh aktif');
    }

    ctx.log.info('Reassigning Kasuh pair', { pairId: id, newKasuhUserId: data.newKasuhUserId });

    await prisma.$transaction([
      // Archive old pair
      prisma.kasuhPair.update({
        where: { id },
        data: {
          status: 'REASSIGNED',
          archivedAt: new Date(),
          endReason: data.reason,
        },
      }),
      // Create new pair
      prisma.kasuhPair.create({
        data: {
          organizationId: pair.organizationId,
          cohortId: pair.cohortId,
          mabaUserId: pair.mabaUserId,
          kasuhUserId: data.newKasuhUserId,
          matchScore: 0.0,
          matchReasons: ['manual-reassign'],
          algorithmVersion: 'manual',
          previousPairId: id,
          createdBy: user.id,
        },
      }),
    ]);

    await logAudit({
      action: AuditAction.KASUH_PAIR_REASSIGN,
      organizationId: pair.organizationId,
      actorUserId: user.id,
      subjectUserId: pair.mabaUserId,
      entityType: 'KasuhPair',
      entityId: id,
      reason: data.reason,
      afterValue: { newKasuhUserId: data.newKasuhUserId, oldKasuhUserId: pair.kasuhUserId },
    });

    return ApiResponse.success({ reassigned: true });
  },
});
