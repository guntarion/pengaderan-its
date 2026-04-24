/**
 * POST /api/admin/struktur/pairing-requests/[id]/approve
 * SC approves a pairing request (moves status to APPROVED).
 * Roles: SC, SUPERADMIN
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, validateParams, NotFoundError, BadRequestError } from '@/lib/api';
import { z } from 'zod';
import { approveRequestSchema } from '@/lib/schemas/kp-group';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';

const idSchema = z.object({ id: z.string().min(1) });

export const POST = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { id } = validateParams(ctx.params, idSchema);
    const data = await validateBody(req, approveRequestSchema);
    const user = ctx.user as { id: string };

    const request = await prisma.pairingRequest.findUnique({ where: { id } });
    if (!request) throw NotFoundError('Pairing Request');
    if (request.status !== 'PENDING') {
      throw BadRequestError(`Request sudah berstatus ${request.status}, tidak bisa di-approve`);
    }

    ctx.log.info('Approving pairing request', { requestId: id, requesterId: request.requesterUserId });

    const updated = await prisma.pairingRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        resolvedByUserId: user.id,
        resolvedAt: new Date(),
        resolutionNote: data.note ?? null,
      },
    });

    await logAudit({
      action: AuditAction.PAIRING_REQUEST_APPROVE,
      organizationId: request.organizationId,
      actorUserId: user.id,
      subjectUserId: request.requesterUserId,
      entityType: 'PairingRequest',
      entityId: id,
      afterValue: { status: 'APPROVED', note: data.note },
    });

    return ApiResponse.success({ approved: true, requestId: id, status: updated.status });
  },
});
