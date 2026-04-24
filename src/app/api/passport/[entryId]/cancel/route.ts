/**
 * src/app/api/passport/[entryId]/cancel/route.ts
 * NAWASENA M05 — POST: Self-cancel a pending entry (Maba only).
 */

import {
  createApiHandler,
  ApiResponse,
  validateParams,
  validateBody,
  idParamSchema,
  ForbiddenError,
} from '@/lib/api';
import { cancelPassportEntry } from '@/lib/passport/submit.service';
import { z } from 'zod';

const cancelSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const POST = createApiHandler({
  auth: true,
  handler: async (req, { user, params, log }) => {
    const { id: entryId } = validateParams(params, idParamSchema);
    const body = await validateBody(req, cancelSchema);

    log.info('Cancelling passport entry', { entryId, userId: user.id });

    await cancelPassportEntry(entryId, user.id, body.reason, req);

    log.info('Passport entry cancelled', { entryId });
    return ApiResponse.success({ cancelled: true });
  },
});
