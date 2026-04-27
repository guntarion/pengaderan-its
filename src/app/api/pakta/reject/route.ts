/**
 * POST /api/pakta/reject
 * Reject a pakta version with a mandatory reason.
 *
 * Body: { versionId, reason }
 * Reason must be at least 20 characters.
 *
 * On rejection:
 *   - Creates PaktaRejection record
 *   - Updates User.[type]Status = REJECTED
 *   - Marks escalatedToSC = true (SC team reviews)
 */

import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { BadRequestError, NotFoundError } from '@/lib/api/errors';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';
import type { PaktaType, UserPaktaStatus } from '@prisma/client';

const rejectSchema = z.object({
  versionId: z.string().min(1),
  reason: z.string().min(20, 'Alasan penolakan minimal 20 karakter'),
});

const PAKTA_TYPE_TO_USER_FIELD: Record<PaktaType, string> = {
  PAKTA_PANITIA: 'paktaPanitiaStatus',
  SOCIAL_CONTRACT_MABA: 'socialContractStatus',
  PAKTA_PENGADER_2027: 'paktaPengader2027Status',
};

export const POST = createApiHandler({
  auth: true,
  handler: async (req, { user, log }) => {
    const body = await validateBody(req, rejectSchema);
    const { versionId, reason } = body;

    // Fetch PaktaVersion
    const paktaVersion = await prisma.paktaVersion.findUnique({
      where: { id: versionId },
      select: {
        id: true,
        type: true,
        status: true,
        organizationId: true,
      },
    });

    if (!paktaVersion) {
      throw NotFoundError('PaktaVersion');
    }

    if (paktaVersion.status !== 'PUBLISHED') {
      throw BadRequestError('Dokumen pakta belum diterbitkan');
    }

    // Verify org scope
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, organizationId: true },
    });

    // DIGITAL pakta (organizationId IS NULL) is institusi-wide — any org's user can reject
    // ETIK pakta (organizationId NOT NULL) is org-scoped — only same-org users
    if (
      !userRecord ||
      (paktaVersion.organizationId !== null &&
        userRecord.organizationId !== paktaVersion.organizationId)
    ) {
      throw BadRequestError('Anda tidak berhak menolak pakta ini');
    }

    const userFieldKey = PAKTA_TYPE_TO_USER_FIELD[paktaVersion.type];

    await prisma.$transaction(async (tx) => {
      // Create rejection record
      // PaktaRejection.organizationId is always the rejector's org (NOT NULL)
      // even for DIGITAL pakta (where PaktaVersion.organizationId IS NULL)
      await tx.paktaRejection.create({
        data: {
          organizationId: userRecord.organizationId,
          userId: user.id,
          paktaVersionId: versionId,
          type: paktaVersion.type,
          reason,
          escalatedToSC: true,
          escalatedAt: new Date(),
        },
      });

      // Update User pakta status to REJECTED
      await tx.user.update({
        where: { id: user.id },
        data: {
          [userFieldKey]: 'REJECTED' as UserPaktaStatus,
        },
      });
    });

    log.info('Pakta rejected', {
      userId: user.id,
      versionId,
      type: paktaVersion.type,
      reasonLength: reason.length,
    });

    return ApiResponse.success({
      rejected: true,
      type: paktaVersion.type,
      message:
        'Penolakan Anda telah dicatat. Tim SC akan menindaklanjuti.',
    });
  },
});
