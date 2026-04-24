/**
 * src/app/api/mental-health/delete-request/route.ts
 * NAWASENA M11 — POST: MABA requests deletion of their screening data.
 *
 * POST /api/mental-health/delete-request
 *   Role: authenticated (own data only)
 *   Body: { confirmText: 'HAPUS DATA SAYA' }
 *
 * Guards:
 *   - Block if active RED referral exists (safety override required)
 *   - 7-day grace period before actual deletion (by retention cron)
 *
 * Audit: MH_DELETE_REQUESTED
 */

import { createApiHandler, ApiResponse, validateBody, BadRequestError, ConflictError } from '@/lib/api';
import { prisma } from '@/utils/prisma';
import { MHDeleteRequestSchema } from '@/lib/mh-screening/types';

const GRACE_PERIOD_DAYS = 7;

export const POST = createApiHandler({
  auth: true,
  handler: async (req, ctx) => {
    const body = await validateBody(req, MHDeleteRequestSchema);

    // Explicit type check — schema validates literal 'HAPUS DATA SAYA'
    if (body.confirmText !== 'HAPUS DATA SAYA') {
      throw BadRequestError('Konfirmasi tidak valid');
    }

    ctx.log.info('MH delete request', { userId: ctx.user.id });

    // Check for existing pending deletion request
    const existingRequest = await prisma.mHDeletionRequest.findFirst({
      where: { userId: ctx.user.id, processedAt: null },
    });

    if (existingRequest) {
      throw ConflictError('Permintaan penghapusan sudah ada dan sedang diproses');
    }

    // Check for active RED referral — block deletion if so
    const activeRedReferral = await prisma.mHReferralLog.findFirst({
      where: {
        userId: ctx.user.id,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    });

    if (activeRedReferral) {
      throw BadRequestError(
        'Permintaan penghapusan tidak dapat diproses karena ada pendampingan aktif. ' +
        'Silakan hubungi SAC ITS untuk informasi lebih lanjut.',
      );
    }

    // Create deletion request with 7-day grace period
    const now = new Date();
    const scheduledDeleteAt = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 3600 * 1000);

    const deletionRequest = await prisma.mHDeletionRequest.create({
      data: {
        userId: ctx.user.id,
        requestedAt: now,
        scheduledDeleteAt,
      },
    });

    ctx.log.info('MH delete request created', {
      requestId: deletionRequest.id,
      scheduledDeleteAt: scheduledDeleteAt.toISOString(),
    });

    return ApiResponse.success({
      requestId: deletionRequest.id,
      scheduledDeleteAt: scheduledDeleteAt.toISOString(),
      gracePeriodDays: GRACE_PERIOD_DAYS,
      message: `Data akan dihapus pada ${scheduledDeleteAt.toLocaleDateString('id-ID')}. Anda dapat membatalkan permintaan ini sebelum tanggal tersebut.`,
    }, 201);
  },
});
