/**
 * src/app/api/mental-health/referrals/route.ts
 * NAWASENA M11 — GET: SAC counselor referral queue.
 *
 * GET /api/mental-health/referrals
 *   Role: SC (isSACCounselor=true)
 *   Returns: list of referrals assigned to the authenticated SAC counselor.
 *   Ordered by: status ASC, slaDeadlineAt ASC (RED/PENDING first, nearest deadline first).
 *   Audit log: READ_META per query.
 *
 * PRIVACY-CRITICAL:
 *   - Only metadata returned (severity, instrument, phase, flags).
 *   - No raw scores, no decrypted answers.
 *   - Referral list is scoped to authenticated SAC only.
 */

import { createApiHandler, ApiResponse, ForbiddenError } from '@/lib/api';
import { prisma } from '@/utils/prisma';
import { withMHContext } from '@/lib/mh-screening/rls-helpers';
import { recordMHAccess } from '@/lib/mh-screening/access-log';
import type { UserRole } from '@prisma/client';

export const GET = createApiHandler({
  roles: ['SC'],
  handler: async (_req, ctx) => {
    // Runtime check: must be SAC counselor (role check alone is insufficient)
    const user = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { isSACCounselor: true, organizationId: true },
    });

    if (!user?.isSACCounselor) {
      throw ForbiddenError('Not a SAC counselor');
    }

    ctx.log.info('SAC referral queue GET', { actorId: ctx.user.id });

    const referrals = await withMHContext({ id: ctx.user.id }, async (tx) => {
      // Audit BEFORE data access
      await recordMHAccess(tx, {
        actorId: ctx.user.id,
        actorRole: ctx.user.role as UserRole,
        action: 'READ_META',
        targetType: 'MHReferralLog',
        organizationId: user.organizationId ?? undefined,
        metadata: { query: 'sac_queue_list' },
      });

      return tx.mHReferralLog.findMany({
        where: { referredToId: ctx.user.id },
        orderBy: [{ status: 'asc' }, { slaDeadlineAt: 'asc' }],
        select: {
          id: true,
          status: true,
          slaDeadlineAt: true,
          escalatedAt: true,
          acknowledgedAt: true,
          createdAt: true,
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
        },
      });
    });

    ctx.log.info('SAC referral queue returned', { count: referrals.length });
    return ApiResponse.success(referrals);
  },
});
