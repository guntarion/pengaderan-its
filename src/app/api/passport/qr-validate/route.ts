/**
 * src/app/api/passport/qr-validate/route.ts
 * NAWASENA M05 — POST: Validate scanned QR and create auto-VERIFIED entry.
 *
 * Auth: authenticated user (Maba)
 * Body: { itemId, sessionId, sig }
 */

import { prisma } from '@/utils/prisma';
import {
  createApiHandler,
  ApiResponse,
  validateBody,
  NotFoundError,
  BadRequestError,
} from '@/lib/api';
import { validateQrSession } from '@/lib/passport/qr-session.service';
import { z } from 'zod';

const qrValidateSchema = z.object({
  itemId: z.string().min(1),
  sessionId: z.string().min(1),
  sig: z.string().min(1),
});

export const POST = createApiHandler({
  auth: true,
  handler: async (req, { user, log }) => {
    const body = await validateBody(req, qrValidateSchema);

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true, currentCohortId: true },
    });
    if (!fullUser) throw NotFoundError('User');
    if (!fullUser.currentCohortId) throw BadRequestError('User has no active cohort');

    log.info('QR validate request', {
      userId: user.id,
      itemId: body.itemId,
      sessionId: body.sessionId,
    });

    const result = await validateQrSession({
      itemId: body.itemId,
      sessionId: body.sessionId,
      sig: body.sig,
      userId: user.id,
      organizationId: fullUser.organizationId,
      cohortId: fullUser.currentCohortId,
      request: req,
    });

    if (!result.valid) {
      log.info('QR validation failed', { reason: result.reason, userId: user.id });
      return ApiResponse.success({ valid: false, reason: result.reason });
    }

    log.info('QR scan validated successfully', { entryId: result.entryId });
    return ApiResponse.success({ valid: true, entryId: result.entryId });
  },
});
