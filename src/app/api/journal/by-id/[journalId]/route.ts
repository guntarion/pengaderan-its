/**
 * src/app/api/journal/by-id/[journalId]/route.ts
 * NAWASENA M04 — Get a journal by ID for KP review.
 *
 * GET /api/journal/by-id/[journalId] — KP reads a Maba's journal (with RLS bypass + audit).
 * Roles: KP, SC, SUPERADMIN
 */

import { createApiHandler, ApiResponse, validateParams, BadRequestError, NotFoundError, ForbiddenError } from '@/lib/api';
import { z } from 'zod';
import { getJournalForKPReview } from '@/lib/journal/kp-accessor';

const paramsSchema = z.object({
  journalId: z.string().min(1),
});

export const GET = createApiHandler({
  auth: true,
  handler: async (_req, { user, params, log }) => {
    if (!user.organizationId) {
      throw BadRequestError('User has no organization');
    }

    const { journalId } = validateParams(params, paramsSchema);

    log.info('KP requesting journal by ID', { journalId, kpUserId: user.id });

    try {
      const journal = await getJournalForKPReview(journalId, user.id, user.organizationId);

      if (!journal) {
        throw NotFoundError('Journal');
      }

      log.info('Journal fetched for KP review', { journalId, kpUserId: user.id });

      return ApiResponse.success(journal);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Forbidden')) {
        throw ForbiddenError();
      }
      throw err;
    }
  },
});
