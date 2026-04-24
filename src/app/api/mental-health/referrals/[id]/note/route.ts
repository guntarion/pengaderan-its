/**
 * src/app/api/mental-health/referrals/[id]/note/route.ts
 * NAWASENA M11 — POST: Add encrypted note to referral (SAC counselor only).
 *
 * POST /api/mental-health/referrals/[id]/note
 *   Role: SC (isSACCounselor) — assigned counselor only
 *   Body: { note: string (1-2000), statusTransition?: 'IN_PROGRESS' | 'RESOLVED' }
 *
 * Note is stored encrypted via pgp_sym_encrypt at DB layer.
 * Side effects:
 *   - Appends MHReferralTimeline entry NOTE_ADDED
 *   - If statusTransition: also updates status + STATUS_CHANGED timeline entry
 *   - Audit: DECRYPT_NOTE (writing is accessing encrypted data)
 */

import { createApiHandler, ApiResponse, ForbiddenError, NotFoundError, BadRequestError } from '@/lib/api';
import { prisma } from '@/utils/prisma';
import { withMHContext } from '@/lib/mh-screening/rls-helpers';
import { recordMHAccess } from '@/lib/mh-screening/access-log';
import { validateBody } from '@/lib/api';
import { SACFollowUpNoteSchema } from '@/lib/mh-screening/types';
import type { UserRole } from '@prisma/client';

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
};

export const POST = createApiHandler({
  roles: ['SC'],
  handler: async (req, ctx) => {
    const referralId = ctx.params.id;
    const body = await validateBody(req, SACFollowUpNoteSchema);

    // Runtime check: must be SAC counselor
    const actorUser = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { isSACCounselor: true, organizationId: true },
    });

    if (!actorUser?.isSACCounselor) {
      throw ForbiddenError('Not a SAC counselor');
    }

    ctx.log.info('SAC note POST', { referralId, hasStatusTransition: !!body.statusTransition, actorId: ctx.user.id });

    await withMHContext({ id: ctx.user.id }, async (tx) => {
      const referral = await tx.mHReferralLog.findUnique({
        where: { id: referralId },
        select: { referredToId: true, status: true, acknowledgedAt: true },
      });

      if (!referral) throw NotFoundError('Referral');
      if (referral.referredToId !== ctx.user.id) throw ForbiddenError('This referral is not assigned to you');

      // Validate status transition if requested
      if (body.statusTransition) {
        const allowedTransitions = VALID_TRANSITIONS[referral.status] ?? [];
        if (!allowedTransitions.includes(body.statusTransition)) {
          throw BadRequestError(
            `Invalid transition: ${referral.status} → ${body.statusTransition}`,
          );
        }
      }

      // Audit BEFORE writing (encrypted data write = access)
      await recordMHAccess(tx, {
        actorId: ctx.user.id,
        actorRole: ctx.user.role as UserRole,
        action: 'DECRYPT_NOTE',
        targetType: 'MHReferralLog',
        targetId: referralId,
        organizationId: actorUser.organizationId ?? undefined,
        metadata: { reason: 'SAC_NOTE_WRITE', hasStatusTransition: !!body.statusTransition },
      });

      // Encrypt note via pgp_sym_encrypt and store
      await tx.$executeRaw`
        UPDATE "mh_referral_logs"
        SET "resolutionNoteEncrypted" = pgp_sym_encrypt(
          ${body.note}::text,
          current_setting('app.mh_encryption_key')
        ),
        "updatedAt" = NOW()
        WHERE id = ${referralId}
      `;

      const now = new Date();

      // Append NOTE_ADDED timeline entry
      await tx.mHReferralTimeline.create({
        data: {
          referralId,
          actorId: ctx.user.id,
          action: 'NOTE_ADDED',
          metadata: { noteLength: body.note.length },
        },
      });

      // Apply status transition if requested
      if (body.statusTransition) {
        const isFirstTransition = !referral.acknowledgedAt;

        await tx.mHReferralLog.update({
          where: { id: referralId },
          data: {
            status: body.statusTransition as 'IN_PROGRESS' | 'RESOLVED',
            statusChangedAt: now,
            ...(isFirstTransition ? { acknowledgedAt: now } : {}),
          },
        });

        await tx.mHReferralTimeline.create({
          data: {
            referralId,
            actorId: ctx.user.id,
            action: 'STATUS_CHANGED',
            metadata: {
              from: referral.status,
              to: body.statusTransition,
              triggeredBy: 'NOTE_SUBMISSION',
            },
          },
        });
      }
    });

    ctx.log.info('SAC note saved', { referralId, statusTransition: body.statusTransition });
    return ApiResponse.success({ saved: true, statusTransition: body.statusTransition ?? null });
  },
});
