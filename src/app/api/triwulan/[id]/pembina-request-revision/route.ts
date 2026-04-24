/**
 * src/app/api/triwulan/[id]/pembina-request-revision/route.ts
 * NAWASENA M14 — POST /api/triwulan/[id]/pembina-request-revision
 *
 * Pembina requests revision → creates new DRAFT review + supersedes current.
 * Roles: PEMBINA
 */

import { createApiHandler, ApiResponse, validateBody, validateParams, idParamSchema } from '@/lib/api';
import { z } from 'zod';
import { requestRevisionByPembina } from '@/lib/triwulan/pembina-service';
import { hashRequestIP } from '@/lib/triwulan/signature/ip-hasher';
import { auditLog, AUDIT_ACTIONS } from '@/services/audit-log.service';

const revisionSchema = z.object({
  reason: z.string().min(50, 'Alasan revisi harus minimal 50 karakter'),
});

export const POST = createApiHandler({
  roles: ['PEMBINA'],
  handler: async (req, ctx) => {
    const { id } = validateParams(ctx.params, idParamSchema);
    const { reason } = await validateBody(req, revisionSchema);

    ctx.log.info('Pembina requesting revision', { reviewId: id, userId: ctx.user.id });

    const ipHash = hashRequestIP(req.headers);
    const reviewerName = ctx.user.name ?? ctx.user.email;
    const result = await requestRevisionByPembina({
      reviewId: id,
      userId: ctx.user.id,
      reason,
      ipHash,
      reviewerName,
    });

    await auditLog.fromContext(ctx, {
      action: AUDIT_ACTIONS.UPDATE,
      resource: 'triwulan_review',
      resourceId: id,
      newValue: { action: 'PEMBINA_REQUEST_REVISION', newReviewId: result.newReviewId },
    }, req);

    return ApiResponse.success({ newReviewId: result.newReviewId });
  },
});
