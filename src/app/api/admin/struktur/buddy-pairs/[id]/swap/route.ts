/**
 * PATCH /api/admin/struktur/buddy-pairs/[id]/swap
 * Manual swap of one member between two buddy pairs.
 * Roles: SC, OC, SUPERADMIN
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, validateParams, NotFoundError, BadRequestError } from '@/lib/api';
import { z } from 'zod';
import { swapBuddyPairSchema } from '@/lib/schemas/kp-group';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';

const idSchema = z.object({ id: z.string().min(1) });

export const PATCH = createApiHandler({
  roles: ['SC', 'OC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { id } = validateParams(ctx.params, idSchema);
    const data = await validateBody(req, swapBuddyPairSchema);
    const user = ctx.user as { id: string };

    const pairA = await prisma.buddyPair.findUnique({
      where: { id },
      include: { members: true },
    });
    if (!pairA) throw NotFoundError('Buddy Pair A');

    const pairB = await prisma.buddyPair.findUnique({
      where: { id: data.otherPairId },
      include: { members: true },
    });
    if (!pairB) throw NotFoundError('Buddy Pair B');

    if (pairA.cohortId !== pairB.cohortId) {
      throw BadRequestError('Kedua pasangan harus dari cohort yang sama');
    }

    // Verify swapUserIds are in respective pairs
    const memberA = pairA.members.find((m) => m.userId === data.swapUserIdA);
    const memberB = pairB.members.find((m) => m.userId === data.swapUserIdB);

    if (!memberA) throw BadRequestError(`User ${data.swapUserIdA} tidak ada di pair ${id}`);
    if (!memberB) throw BadRequestError(`User ${data.swapUserIdB} tidak ada di pair ${data.otherPairId}`);

    ctx.log.info('Swapping buddy pair members', {
      pairAId: id,
      pairBId: data.otherPairId,
      swapA: data.swapUserIdA,
      swapB: data.swapUserIdB,
    });

    await prisma.$transaction([
      // Move userA to pairB
      prisma.buddyPairMember.update({
        where: { id: memberA.id },
        data: { buddyPairId: data.otherPairId },
      }),
      // Move userB to pairA
      prisma.buddyPairMember.update({
        where: { id: memberB.id },
        data: { buddyPairId: id },
      }),
    ]);

    await logAudit({
      action: AuditAction.BUDDY_PAIR_SWAP,
      organizationId: pairA.organizationId,
      actorUserId: user.id,
      entityType: 'BuddyPair',
      entityId: id,
      afterValue: {
        pairAId: id,
        pairBId: data.otherPairId,
        swapUserIdA: data.swapUserIdA,
        swapUserIdB: data.swapUserIdB,
        reason: data.reason,
      },
    });

    return ApiResponse.success({ swapped: true });
  },
});
