/**
 * src/app/api/journal/[weekNumber]/route.ts
 * NAWASENA M04 — Get journal or draft for a specific week.
 *
 * GET /api/journal/[weekNumber]?cohortId=... — Returns submitted journal or draft.
 */

import { createApiHandler, ApiResponse, validateQuery, validateParams } from '@/lib/api';
import { z } from 'zod';
import { getJournalByWeek } from '@/lib/journal/service';

const paramsSchema = z.object({
  weekNumber: z.coerce.number().int().min(1),
});

const querySchema = z.object({
  cohortId: z.string().min(1),
});

/**
 * GET /api/journal/[weekNumber]?cohortId=...
 * Returns the journal entry (submitted or draft) for a given week.
 */
export const GET = createApiHandler({
  auth: true,
  handler: async (req, { user, params, log }) => {
    const { weekNumber } = validateParams(params, paramsSchema);
    const { cohortId } = validateQuery(req, querySchema);

    log.info('Fetching journal by week', { userId: user.id, weekNumber, cohortId });

    const result = await getJournalByWeek(user.id, cohortId, weekNumber);

    if (result.type === 'none') {
      return ApiResponse.success({ type: 'none', data: null });
    }

    if (result.type === 'submitted') {
      return ApiResponse.success({ type: 'submitted', data: result.journal });
    }

    return ApiResponse.success({ type: 'draft', data: result.draft });
  },
});
