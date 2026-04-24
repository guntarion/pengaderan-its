/**
 * GET /api/event/instances
 * Maba listing — 3 buckets (Upcoming/Ongoing/Past) with own RSVP status.
 * Auth required. Scoped by user's current cohort (looked up from DB).
 */

import { createApiHandler, ApiResponse, validateQuery } from '@/lib/api';
import { getListingForMaba } from '@/lib/event/services/instance.service';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';

const querySchema = z.object({
  fase: z.string().optional(),
  kategori: z.string().optional(),
});

export const GET = createApiHandler({
  auth: true,
  handler: async (req, { user, log }) => {
    const { fase, kategori } = validateQuery(req, querySchema);

    // Look up cohortId from DB — LLMAuthUser does not carry cohortId
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { currentCohortId: true },
    });

    if (!dbUser?.currentCohortId) {
      log.warn('User has no cohort — returning empty listing', { userId: user.id });
      return ApiResponse.success({ upcoming: [], ongoing: [], past: [] });
    }

    log.info('Fetching Maba event listing', { userId: user.id, cohortId: dbUser.currentCohortId });

    const listing = await getListingForMaba(
      user.id,
      dbUser.currentCohortId,
      { fase, kategori },
    );

    return ApiResponse.success(listing);
  },
});
