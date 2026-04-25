/**
 * src/app/api/journal/route.ts
 * NAWASENA M04 — Journal list endpoint.
 *
 * GET /api/journal — List all journals for the current user (Maba).
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { listJournals } from '@/lib/journal/service';
import { z } from 'zod';
import { validateQuery } from '@/lib/api';

const querySchema = z.object({
  cohortId: z.string().min(1),
});

/**
 * GET /api/journal
 * Returns all journals (submitted only) for the current user, newest week first.
 */
export const GET = createApiHandler({
  auth: true,
  handler: async (req, { user, log }) => {
    const { cohortId } = validateQuery(req, querySchema);

    log.info('Listing journals', { userId: user.id, cohortId });

    const journals = await listJournals(user.id, cohortId);

    log.info('Journals listed', { userId: user.id, count: journals.length });

    return ApiResponse.success(journals);
  },
});
