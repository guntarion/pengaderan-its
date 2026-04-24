/**
 * src/app/api/mental-health/referrals/[id]/reassign/route.ts
 * NAWASENA M11 — POST: Reassign referral to another SAC counselor.
 *
 * POST /api/mental-health/referrals/[id]/reassign
 *   Role: SC (isPoliPsikologiCoord) or the currently assigned SAC counselor
 *   Body: { newSACId: string, reason: string }
 *
 * Side effects:
 *   - Updates referredToId, reassignedFromId, reassignedReason, status=REASSIGNED
 *   - Appends MHReferralTimeline entry REASSIGNED
 *   - Sends MH_REASSIGN_MABA notification to Maba (NORMAL, anonymous)
 *   - Audit: STATUS_CHANGE
 */

import { createApiHandler, ApiResponse, ForbiddenError, NotFoundError, BadRequestError } from '@/lib/api';
import { prisma } from '@/utils/prisma';
import { withMHContext } from '@/lib/mh-screening/rls-helpers';
import { recordMHAccess } from '@/lib/mh-screening/access-log';
import { validateBody } from '@/lib/api';
import { z } from 'zod';
import { sendNotification } from '@/lib/notifications/send';
import type { UserRole, NotificationCategory } from '@prisma/client';

const ReassignSchema = z.object({
  newSACId: z.string().cuid(),
  reason: z.string().min(1).max(500),
});

export const POST = createApiHandler({
  roles: ['SC'],
  handler: async (req, ctx) => {
    const referralId = ctx.params.id;
    const body = await validateBody(req, ReassignSchema);

    // Runtime check: must be isPoliPsikologiCoord or the assigned SAC counselor
    const actorUser = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { isSACCounselor: true, isPoliPsikologiCoord: true, organizationId: true },
    });

    if (!actorUser?.isSACCounselor && !actorUser?.isPoliPsikologiCoord) {
      throw ForbiddenError('Not authorized to reassign referrals');
    }

    // Verify new SAC exists and is a counselor
    const newSAC = await prisma.user.findUnique({
      where: { id: body.newSACId },
      select: { isSACCounselor: true },
    });

    if (!newSAC?.isSACCounselor) {
      throw BadRequestError('Target user is not a SAC counselor');
    }

    ctx.log.info('SAC reassign', { referralId, newSACId: body.newSACId, actorId: ctx.user.id });

    await withMHContext(
      { id: ctx.user.id, isPoliPsikologiCoord: actorUser.isPoliPsikologiCoord ?? false },
      async (tx) => {
        const referral = await tx.mHReferralLog.findUnique({
          where: { id: referralId },
          select: { referredToId: true, userId: true, status: true },
        });

        if (!referral) throw NotFoundError('Referral');

        // Non-coordinator can only reassign their own referrals
        if (!actorUser.isPoliPsikologiCoord && referral.referredToId !== ctx.user.id) {
          throw ForbiddenError('This referral is not assigned to you');
        }

        // Audit
        await recordMHAccess(tx, {
          actorId: ctx.user.id,
          actorRole: ctx.user.role as UserRole,
          action: 'STATUS_CHANGE',
          targetType: 'MHReferralLog',
          targetId: referralId,
          organizationId: actorUser.organizationId ?? undefined,
          metadata: { action: 'REASSIGN', newSACId: body.newSACId, reason: body.reason },
        });

        // Update referral
        await tx.mHReferralLog.update({
          where: { id: referralId },
          data: {
            referredToId: body.newSACId,
            reassignedFromId: referral.referredToId,
            reassignedReason: body.reason,
            status: 'REASSIGNED',
            statusChangedAt: new Date(),
          },
        });

        // Append timeline
        await tx.mHReferralTimeline.create({
          data: {
            referralId,
            actorId: ctx.user.id,
            action: 'REASSIGNED',
            metadata: {
              previousSACId: referral.referredToId,
              newSACId: body.newSACId,
              reason: body.reason,
            },
          },
        });

        // Send anonymous notification to Maba (no counselor identity in payload)
        try {
          await sendNotification({
            userId: referral.userId,
            templateKey: 'MH_REASSIGN_MABA',
            payload: {
              message: 'Konselor yang menangani Anda telah berganti. Layanan dukungan akan tetap tersedia.',
            },
            category: 'NORMAL' as NotificationCategory,
          });
        } catch (err) {
          ctx.log.warn('Failed to send MH_REASSIGN_MABA notification', { referralId, error: err });
        }
      },
    );

    ctx.log.info('Referral reassigned', { referralId, newSACId: body.newSACId });
    return ApiResponse.success({ reassigned: true, newSACId: body.newSACId });
  },
});
