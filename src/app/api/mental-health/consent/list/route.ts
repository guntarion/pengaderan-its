/**
 * src/app/api/mental-health/consent/list/route.ts
 * NAWASENA M11 — List user's MH consent records.
 *
 * GET /api/mental-health/consent/list
 *   Role: authenticated (own consents only)
 *   Returns consent status per cohort — no score data, no answer data.
 *   Audit log: READ_META on MHConsentRecord.
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { withMHContext } from '@/lib/mh-screening/rls-helpers';
import { recordMHAccess } from '@/lib/mh-screening/access-log';

export const GET = createApiHandler({
  auth: true,
  handler: async (_req, { user, log }) => {
    log.info('MH consent list GET', { userId: user.id });

    const consents = await withMHContext({ id: user.id }, async (tx) => {
      await recordMHAccess(tx, {
        actorId: user.id,
        actorRole: user.role as Parameters<typeof recordMHAccess>[1]['actorRole'],
        action: 'READ_META',
        targetType: 'MHConsentRecord',
        targetUserId: user.id,
        metadata: { query: 'list_own_consents' },
      });

      const rows = await tx.mHConsentRecord.findMany({
        where: { userId: user.id },
        include: {
          cohort: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return rows.map((r: {
        id: string;
        status: string;
        cohortId: string;
        cohort: { name: string } | null;
        consentVersion: string;
        grantedAt: Date;
      }) => ({
        id: r.id,
        status: r.status,
        cohortId: r.cohortId,
        cohortName: r.cohort?.name,
        consentVersion: r.consentVersion,
        grantedAt: r.grantedAt.toISOString(),
      }));
    });

    return ApiResponse.success(consents);
  },
});
