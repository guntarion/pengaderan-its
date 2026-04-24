/**
 * src/app/api/mental-health/submissions/[id]/route.ts
 * NAWASENA M11 — MH Screening detail (own record only).
 *
 * GET /api/mental-health/submissions/[id]
 *   Returns screening metadata for own record.
 *   NEVER returns rawScoreEncrypted or answerValueEncrypted.
 *   Audit log: READ_META.
 */

import { createApiHandler, ApiResponse, validateParams, idParamSchema, NotFoundError, ForbiddenError } from '@/lib/api';
import { withMHContext } from '@/lib/mh-screening/rls-helpers';
import { recordMHAccess } from '@/lib/mh-screening/access-log';

export const GET = createApiHandler({
  auth: true,
  handler: async (_req, { user, params, log }) => {
    const { id } = validateParams(params, idParamSchema);

    log.info('MH submission GET detail', { userId: user.id, screeningId: id });

    const screening = await withMHContext({ id: user.id }, async (tx) => {
      const row = await tx.mHScreening.findUnique({
        where: { id, deletedAt: null },
        select: {
          id: true,
          userId: true,
          instrument: true,
          phase: true,
          severity: true,
          flagged: true,
          immediateContact: true,
          recordedAt: true,
          cohortId: true,
        },
      });

      if (!row) throw NotFoundError('Screening');
      if (row.userId !== user.id) throw ForbiddenError();

      await recordMHAccess(tx, {
        actorId: user.id,
        actorRole: user.role as Parameters<typeof recordMHAccess>[1]['actorRole'],
        action: 'READ_META',
        targetType: 'MHScreening',
        targetId: id,
        targetUserId: user.id,
        metadata: { query: 'detail' },
      });

      return row;
    });

    return ApiResponse.success(screening);
  },
});
