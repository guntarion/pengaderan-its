/**
 * POST /api/pairing/request
 * MABA submits a re-pair request (RE_PAIR_KASUH or KASUH_UNREACHABLE).
 * Validates via canRequestRePair before creating.
 * Roles: MABA
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, BadRequestError } from '@/lib/api';
import { submitPairingRequestSchema } from '@/lib/schemas/kp-group';
import { canRequestRePair } from '@/lib/struktur/request-limits';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';

export const POST = createApiHandler({
  roles: ['MABA'],
  handler: async (req, ctx) => {
    const data = await validateBody(req, submitPairingRequestSchema);
    const user = ctx.user as { id: string; organizationId?: string };

    ctx.log.info('MABA submitting pairing request', { userId: user.id, type: data.type });

    // Verify current Kasuh pair exists and belongs to this MABA
    const currentKasuhPair = await prisma.kasuhPair.findUnique({
      where: { id: data.currentKasuhPairId },
      select: {
        id: true,
        mabaUserId: true,
        kasuhUserId: true,
        cohortId: true,
        organizationId: true,
        status: true,
      },
    });

    if (!currentKasuhPair) {
      throw BadRequestError('Pasangan Kasuh saat ini tidak ditemukan');
    }

    if (currentKasuhPair.mabaUserId !== user.id) {
      throw BadRequestError('Pasangan Kasuh ini bukan milik Anda');
    }

    if (currentKasuhPair.status !== 'ACTIVE') {
      throw BadRequestError('Pasangan Kasuh sudah tidak aktif');
    }

    // Check eligibility (only for RE_PAIR_KASUH, KASUH_UNREACHABLE has no limit)
    if (data.type === 'RE_PAIR_KASUH') {
      const eligibility = await canRequestRePair(user.id, currentKasuhPair.cohortId);
      if (!eligibility.allowed) {
        throw BadRequestError(eligibility.reason ?? 'Pengajuan tidak diizinkan');
      }
    }

    // Check for existing PENDING request of same type
    const existingPending = await prisma.pairingRequest.findFirst({
      where: {
        requesterUserId: user.id,
        cohortId: currentKasuhPair.cohortId,
        type: data.type,
        status: 'PENDING',
      },
    });

    if (existingPending) {
      throw BadRequestError('Anda sudah memiliki pengajuan yang sedang menunggu review');
    }

    const request = await prisma.pairingRequest.create({
      data: {
        organizationId: currentKasuhPair.organizationId,
        cohortId: currentKasuhPair.cohortId,
        requesterUserId: user.id,
        subjectUserId: user.id,
        type: data.type,
        status: 'PENDING',
        optionalNote: data.optionalNote ?? null,
        preferenceHint: data.preferenceHint ?? undefined,
        currentKasuhPairId: currentKasuhPair.id,
      },
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        cohortId: true,
      },
    });

    await logAudit({
      action: AuditAction.PAIRING_REQUEST_CREATE,
      organizationId: currentKasuhPair.organizationId,
      actorUserId: user.id,
      subjectUserId: user.id,
      entityType: 'PairingRequest',
      entityId: request.id,
      afterValue: { type: data.type, currentKasuhPairId: data.currentKasuhPairId },
    });

    ctx.log.info('Pairing request created', { requestId: request.id, type: data.type });

    return ApiResponse.success(request, 201);
  },
});
