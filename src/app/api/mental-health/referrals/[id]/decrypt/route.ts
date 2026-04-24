/**
 * src/app/api/mental-health/referrals/[id]/decrypt/route.ts
 * NAWASENA M11 — GET: Decrypt and return screening answers for SAC counselor.
 *
 * GET /api/mental-health/referrals/[id]/decrypt
 *   Role: SC (isSACCounselor) — must be the assigned counselor
 *
 * CRITICAL PRIVACY RULES:
 *   1. Audit INSERT MUST happen BEFORE decrypt query (fail-closed: no decrypt if audit fails).
 *   2. Only the assigned SAC counselor can decrypt.
 *   3. withMHContext sets encryption key for pgp_sym_decrypt.
 *   4. Answers are returned as decrypted strings (0-3), not raw bytes.
 *
 * Audit action: DECRYPT_ANSWERS
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

    // Runtime check: must be SAC counselor
    const actorUser = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { isSACCounselor: true, organizationId: true },
    });

    if (!actorUser?.isSACCounselor) {
      throw ForbiddenError('Not a SAC counselor');
    }

    // Verify referral is assigned to this SAC counselor
    const referral = await prisma.mHReferralLog.findUnique({
      where: { id: referralId },
      select: { referredToId: true, screeningId: true },
    });

    if (!referral) {
      throw NotFoundError('Referral');
    }

    if (referral.referredToId !== ctx.user.id) {
      throw ForbiddenError('This referral is not assigned to you');
    }

    ctx.log.info('SAC decrypt answers', { referralId, actorId: ctx.user.id });

    const answers = await withMHContext({ id: ctx.user.id }, async (tx) => {
      // AUDIT FIRST — if this fails, decrypt is NOT performed (fail-closed)
      await recordMHAccess(tx, {
        actorId: ctx.user.id,
        actorRole: ctx.user.role as UserRole,
        action: 'DECRYPT_ANSWERS',
        targetType: 'MHScreeningAnswer',
        targetId: referral.screeningId,
        organizationId: actorUser.organizationId ?? undefined,
        metadata: {
          referralId,
          reason: 'SAC_CASE_REVIEW',
        },
      });

      // THEN decrypt
      const rows = await tx.$queryRaw<Array<{ id: string; questionIndex: number; answerValue: string }>>`
        SELECT id, "questionIndex",
          pgp_sym_decrypt("answerValueEncrypted"::bytea, current_setting('app.mh_encryption_key'))::text as "answerValue"
        FROM "mh_screening_answers"
        WHERE "screeningId" = ${referral.screeningId}
        ORDER BY "questionIndex"
      `;

      return rows;
    });

    ctx.log.info('Answers decrypted', { referralId, count: answers.length });

    type AnswerRow = { id: string; questionIndex: number; answerValue: string };
    return ApiResponse.success({
      screeningId: referral.screeningId,
      answers: (answers as AnswerRow[]).map((a) => ({
        id: a.id,
        questionIndex: a.questionIndex,
        answerValue: parseInt(a.answerValue, 10),
      })),
    });
  },
});
