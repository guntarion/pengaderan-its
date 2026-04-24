/**
 * src/app/api/triwulan/list/route.ts
 * NAWASENA M14 — GET /api/triwulan/list
 *
 * Returns triwulan reviews for the current user's cohort/org.
 * SC: sees own cohort reviews (RLS scoped).
 * PEMBINA: sees reviews awaiting signature.
 * BLM: sees reviews awaiting BLM acknowledgement.
 * SUPERADMIN: sees all in org.
 * Roles: SC, PEMBINA, BLM, SUPERADMIN
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse } from '@/lib/api';
import { ReviewStatus } from '@prisma/client';

export const GET = createApiHandler({
  roles: ['SC', 'PEMBINA', 'BLM', 'SUPERADMIN'],
  handler: async (_req, ctx) => {
    const { id: userId, role, organizationId } = ctx.user;

    ctx.log.info('Listing triwulan reviews', { userId, role, organizationId });

    let whereClause: Record<string, unknown> = {
      organizationId,
    };

    if (role === 'PEMBINA') {
      whereClause = {
        ...whereClause,
        status: ReviewStatus.SUBMITTED_FOR_PEMBINA,
        supersededByReviewId: null,
      };
    } else if (role === 'BLM') {
      whereClause = {
        ...whereClause,
        status: ReviewStatus.PEMBINA_SIGNED,
        supersededByReviewId: null,
      };
    }

    const reviews = await prisma.triwulanReview.findMany({
      where: whereClause,
      include: {
        cohort: { select: { id: true, code: true, name: true } },
        generatedBy: { select: { id: true, displayName: true, fullName: true } },
        submittedBy: { select: { id: true, displayName: true, fullName: true } },
      },
      orderBy: [{ quarterNumber: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });

    return ApiResponse.success(reviews);
  },
});
