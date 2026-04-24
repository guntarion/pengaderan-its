/**
 * src/app/api/mental-health/referrals/[id]/status/route.ts
 * NAWASENA M11 — PATCH: Update referral status (SAC counselor only).
 *
 * PATCH /api/mental-health/referrals/[id]/status
 *   Role: SC (isSACCounselor) — assigned counselor only
 *   Body: { status: 'IN_PROGRESS' | 'RESOLVED', reason?: string }
 *   Valid transitions: PENDING→IN_PROGRESS, IN_PROGRESS→RESOLVED
 *
 * Side effects:
 *   - Updates statusChangedAt + acknowledgedAt (first transition only)
 *   - Appends MHReferralTimeline entry with action STATUS_CHANGED
 *   - Audit: STATUS_CHANGE
 */

import { createApiHandler, ApiResponse, ForbiddenError, NotFoundError, BadRequestError } from '@/lib/api';
import { prisma } from '@/utils/prisma';
import { withMHContext } from '@/lib/mh-screening/rls-helpers';
import { recordMHAccess } from '@/lib/mh-screening/access-log';
import { validateBody } from '@/lib/api';
import { z } from 'zod';
import type { UserRole } from '@prisma/client';

const StatusUpdateSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'RESOLVED']),
  reason: z.string().max(500).optional(),
});

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
};

export const PATCH = createApiHandler({
  roles: ['SC'],
  handler: async (req, ctx) => {
    const referralId = ctx.params.id;
    const body = await validateBody(req, StatusUpdateSchema);

    // Runtime check: must be SAC counselor
    const actorUser = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { isSACCounselor: true, organizationId: true },
    });

    if (!actorUser?.isSACCounselor) {
      throw ForbiddenError('Not a SAC counselor');
    }

    ctx.log.info('SAC status update', { referralId, newStatus: body.status, actorId: ctx.user.id });

    await withMHContext({ id: ctx.user.id }, async (tx) => {
      const referral = await tx.mHReferralLog.findUnique({
        where: { id: referralId },
        select: { referredToId: true, status: true, acknowledgedAt: true },
      });

      if (!referral) throw NotFoundError('Referral');
      if (referral.referredToId !== ctx.user.id) throw ForbiddenError('This referral is not assigned to you');

      const allowedTransitions = VALID_TRANSITIONS[referral.status] ?? [];
      if (!allowedTransitions.includes(body.status)) {
        throw BadRequestError(
          `Invalid transition: ${referral.status} → ${body.status}. Allowed: ${allowedTransitions.join(', ')}`,
        );
      }

      const now = new Date();
      const isFirstTransition = !referral.acknowledgedAt;

      // Update status
      await tx.mHReferralLog.update({
        where: { id: referralId },
        data: {
          status: body.status as 'IN_PROGRESS' | 'RESOLVED',
          statusChangedAt: now,
          ...(isFirstTransition ? { acknowledgedAt: now } : {}),
        },
      });

      // Append timeline entry
      await tx.mHReferralTimeline.create({
        data: {
          referralId,
          actorId: ctx.user.id,
          action: 'STATUS_CHANGED',
          metadata: {
            from: referral.status,
            to: body.status,
            ...(body.reason ? { reason: body.reason } : {}),
          },
        },
      });

      // Audit
      await recordMHAccess(tx, {
        actorId: ctx.user.id,
        actorRole: ctx.user.role as UserRole,
        action: 'STATUS_CHANGE',
        targetType: 'MHReferralLog',
        targetId: referralId,
        organizationId: actorUser.organizationId ?? undefined,
        metadata: { from: referral.status, to: body.status },
      });
    });

    ctx.log.info('Referral status updated', { referralId, newStatus: body.status });
    return ApiResponse.success({ updated: true, status: body.status });
  },
});
