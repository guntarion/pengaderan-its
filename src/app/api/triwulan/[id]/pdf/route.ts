/**
 * src/app/api/triwulan/[id]/pdf/route.ts
 * NAWASENA M14 — GET /api/triwulan/[id]/pdf
 *
 * Returns presigned download URL for the review's PDF.
 * Roles: SC, PEMBINA, BLM, SUPERADMIN
 */

import { createApiHandler, ApiResponse, validateParams, idParamSchema, NotFoundError } from '@/lib/api';
import { prisma } from '@/utils/prisma';
import { PDFStatus } from '@prisma/client';
import { getPresignedDownloadUrl } from '@/lib/triwulan/pdf/upload';

export const GET = createApiHandler({
  roles: ['SC', 'PEMBINA', 'BLM', 'SUPERADMIN'],
  handler: async (_req, ctx) => {
    const { id: reviewId } = validateParams(ctx.params, idParamSchema);

    ctx.log.info('PDF download requested', { reviewId, userId: ctx.user.id });

    const review = await prisma.triwulanReview.findUnique({
      where: { id: reviewId },
      select: { pdfStatus: true, pdfStorageKey: true },
    });

    if (!review) throw NotFoundError('Review');

    if (review.pdfStatus !== PDFStatus.READY || !review.pdfStorageKey) {
      return ApiResponse.success(
        {
          ready: false,
          pdfStatus: review.pdfStatus,
          downloadUrl: null,
        }
      );
    }

    const downloadUrl = await getPresignedDownloadUrl(review.pdfStorageKey);

    return ApiResponse.success({
      ready: true,
      pdfStatus: review.pdfStatus,
      downloadUrl,
    });
  },
});
