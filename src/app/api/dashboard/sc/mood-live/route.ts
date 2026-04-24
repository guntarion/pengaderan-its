/**
 * src/app/api/dashboard/sc/mood-live/route.ts
 * GET /api/dashboard/sc/mood-live
 * Polling endpoint for live mood data — SC role only.
 * Cache: 60 seconds per cohort. Rate limit: 30 req/min/user.
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { ForbiddenError, NotFoundError } from '@/lib/api';
import { getTodayMoodAvg } from '@/lib/dashboard/aggregation/live-compute';

export const GET = createApiHandler({
  auth: true,
  handler: async (_req, { user, log }) => {
    const userRole = (user as { role?: string }).role;

    // Only SC and SUPERADMIN can access cohort-wide mood polling
    if (userRole !== 'SC' && userRole !== 'SUPERADMIN') {
      throw ForbiddenError('Hanya SC yang dapat mengakses data mood polling');
    }

    const cohortId = (user as { cohortId?: string }).cohortId;
    if (!cohortId) {
      throw NotFoundError('User tidak tergabung dalam cohort aktif');
    }

    log.debug('SC mood-live polled', { userId: user.id, cohortId });

    const moodData = await getTodayMoodAvg(cohortId);

    return ApiResponse.success({
      cohortId,
      polledAt: new Date().toISOString(),
      ...moodData,
    });
  },
});
