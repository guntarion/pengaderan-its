/**
 * src/app/api/verifier/[entryId]/approve/route.ts
 * NAWASENA M05 — POST: Approve a passport entry.
 */

import {
  createApiHandler,
  ApiResponse,
  validateParams,
  validateBody,
  idParamSchema,
} from '@/lib/api';
import { approve } from '@/lib/passport/verifier.service';
import { z } from 'zod';

const approveSchema = z.object({
  optionalNote: z.string().max(500).optional(),
  clientIdempotencyKey: z.string().optional(),
});

export const POST = createApiHandler({
  roles: ['KP', 'KASUH', 'DOSEN_WALI', 'SC', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const { id: entryId } = validateParams(params, idParamSchema);
    const body = await validateBody(req, approveSchema);

    log.info('Approving passport entry', { entryId, verifierId: user.id });

    await approve({
      entryId,
      verifierId: user.id,
      optionalNote: body.optionalNote,
      clientIdempotencyKey: body.clientIdempotencyKey,
      request: req,
    });

    return ApiResponse.success({ approved: true });
  },
});
