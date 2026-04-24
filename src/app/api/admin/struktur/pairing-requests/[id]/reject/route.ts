/**
 * POST /api/admin/struktur/pairing-requests/[id]/reject
 * SC rejects a pairing request. Reason is mandatory.
 * Roles: SC, SUPERADMIN
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, validateParams, NotFoundError, BadRequestError } from '@/lib/api';
import { z } from 'zod';
import { rejectRequestSchema } from '@/lib/schemas/kp-group';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';

const idSchema = z.object({ id: z.string().min(1) });

export const POST = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { id } = validateParams(ctx.params, idSchema);
    const data = await validateBody(req, rejectRequestSchema);
    const user = ctx.user as { id: string };

    const request = await prisma.pairingRequest.findUnique({ where: { id } });
    if (!request) throw NotFoundError('Pairing Request');
    if (request.status !== 'PENDING' && request.status !== 'APPROVED') {
      throw BadRequestError(`Request berstatus ${request.status}, tidak bisa di-reject`);
    }

    ctx.log.info('Rejecting pairing request', { requestId: id, reason: data.resolutionNote });

    const updated = await prisma.pairingRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        resolvedByUserId: user.id,
        resolvedAt: new Date(),
        resolutionNote: data.resolutionNote,
      },
    });

    await logAudit({
      action: AuditAction.PAIRING_REQUEST_REJECT,
      organizationId: request.organizationId,
      actorUserId: user.id,
      subjectUserId: request.requesterUserId,
      entityType: 'PairingRequest',
      entityId: id,
      afterValue: { status: 'REJECTED', resolutionNote: data.resolutionNote },
      reason: data.resolutionNote,
    });

    return ApiResponse.success({ rejected: true, requestId: id, status: updated.status });
  },
});
