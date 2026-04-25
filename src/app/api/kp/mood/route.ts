/**
 * src/app/api/kp/mood/route.ts
 * NAWASENA M04 — KP mood aggregate endpoint.
 *
 * GET /api/kp/mood?cohortId=...&kpGroupId=... — Get mood aggregate for KP's group.
 * Cached in Redis (1h TTL). Shows not-checked-in list after 20:00 local.
 */

import { createApiHandler, ApiResponse, validateQuery, BadRequestError } from '@/lib/api';
import { z } from 'zod';
import { getAggregateCached, listNotCheckedIn } from '@/lib/mood-aggregate/service';
import { resolveMabaForKP } from '@/lib/kp-group-resolver/resolve-maba-for-kp';
import { getOrgTimezoneByOrgId } from '@/lib/pulse/service';
import { getLocalDateString } from '@/lib/pulse/local-date';
import { prisma } from '@/utils/prisma';

const querySchema = z.object({
  cohortId: z.string().min(1),
  kpGroupId: z.string().min(1),
});

/**
 * GET /api/kp/mood
 * Returns mood aggregate + not-checked-in list for a KP group.
 */
export const GET = createApiHandler({
  auth: true,
  handler: async (req, { user, log }) => {
    if (!user.organizationId) {
      throw BadRequestError('User has no organization');
    }

    const { cohortId, kpGroupId } = validateQuery(req, querySchema);

    log.info('Fetching KP mood aggregate', {
      kpUserId: user.id,
      cohortId,
      kpGroupId,
    });

    const timezone = await getOrgTimezoneByOrgId(user.organizationId);

    const aggregate = await getAggregateCached(user.id, cohortId, kpGroupId, timezone);

    if (!aggregate) {
      log.warn('No Maba in KP group or KP not assigned', { kpUserId: user.id, cohortId });
      return ApiResponse.success({
        aggregate: null,
        notCheckedIn: [],
        currentHour: new Date().getHours(),
      });
    }

    // Determine not-checked-in (only after 20:00 local)
    const mabaInfo = await resolveMabaForKP(user.id, cohortId);
    const localDateStr = getLocalDateString(new Date(), timezone);

    // Get current local hour for time-gate check
    const localHour = parseInt(
      new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false,
      }).format(new Date()),
      10,
    );

    const notCheckedInIds =
      mabaInfo && localHour >= 20
        ? await listNotCheckedIn(kpGroupId, mabaInfo.mabaUserIds, localDateStr, localHour)
        : [];

    // Resolve names for not-checked-in users
    let notCheckedIn: Array<{ id: string; fullName: string; displayName: string | null }> = [];
    if (notCheckedInIds.length > 0) {
      notCheckedIn = await prisma.user.findMany({
        where: { id: { in: notCheckedInIds } },
        select: { id: true, fullName: true, displayName: true },
      });
    }

    log.info('KP mood aggregate fetched', {
      kpUserId: user.id,
      avgMood: aggregate.avgMood,
      totalSubmitted: aggregate.totalSubmitted,
      notCheckedInCount: notCheckedInIds.length,
    });

    return ApiResponse.success({
      aggregate,
      notCheckedIn,
      currentHour: localHour,
      timezone,
    });
  },
});
