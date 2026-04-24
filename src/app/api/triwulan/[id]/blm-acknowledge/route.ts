/**
 * src/app/api/triwulan/[id]/blm-acknowledge/route.ts
 * NAWASENA M14 — POST /api/triwulan/[id]/blm-acknowledge
 *
 * BLM acknowledges the review (PEMBINA_SIGNED → BLM_ACKNOWLEDGED).
 * Requires all 10 audit substansi items assessed.
 * Roles: BLM
 */

import { createApiHandler, ApiResponse, validateBody, validateParams, idParamSchema } from '@/lib/api';
import { z } from 'zod';
import { acknowledgeByBLM } from '@/lib/triwulan/audit-substansi/service';
import { hashRequestIP } from '@/lib/triwulan/signature/ip-hasher';
import { auditLog, AUDIT_ACTIONS } from '@/services/audit-log.service';

const acknowledgeSchema = z.object({
  notes: z.string().default(''),
});

export const POST = createApiHandler({
  roles: ['BLM'],
  handler: async (req, ctx) => {
    const { id: reviewId } = validateParams(ctx.params, idParamSchema);
    const raw = await validateBody(req, acknowledgeSchema);
    const notes: string = raw.notes ?? '';

    ctx.log.info('BLM acknowledging review', { reviewId, userId: ctx.user.id });

    const ipHash = hashRequestIP(req.headers);
    await acknowledgeByBLM({ reviewId, userId: ctx.user.id, notes, ipHash });

    await auditLog.fromContext(ctx, {
      action: AUDIT_ACTIONS.UPDATE,
      resource: 'triwulan_review',
      resourceId: reviewId,
      newValue: { action: 'BLM_ACKNOWLEDGE' },
    }, req);

    return ApiResponse.success({ acknowledged: true });
  },
});
