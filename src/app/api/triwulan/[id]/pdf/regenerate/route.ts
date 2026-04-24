/**
 * src/app/api/triwulan/[id]/pdf/regenerate/route.ts
 * NAWASENA M14 — POST /api/triwulan/[id]/pdf/regenerate
 *
 * Admin/SUPERADMIN triggers a PDF re-render for a finalized review.
 * Roles: SUPERADMIN
 */

import { createApiHandler, ApiResponse, validateParams, idParamSchema, NotFoundError } from '@/lib/api';
import { prisma } from '@/utils/prisma';
import { PDFStatus } from '@prisma/client';
import { enqueuePDFRender } from '@/lib/triwulan/pdf/job-queue';
import { auditLog, AUDIT_ACTIONS } from '@/services/audit-log.service';

export const POST = createApiHandler({
  roles: ['SUPERADMIN'],
  handler: async (req, ctx) => {
    const { id: reviewId } = validateParams(ctx.params, idParamSchema);

    ctx.log.info('PDF regenerate requested', { reviewId, userId: ctx.user.id });

    const review = await prisma.triwulanReview.findUnique({
      where: { id: reviewId },
      select: { id: true, pdfStatus: true },
    });

    if (!review) throw NotFoundError('Review');

    // Reset status to PENDING so the queue will pick it up
    await prisma.triwulanReview.update({
      where: { id: reviewId },
      data: { pdfStatus: PDFStatus.PENDING },
    });

    enqueuePDFRender(reviewId);

    await auditLog.fromContext(ctx, {
      action: AUDIT_ACTIONS.UPDATE,
      resource: 'triwulan_review',
      resourceId: reviewId,
      newValue: { action: 'PDF_REGENERATE', previousStatus: review.pdfStatus },
    }, req);

    return ApiResponse.success({ queued: true });
  },
});
