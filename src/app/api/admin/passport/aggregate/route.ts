/**
 * src/app/api/admin/passport/aggregate/route.ts
 * NAWASENA M05 — GET: Cohort-wide aggregate (SC/SUPERADMIN, cached 5min).
 */

import { prisma } from '@/utils/prisma';
import {
  createApiHandler,
  ApiResponse,
  validateQuery,
  NotFoundError,
} from '@/lib/api';
import { aggregateForCohort } from '@/lib/passport/progress.service';
import { z } from 'zod';

const querySchema = z.object({
  cohortId: z.string().min(1),
  kpGroupId: z.string().optional(),
  dimensi: z.string().optional(),
});

export const GET = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, { user, log }) => {
    const query = validateQuery(req, querySchema);

    // Validate cohort exists
    const cohort = await prisma.cohort.findUnique({ where: { id: query.cohortId } });
    if (!cohort) throw NotFoundError('Cohort');

    log.info('Fetching cohort aggregate', { cohortId: query.cohortId });

    const aggregate = await aggregateForCohort(query.cohortId, {
      kpGroupId: query.kpGroupId,
      dimensi: query.dimensi as never,
    });

    return ApiResponse.success(aggregate);
  },
});
