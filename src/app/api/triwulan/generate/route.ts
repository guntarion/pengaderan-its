/**
 * src/app/api/triwulan/generate/route.ts
 * NAWASENA M14 — POST /api/triwulan/generate
 *
 * Generate (or return existing) TriwulanReview for a cohort + quarter.
 * Roles: SC, SUPERADMIN
 */

import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { z } from 'zod';
import { generateTriwulanReview } from '@/lib/triwulan/generator';
import { auditLog, AUDIT_ACTIONS } from '@/services/audit-log.service';
import { hashRequestIP } from '@/lib/triwulan/signature/ip-hasher';

const generateSchema = z.object({
  cohortId: z.string().min(1, 'cohortId wajib diisi'),
  quarterNumber: z.number().int().min(1).max(4),
});

export const POST = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, ctx) => {
    const { cohortId, quarterNumber } = await validateBody(req, generateSchema);

    ctx.log.info('Generating triwulan review', {
      cohortId,
      quarterNumber,
      userId: ctx.user.id,
    });

    const ipHash = hashRequestIP(req.headers);

    const result = await generateTriwulanReview({
      cohortId,
      quarterNumber: quarterNumber as 1 | 2 | 3 | 4,
      generatedById: ctx.user.id,
      ipHash,
    });

    // Audit log
    await auditLog.fromContext(ctx, {
      action: result.isExisting ? AUDIT_ACTIONS.READ : AUDIT_ACTIONS.CREATE,
      resource: 'triwulan_review',
      resourceId: result.reviewId,
      newValue: {
        cohortId,
        quarterNumber,
        escalationLevel: result.escalationLevel,
        dataPartial: result.dataPartial,
        isExisting: result.isExisting,
      },
    }, req);

    return ApiResponse.success({
      reviewId: result.reviewId,
      status: result.status,
      escalationLevel: result.escalationLevel,
      dataPartial: result.dataPartial,
      isExisting: result.isExisting,
    }, result.isExisting ? 200 : 201);
  },
});
