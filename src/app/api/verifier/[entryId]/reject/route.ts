/**
 * src/app/api/verifier/[entryId]/reject/route.ts
 * NAWASENA M05 — POST: Reject a passport entry (reason min 10 chars).
 */

import {
  createApiHandler,
  ApiResponse,
  validateParams,
  validateBody,
  idParamSchema,
  BadRequestError,
} from '@/lib/api';
import { reject } from '@/lib/passport/verifier.service';
import { z } from 'zod';

const rejectSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(2000),
  clientIdempotencyKey: z.string().optional(),
});

export const POST = createApiHandler({
  roles: ['KP', 'KASUH', 'DOSEN_WALI', 'SC', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const { id: entryId } = validateParams(params, idParamSchema);
    const body = await validateBody(req, rejectSchema);

    log.info('Rejecting passport entry', { entryId, verifierId: user.id });

    await reject({
      entryId,
      verifierId: user.id,
      reason: body.reason,
      clientIdempotencyKey: body.clientIdempotencyKey,
      request: req,
    });

    return ApiResponse.success({ rejected: true });
  },
});
