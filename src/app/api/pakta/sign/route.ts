/**
 * POST /api/pakta/sign
 * Sign a pakta version after passing the quiz.
 *
 * Security:
 *   - Verifies quizScore >= passingScore
 *   - Verifies paktaVersion is PUBLISHED and belongs to user's org
 *   - Creates PaktaSignature (idempotent: duplicate triggers CONFLICT)
 *   - Updates User.[type]Status = SIGNED
 *   - IP and UserAgent are captured for evidentiary record
 *
 * Body: { versionId, quizScore }
 */

import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { BadRequestError, NotFoundError, ConflictError } from '@/lib/api/errors';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';
import type { PaktaType, UserPaktaStatus } from '@prisma/client';

const signSchema = z.object({
  versionId: z.string().min(1),
  quizScore: z.number().int().min(0).max(100),
});

// Map PaktaType → User field
const PAKTA_TYPE_TO_USER_FIELD: Record<PaktaType, string> = {
  PAKTA_PANITIA: 'paktaPanitiaStatus',
  SOCIAL_CONTRACT_MABA: 'socialContractStatus',
  PAKTA_PENGADER_2027: 'paktaPengader2027Status',
};

export const POST = createApiHandler({
  auth: true,
  handler: async (req, { user, log }) => {
    const body = await validateBody(req, signSchema);
    const { versionId, quizScore } = body;

    // Extract request metadata for audit
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // 1. Fetch PaktaVersion
    const paktaVersion = await prisma.paktaVersion.findUnique({
      where: { id: versionId },
      select: {
        id: true,
        type: true,
        status: true,
        organizationId: true,
        passingScore: true,
        versionNumber: true,
      },
    });

    if (!paktaVersion) {
      throw NotFoundError('PaktaVersion');
    }

    if (paktaVersion.status !== 'PUBLISHED') {
      throw BadRequestError('Dokumen pakta belum diterbitkan');
    }

    // 2. Verify quiz score
    if (quizScore < paktaVersion.passingScore) {
      throw BadRequestError(
        `Skor quiz tidak memenuhi syarat: ${quizScore} < ${paktaVersion.passingScore}`
      );
    }

    // 3. Verify user belongs to the same org
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, organizationId: true, currentCohortId: true },
    });

    if (!userRecord) {
      throw NotFoundError('User');
    }

    // DIGITAL pakta (organizationId IS NULL) is institusi-wide — any org's user can sign
    // ETIK pakta (organizationId NOT NULL) is org-scoped — only same-org users can sign
    if (
      paktaVersion.organizationId !== null &&
      userRecord.organizationId !== paktaVersion.organizationId
    ) {
      throw BadRequestError('Anda tidak berhak menandatangani pakta ini');
    }

    // 4. Check for existing signature (idempotency)
    const existing = await prisma.paktaSignature.findUnique({
      where: {
        userId_paktaVersionId: {
          userId: user.id,
          paktaVersionId: versionId,
        },
      },
    });

    if (existing) {
      throw ConflictError('Anda sudah menandatangani versi pakta ini');
    }

    // 5. Create PaktaSignature + update User status (in transaction)
    const userFieldKey = PAKTA_TYPE_TO_USER_FIELD[paktaVersion.type];

    await prisma.$transaction(async (tx) => {
      // Create signature
      // PaktaSignature.organizationId is always the signer's org (NOT NULL)
      // even for DIGITAL pakta (where PaktaVersion.organizationId IS NULL)
      await tx.paktaSignature.create({
        data: {
          organizationId: userRecord.organizationId,
          userId: user.id,
          paktaVersionId: versionId,
          type: paktaVersion.type,
          cohortId: userRecord.currentCohortId,
          ipAddress,
          userAgent,
          quizScore,
          status: 'ACTIVE',
        },
      });

      // Update User pakta status
      await tx.user.update({
        where: { id: user.id },
        data: {
          [userFieldKey]: 'SIGNED' as UserPaktaStatus,
          // If was PENDING_RESIGN, this clears it
        },
      });
    });

    log.info('Pakta signed', {
      userId: user.id,
      versionId,
      type: paktaVersion.type,
      versionNumber: paktaVersion.versionNumber,
      quizScore,
    });

    return ApiResponse.success({
      signed: true,
      type: paktaVersion.type,
      versionNumber: paktaVersion.versionNumber,
    });
  },
});
