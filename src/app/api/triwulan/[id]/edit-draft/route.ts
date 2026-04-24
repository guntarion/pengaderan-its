/**
 * src/app/api/triwulan/[id]/edit-draft/route.ts
 * NAWASENA M14 — PATCH /api/triwulan/[id]/edit-draft
 *
 * Update executive summary narrative for a DRAFT review.
 * Roles: SC
 */

import { createApiHandler, ApiResponse, validateBody, validateParams, idParamSchema } from '@/lib/api';
import { z } from 'zod';
import { updateDraftNarrative } from '@/lib/triwulan/sc-service';
import { hashRequestIP } from '@/lib/triwulan/signature/ip-hasher';
import { auditLog, AUDIT_ACTIONS } from '@/services/audit-log.service';

const editDraftSchema = z.object({
  narrative: z.string().min(1, 'Narasi tidak boleh kosong'),
});

export const PATCH = createApiHandler({
  roles: ['SC'],
  handler: async (req, ctx) => {
    const { id } = validateParams(ctx.params, idParamSchema);
    const { narrative } = await validateBody(req, editDraftSchema);

    ctx.log.info('Updating draft narrative', { reviewId: id, userId: ctx.user.id });

    const ipHash = hashRequestIP(req.headers);
    await updateDraftNarrative(id, ctx.user.id, narrative, ipHash);

    await auditLog.fromContext(ctx, {
      action: AUDIT_ACTIONS.UPDATE,
      resource: 'triwulan_review',
      resourceId: id,
      newValue: { narrativeLength: narrative.length },
    }, req);

    return ApiResponse.success({ updated: true });
  },
});
