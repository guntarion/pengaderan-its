/**
 * src/app/api/triwulan/[id]/pembina-sign/route.ts
 * NAWASENA M14 — POST /api/triwulan/[id]/pembina-sign
 *
 * Pembina signs the review (SUBMITTED_FOR_PEMBINA → PEMBINA_SIGNED).
 * URGENT reviews require in-person confirmation + notes ≥ 200 chars.
 * Roles: PEMBINA
 */

import { createApiHandler, ApiResponse, validateBody, validateParams, idParamSchema } from '@/lib/api';
import { z } from 'zod';
import { signByPembina } from '@/lib/triwulan/pembina-service';
import { hashRequestIP } from '@/lib/triwulan/signature/ip-hasher';
import { auditLog, AUDIT_ACTIONS } from '@/services/audit-log.service';

const signSchema = z.object({
  notes: z.string().default(''),
  inPersonReviewed: z.boolean().default(false),
});

export const POST = createApiHandler({
  roles: ['PEMBINA'],
  handler: async (req, ctx) => {
    const { id } = validateParams(ctx.params, idParamSchema);
    const rawBody = await validateBody(req, signSchema);
    const notes: string = rawBody.notes ?? '';
    const inPersonReviewed: boolean = rawBody.inPersonReviewed ?? false;

    ctx.log.info('Pembina signing review', { reviewId: id, userId: ctx.user.id });

    const ipHash = hashRequestIP(req.headers);
    await signByPembina({ reviewId: id, userId: ctx.user.id, notes, inPersonReviewed, ipHash });

    await auditLog.fromContext(ctx, {
      action: AUDIT_ACTIONS.UPDATE,
      resource: 'triwulan_review',
      resourceId: id,
      newValue: { action: 'PEMBINA_SIGN', inPersonReviewed },
    }, req);

    return ApiResponse.success({ signed: true });
  },
});
