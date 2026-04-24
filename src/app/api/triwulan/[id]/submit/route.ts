/**
 * src/app/api/triwulan/[id]/submit/route.ts
 * NAWASENA M14 — POST /api/triwulan/[id]/submit
 *
 * Submit DRAFT review to Pembina for sign-off.
 * Roles: SC
 */

import { createApiHandler, ApiResponse, validateParams, idParamSchema } from '@/lib/api';
import { submitToPembina } from '@/lib/triwulan/sc-service';
import { hashRequestIP } from '@/lib/triwulan/signature/ip-hasher';
import { auditLog, AUDIT_ACTIONS } from '@/services/audit-log.service';

export const POST = createApiHandler({
  roles: ['SC'],
  handler: async (req, ctx) => {
    const { id } = validateParams(ctx.params, idParamSchema);

    ctx.log.info('Submitting review to Pembina', { reviewId: id, userId: ctx.user.id });

    const ipHash = hashRequestIP(req.headers);
    await submitToPembina(id, ctx.user.id, ipHash);

    await auditLog.fromContext(ctx, {
      action: AUDIT_ACTIONS.UPDATE,
      resource: 'triwulan_review',
      resourceId: id,
      newValue: { action: 'SUBMIT_TO_PEMBINA' },
    }, req);

    return ApiResponse.success({ submitted: true });
  },
});
