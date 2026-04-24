/**
 * src/app/api/mental-health/referrals/[id]/route.ts
 * NAWASENA M11 — GET: SAC referral detail (metadata only, no decrypt).
 *
 * GET /api/mental-health/referrals/[id]
 *   Role: SC (isSACCounselor) or isPoliPsikologiCoord
 *   Returns: referral metadata + timeline (no encrypted answers).
 *   Audit log: READ_META per access.
 *
 * PRIVACY-CRITICAL: Only metadata returned. Decrypt is a separate endpoint.
 */

import { createApiHandler, ApiResponse, ForbiddenError, NotFoundError } from '@/lib/api';
import { prisma } from '@/utils/prisma';
import { withMHContext } from '@/lib/mh-screening/rls-helpers';
import { recordMHAccess } from '@/lib/mh-screening/access-log';
import type { UserRole } from '@prisma/client';

export const GET = createApiHandler({
  roles: ['SC'],
  handler: async (_req, ctx) => {
    const referralId = ctx.params.id;

    // Runtime check: must be SAC counselor or Poli Psikologi coordinator
    const actorUser = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { isSACCounselor: true, isPoliPsikologiCoord: true, organizationId: true },
    });

    if (!actorUser?.isSACCounselor && !actorUser?.isPoliPsikologiCoord) {
      throw ForbiddenError('Not a SAC counselor or coordinator');
    }

    ctx.log.info('SAC referral detail GET', { referralId, actorId: ctx.user.id });

    const referral = await withMHContext(
      { id: ctx.user.id, isPoliPsikologiCoord: actorUser.isPoliPsikologiCoord ?? false },
      async (tx) => {
        // Audit BEFORE data access
        await recordMHAccess(tx, {
          actorId: ctx.user.id,
          actorRole: ctx.user.role as UserRole,
          action: 'READ_META',
          targetType: 'MHReferralLog',
          targetId: referralId,
          organizationId: actorUser.organizationId ?? undefined,
          metadata: { query: 'sac_case_detail' },
        });

        return tx.mHReferralLog.findUnique({
          where: { id: referralId },
          select: {
            id: true,
            status: true,
            slaDeadlineAt: true,
            escalatedAt: true,
            acknowledgedAt: true,
            statusChangedAt: true,
            assignmentReason: true,
            reassignedFromId: true,
            reassignedReason: true,
            createdAt: true,
            // NO resolutionNoteEncrypted (use /decrypt endpoint)
            screening: {
              select: {
                id: true,
                instrument: true,
                phase: true,
                severity: true,
                immediateContact: true,
                flagged: true,
                recordedAt: true,
              },
            },
            timeline: {
              select: {
                id: true,
                actorId: true,
                action: true,
                metadata: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        });
      },
    );

    if (!referral) {
      throw NotFoundError('Referral');
    }

    // SAC counselors can only see their own referrals (unless coordinator)
    // Note: RLS policies enforce this at DB level, but we double-check here
    const referralFull = await prisma.mHReferralLog.findUnique({
      where: { id: referralId },
      select: { referredToId: true },
    });

    if (!actorUser.isPoliPsikologiCoord && referralFull?.referredToId !== ctx.user.id) {
      throw ForbiddenError('This referral is not assigned to you');
    }

    return ApiResponse.success(referral);
  },
});
