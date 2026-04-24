/**
 * src/app/api/mental-health/consent/route.ts
 * NAWASENA M11 — MH Consent API
 *
 * POST /api/mental-health/consent
 *   Role: MABA (any authenticated user)
 *   Records consent for MH screening (creates MHConsentRecord).
 *   Validates body with MHConsentSchema.
 *   Audit log: CONSENT_RECORDED.
 *
 * DELETE /api/mental-health/consent
 *   Role: MABA
 *   Withdraws consent — updates status to WITHDRAWN.
 *   Audit log: CONSENT_WITHDRAWN.
 *
 * PRIVACY-CRITICAL:
 *   - Uses withMHContext for RLS session vars.
 *   - Consent withdrawal does NOT delete data immediately (7-day grace period).
 *   - Only the consent owner can withdraw (enforced by WHERE userId = actor.id).
 */

import { createApiHandler, ApiResponse, validateBody, BadRequestError } from '@/lib/api';
import { MHConsentSchema } from '@/lib/mh-screening/types';
import { withMHContext } from '@/lib/mh-screening/rls-helpers';
import { recordMHAccess } from '@/lib/mh-screening/access-log';
import { z } from 'zod';

const WithdrawSchema = z.object({
  cohortId: z.string().cuid(),
});

export const POST = createApiHandler({
  auth: true,
  handler: async (req, { user, log }) => {
    const body = await validateBody(req, MHConsentSchema);

    log.info('MH consent POST', {
      userId: user.id,
      cohortId: body.cohortId,
      consentVersion: body.consentVersion,
    });

    const result = await withMHContext({ id: user.id }, async (tx) => {
      // Check for existing active consent for this user+cohort
      const existing = await tx.mHConsentRecord.findFirst({
        where: {
          userId: user.id,
          cohortId: body.cohortId,
          status: 'GRANTED',
        },
      });

      if (existing) {
        throw BadRequestError('Persetujuan sudah ada untuk kohort ini');
      }

      const consent = await tx.mHConsentRecord.create({
        data: {
          userId: user.id,
          cohortId: body.cohortId,
          consentVersion: body.consentVersion,
          scope: body.scope,
          status: 'GRANTED',
          grantedAt: new Date(),
        },
      });

      await recordMHAccess(tx, {
        actorId: user.id,
        actorRole: user.role as Parameters<typeof recordMHAccess>[1]['actorRole'],
        action: 'CONSENT_RECORDED',
        targetType: 'MHConsentRecord',
        targetId: consent.id,
        targetUserId: user.id,
        metadata: {
          cohortId: body.cohortId,
          consentVersion: body.consentVersion,
          scope: body.scope,
        },
      });

      return consent;
    });

    log.info('MH consent recorded', { consentId: result.id, userId: user.id });
    return ApiResponse.success({ consentId: result.id }, 201);
  },
});

export const DELETE = createApiHandler({
  auth: true,
  handler: async (req, { user, log }) => {
    const body = await validateBody(req, WithdrawSchema);

    log.info('MH consent DELETE (withdraw)', {
      userId: user.id,
      cohortId: body.cohortId,
    });

    await withMHContext({ id: user.id }, async (tx) => {
      const consent = await tx.mHConsentRecord.findFirst({
        where: {
          userId: user.id,
          cohortId: body.cohortId,
          status: 'GRANTED',
        },
      });

      if (!consent) {
        throw BadRequestError('Tidak ada persetujuan aktif untuk kohort ini');
      }

      await tx.mHConsentRecord.update({
        where: { id: consent.id },
        data: {
          status: 'WITHDRAWN',
          withdrawnAt: new Date(),
        },
      });

      await recordMHAccess(tx, {
        actorId: user.id,
        actorRole: user.role as Parameters<typeof recordMHAccess>[1]['actorRole'],
        action: 'CONSENT_WITHDRAWN',
        targetType: 'MHConsentRecord',
        targetId: consent.id,
        targetUserId: user.id,
        metadata: { cohortId: body.cohortId },
      });
    });

    log.info('MH consent withdrawn', { userId: user.id, cohortId: body.cohortId });
    return ApiResponse.success({ withdrawn: true });
  },
});
