/**
 * src/app/api/mental-health/referrals/[id]/m10-refer/route.ts
 * NAWASENA M11 — POST: Record M10 cross-referral intent (SAC counselor only).
 *
 * POST /api/mental-health/referrals/[id]/m10-refer
 *   Role: SC (isSACCounselor) — assigned counselor only
 *   Body: { consentDocumented: true, dutyOfCareReason: string (min 20) }
 *
 * IMPORTANT: Does NOT create an M10 incident (M10 not yet built).
 *   Only records the intent + audit trail in M11 system.
 *
 * Both consentDocumented=true AND dutyOfCareReason are required.
 * This double-confirmation prevents accidental cross-module referrals.
 */

import { createApiHandler, ApiResponse, ForbiddenError, NotFoundError } from '@/lib/api';
import { prisma } from '@/utils/prisma';
import { withMHContext } from '@/lib/mh-screening/rls-helpers';
import { recordMHAccess } from '@/lib/mh-screening/access-log';
import { validateBody } from '@/lib/api';
import { MHM10ReferSchema } from '@/lib/mh-screening/types';
import type { UserRole } from '@prisma/client';

export const POST = createApiHandler({
  roles: ['SC'],
  handler: async (req, ctx) => {
    const referralId = ctx.params.id;
    const body = await validateBody(req, MHM10ReferSchema);

    // Runtime check: must be SAC counselor
    const actorUser = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { isSACCounselor: true, organizationId: true },
    });

    if (!actorUser?.isSACCounselor) {
      throw ForbiddenError('Not a SAC counselor');
    }

    ctx.log.info('SAC M10 cross-refer intent', { referralId, actorId: ctx.user.id });

    await withMHContext({ id: ctx.user.id }, async (tx) => {
      const referral = await tx.mHReferralLog.findUnique({
        where: { id: referralId },
        select: { referredToId: true },
      });

      if (!referral) throw NotFoundError('Referral');
      if (referral.referredToId !== ctx.user.id) throw ForbiddenError('This referral is not assigned to you');

      // Audit (using STATUS_CHANGE as closest available action for cross-module referral)
      await recordMHAccess(tx, {
        actorId: ctx.user.id,
        actorRole: ctx.user.role as UserRole,
        action: 'STATUS_CHANGE',
        targetType: 'MHReferralLog',
        targetId: referralId,
        organizationId: actorUser.organizationId ?? undefined,
        metadata: {
          event: 'MH_M10_CROSS_REFERRED',
          dutyOfCareReason: body.dutyOfCareReason,
          consentDocumented: true,
        },
      });

      // Append timeline entry
      await tx.mHReferralTimeline.create({
        data: {
          referralId,
          actorId: ctx.user.id,
          action: 'M10_REFERRED',
          metadata: {
            dutyOfCareReason: body.dutyOfCareReason,
            consentDocumented: true,
            recordedAt: new Date().toISOString(),
          },
        },
      });
    });

    ctx.log.info('M10 cross-refer intent recorded', { referralId });

    return ApiResponse.success({
      recorded: true,
      message: 'M10 cross-referral recorded. Create the Safeguard Incident manually in M10.',
    });
  },
});
