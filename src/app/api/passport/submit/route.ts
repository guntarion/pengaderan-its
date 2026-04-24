/**
 * src/app/api/passport/submit/route.ts
 * NAWASENA M05 — POST: Submit a passport entry.
 *
 * Auth: authenticated users (Maba role expected)
 * Body: { itemId, evidenceType, s3Key?, evidenceUrl?, qrSessionId?, clientIdempotencyKey, previousEntryId?, verifierId?, captionNote? }
 */

import { prisma } from '@/utils/prisma';
import {
  createApiHandler,
  ApiResponse,
  validateBody,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '@/lib/api';
import { submitPassportEntry } from '@/lib/passport/submit.service';
import { EvidenceType } from '@prisma/client';
import { z } from 'zod';

const submitSchema = z.object({
  itemId: z.string().min(1),
  evidenceType: z.nativeEnum(EvidenceType),
  s3Key: z.string().optional(),
  evidenceUrl: z.string().url().optional(),
  qrSessionId: z.string().optional(),
  clientIdempotencyKey: z.string().optional(),
  previousEntryId: z.string().optional(),
  verifierId: z.string().optional(),
  captionNote: z.string().max(500).optional(),
});

export const POST = createApiHandler({
  auth: true,
  handler: async (req, { user, log }) => {
    const body = await validateBody(req, submitSchema);

    // Ensure user has required context
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true, currentCohortId: true, role: true },
    });
    if (!fullUser) throw NotFoundError('User');
    if (!fullUser.currentCohortId) throw BadRequestError('User has no active cohort');

    // ATTENDANCE and QUIZ_SCORE are not yet supported
    if (body.evidenceType === EvidenceType.ATTENDANCE) {
      throw BadRequestError('ATTENDANCE evidence type requires M08 (coming soon)');
    }

    log.info('Submitting passport entry', {
      userId: user.id,
      itemId: body.itemId,
      evidenceType: body.evidenceType,
    });

    const result = await submitPassportEntry({
      userId: user.id,
      organizationId: fullUser.organizationId,
      cohortId: fullUser.currentCohortId,
      itemId: body.itemId,
      evidenceType: body.evidenceType,
      s3Key: body.s3Key,
      evidenceUrl: body.evidenceUrl,
      qrSessionId: body.qrSessionId,
      clientIdempotencyKey: body.clientIdempotencyKey,
      previousEntryId: body.previousEntryId,
      verifierId: body.verifierId,
      captionNote: body.captionNote,
      request: req,
    });

    log.info('Passport entry submitted', {
      entryId: result.entryId,
      status: result.status,
      isIdempotent: result.isIdempotent,
    });

    return ApiResponse.success(result, result.isIdempotent ? 200 : 201);
  },
});
