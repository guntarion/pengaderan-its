/**
 * src/app/api/admin/passport/override/[entryId]/route.ts
 * NAWASENA M05 — POST: SC override entry status.
 *
 * Requires reason min 20 chars.
 */

import {
  createApiHandler,
  ApiResponse,
  validateParams,
  validateBody,
  idParamSchema,
} from '@/lib/api';
import { override } from '@/lib/passport/verifier.service';
import { PassportEntryStatus } from '@prisma/client';
import { z } from 'zod';

const overrideSchema = z.object({
  newStatus: z.enum([PassportEntryStatus.VERIFIED, PassportEntryStatus.REJECTED]),
  reason: z.string().min(20, 'Override reason must be at least 20 characters').max(2000),
  clientIdempotencyKey: z.string().optional(),
});

export const POST = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const { id: entryId } = validateParams(params, idParamSchema);
    const body = await validateBody(req, overrideSchema);

    log.info('Overriding passport entry', {
      entryId,
      scUserId: user.id,
      newStatus: body.newStatus,
    });

    await override({
      entryId,
      scUserId: user.id,
      newStatus: body.newStatus as 'VERIFIED' | 'REJECTED',
      reason: body.reason,
      clientIdempotencyKey: body.clientIdempotencyKey,
      request: req,
    });

    log.info('Passport entry overridden', { entryId, newStatus: body.newStatus });
    return ApiResponse.success({ overridden: true });
  },
});
