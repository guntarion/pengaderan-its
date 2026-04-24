/**
 * src/app/api/journal/unscored/route.ts
 * NAWASENA M04 — Unscored journals for KP review.
 *
 * GET /api/journal/unscored?cohortId=... — Returns journals in KP's group without rubric score.
 * Roles: KP, SC, SUPERADMIN
 */

import { createApiHandler, ApiResponse, validateQuery, BadRequestError } from '@/lib/api';
import { z } from 'zod';
import { listUnscoredJournalsForKP } from '@/lib/journal/kp-accessor';
import { prisma } from '@/utils/prisma';

const querySchema = z.object({
  cohortId: z.string().min(1).optional(),
});

export const GET = createApiHandler({
  auth: true,
  handler: async (req, { user, log }) => {
    if (!user.organizationId) {
      throw BadRequestError('User has no organization');
    }

    const { cohortId: queryCohortId } = validateQuery(req, querySchema);

    // Resolve cohortId: prefer query param, fall back to user's currentCohortId in DB
    let cohortId = queryCohortId;
    if (!cohortId) {
      const userRecord = await prisma.user.findUnique({
        where: { id: user.id },
        select: { currentCohortId: true },
      });
      cohortId = userRecord?.currentCohortId ?? undefined;
    }

    if (!cohortId) {
      throw BadRequestError('cohortId required: pass as query param or set currentCohortId on user');
    }

    log.info('Fetching unscored journals for KP', {
      kpUserId: user.id,
      cohortId,
    });

    const journals = await listUnscoredJournalsForKP(user.id, cohortId, user.organizationId);

    log.info('Unscored journals fetched', { count: journals.length });

    return ApiResponse.success(journals);
  },
});
