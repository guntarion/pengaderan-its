/**
 * src/app/api/triwulan/[id]/route.ts
 * NAWASENA M14 — GET /api/triwulan/[id]
 *
 * Get triwulan review detail including snapshot + signature events + audit results.
 * Roles: SC, PEMBINA, BLM, SUPERADMIN (own org enforced by RLS)
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateParams, idParamSchema, NotFoundError } from '@/lib/api';

export const GET = createApiHandler({
  roles: ['SC', 'PEMBINA', 'BLM', 'SUPERADMIN'],
  handler: async (_req, ctx) => {
    const { id } = validateParams(ctx.params, idParamSchema);

    ctx.log.info('Fetching triwulan review detail', { reviewId: id, userId: ctx.user.id });

    const review = await prisma.triwulanReview.findUnique({
      where: { id },
      include: {
        generatedBy: { select: { id: true, displayName: true, fullName: true, role: true } },
        submittedBy: { select: { id: true, displayName: true, fullName: true, role: true } },
        pembinaSignedBy: { select: { id: true, displayName: true, fullName: true, role: true } },
        blmAcknowledgedBy: { select: { id: true, displayName: true, fullName: true, role: true } },
        cohort: { select: { id: true, code: true, name: true } },
        organization: { select: { id: true, code: true, name: true } },
        signatureEvents: {
          orderBy: { timestamp: 'asc' },
          include: {
            actor: { select: { id: true, displayName: true, fullName: true, role: true } },
          },
        },
        auditSubstansiResults: {
          orderBy: { itemKey: 'asc' },
          include: {
            assessedBy: { select: { id: true, displayName: true, fullName: true } },
          },
        },
        previousReview: { select: { id: true, status: true, quarterNumber: true } },
        revisedByReviews: { select: { id: true, status: true, createdAt: true } },
      },
    });

    if (!review) throw NotFoundError('Review');

    return ApiResponse.success(review);
  },
});
