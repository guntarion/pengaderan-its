/**
 * POST /api/admin/struktur/pairing-requests/[id]/fulfill
 * SC fulfills an approved pairing request by assigning a new Kasuh.
 * Archives the old KasuhPair, creates a new one, and marks request FULFILLED.
 * Roles: SC, SUPERADMIN
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, validateParams, NotFoundError, BadRequestError } from '@/lib/api';
import { z } from 'zod';
import { fulfillRequestSchema } from '@/lib/schemas/kp-group';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';

const idSchema = z.object({ id: z.string().min(1) });

export const POST = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { id } = validateParams(ctx.params, idSchema);
    const data = await validateBody(req, fulfillRequestSchema);
    const user = ctx.user as { id: string };

    const request = await prisma.pairingRequest.findUnique({
      where: { id },
      include: {
        currentKasuhPair: true,
      },
    });
    if (!request) throw NotFoundError('Pairing Request');
    if (request.status !== 'APPROVED') {
      throw BadRequestError(`Request harus berstatus APPROVED sebelum di-fulfill, sekarang: ${request.status}`);
    }
    if (!request.currentKasuhPair) {
      throw BadRequestError('Tidak ada KasuhPair yang terkait dengan request ini');
    }

    const oldPair = request.currentKasuhPair;

    // Verify new Kasuh capacity
    const newKasuhCount = await prisma.kasuhPair.count({
      where: {
        kasuhUserId: data.newKasuhUserId,
        cohortId: oldPair.cohortId,
        status: 'ACTIVE',
      },
    });
    if (newKasuhCount >= 2) {
      throw BadRequestError('Kasuh baru sudah memiliki 2 adik asuh aktif');
    }

    // Ensure new Kasuh is different
    if (data.newKasuhUserId === oldPair.kasuhUserId) {
      throw BadRequestError('Kasuh baru harus berbeda dari Kasuh lama');
    }

    ctx.log.info('Fulfilling pairing request', {
      requestId: id,
      oldKasuhPairId: oldPair.id,
      newKasuhUserId: data.newKasuhUserId,
    });

    let newPairId: string;

    await prisma.$transaction(async (tx) => {
      // Archive old pair
      await tx.kasuhPair.update({
        where: { id: oldPair.id },
        data: {
          status: 'REASSIGNED',
          archivedAt: new Date(),
          endReason: 're-pair request',
          reassignedFromRequestId: id,
        },
      });

      // Create new pair
      const newPair = await tx.kasuhPair.create({
        data: {
          organizationId: oldPair.organizationId,
          cohortId: oldPair.cohortId,
          mabaUserId: oldPair.mabaUserId,
          kasuhUserId: data.newKasuhUserId,
          matchScore: 0.0,
          matchReasons: ['re-pair-request'],
          algorithmVersion: 'manual',
          previousPairId: oldPair.id,
          reassignedFromRequestId: id,
          createdBy: user.id,
        },
      });
      newPairId = newPair.id;

      // Mark request as fulfilled
      await tx.pairingRequest.update({
        where: { id },
        data: {
          status: 'FULFILLED',
          resolvedByUserId: user.id,
          resolvedAt: new Date(),
          resolutionNote: data.note ?? null,
          fulfilledKasuhPairId: newPair.id,
        },
      });
    });

    await logAudit({
      action: AuditAction.PAIRING_REQUEST_FULFILL,
      organizationId: request.organizationId,
      actorUserId: user.id,
      subjectUserId: request.requesterUserId,
      entityType: 'PairingRequest',
      entityId: id,
      beforeValue: { oldKasuhPairId: oldPair.id, oldKasuhUserId: oldPair.kasuhUserId },
      afterValue: { newKasuhUserId: data.newKasuhUserId, newKasuhPairId: newPairId! },
    });

    return ApiResponse.success({ fulfilled: true, requestId: id, newKasuhPairId: newPairId! });
  },
});
