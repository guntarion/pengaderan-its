/**
 * src/app/api/kp/peer-debriefs/route.ts
 * NAWASENA M09 — KP peer debrief list
 *
 * GET /api/kp/peer-debriefs?weekNumber=N&yearNumber=Y
 * Roles: KP
 */

import { createApiHandler, ApiResponse, validateQuery } from '@/lib/api';
import { getPeerDebriefList } from '@/lib/m09-access/peer-cohort-resolver';
import { z } from 'zod';

const querySchema = z.object({
  weekNumber: z.coerce.number().int().min(1).max(53).optional(),
  yearNumber: z.coerce.number().int().optional(),
});

export const GET = createApiHandler({
  roles: ['KP'],
  handler: async (req, ctx) => {
    const kpUserId = ctx.user.id;
    const query = validateQuery(req, querySchema);

    const now = new Date();
    const weekNumber = query.weekNumber ?? getISOWeekNumber(now);
    const yearNumber = query.yearNumber ?? now.getFullYear();

    ctx.log.info('Fetching peer debriefs', { kpUserId, weekNumber, yearNumber });

    const peers = await getPeerDebriefList(kpUserId, weekNumber, yearNumber);

    return ApiResponse.success({ peers, weekNumber, yearNumber });
  },
});

function getISOWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
    )
  );
}
