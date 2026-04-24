/**
 * src/app/api/cron/m09-precompute-weekly-aggregate/route.ts
 * NAWASENA M09 — Cron: pre-compute weekly aggregate cache for all active KPs.
 *
 * Schedule: 0 22 * * SAT (Saturday 22:00)
 * Iterates over all KP users with active KPGroup memberships,
 * runs computeWeeklyContext for current week, stores in Redis.
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { prisma } from '@/utils/prisma';
import { computeWeeklyContext } from '@/lib/m09-aggregate/weekly-context';
import { withWeeklyCache } from '@/lib/m09-aggregate/weekly-cache';
import { createLogger } from '@/lib/logger';

const log = createLogger('cron:m09-precompute-weekly');

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

export const GET = createApiHandler({
  roles: ['SUPERADMIN'],
  handler: async (_req, ctx) => {
    const now = new Date();
    const weekNumber = getISOWeekNumber(now);
    const yearNumber = now.getFullYear();

    ctx.log.info('Starting M09 weekly aggregate pre-compute', { weekNumber, yearNumber });

    // Get all active KP group members
    const kpGroups = await prisma.kPGroup.findMany({
      where: { status: { not: 'ARCHIVED' } },
      select: {
        kpCoordinatorUserId: true,
        cohortId: true,
        id: true,
        organizationId: true,
      },
    });

    log.info('Found KP groups to pre-compute', { count: kpGroups.length, weekNumber, yearNumber });

    let successCount = 0;
    let failCount = 0;

    for (const kpGroup of kpGroups) {
      try {
        await withWeeklyCache(
          kpGroup.kpCoordinatorUserId,
          yearNumber,
          weekNumber,
          () =>
            computeWeeklyContext(
              kpGroup.kpCoordinatorUserId,
              weekNumber,
              yearNumber,
              kpGroup.cohortId,
            ),
        );
        successCount++;
      } catch (err) {
        log.error('Failed to pre-compute weekly context for KP', {
          kpUserId: kpGroup.kpCoordinatorUserId,
          err,
        });
        failCount++;
      }
    }

    log.info('M09 weekly aggregate pre-compute complete', {
      weekNumber,
      yearNumber,
      successCount,
      failCount,
    });

    return ApiResponse.success({
      weekNumber,
      yearNumber,
      processed: kpGroups.length,
      successCount,
      failCount,
    });
  },
});
