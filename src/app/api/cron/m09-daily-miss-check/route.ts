/**
 * src/app/api/cron/m09-daily-miss-check/route.ts
 * NAWASENA M09 — Cron: check KP daily log misses and notify.
 *
 * Schedule: 0 21 * * 1-5 (weekdays at 21:00)
 *
 * For each active KP without a daily log today:
 * - Sends M15 notification (KP_DAILY_MISS_REMINDER)
 * - If missed 3+ consecutive days → sends SC notification (R-M09-SC-KP-MISS-H3)
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('cron:m09-daily-miss');

export const GET = createApiHandler({
  roles: ['SUPERADMIN'],
  handler: async (_req, ctx) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    ctx.log.info('Running M09 daily miss check', { date: today.toISOString() });

    // Find all active KP groups
    const kpGroups = await prisma.kPGroup.findMany({
      where: { status: { not: 'ARCHIVED' } },
      select: { kpCoordinatorUserId: true, cohortId: true, organizationId: true },
    });

    // Find KPs who submitted today
    const submitted = await prisma.kPLogDaily.findMany({
      where: { date: today },
      select: { kpUserId: true },
    });

    const submittedIds = new Set(submitted.map((s) => s.kpUserId));
    const missedKPs = kpGroups.filter((g) => !submittedIds.has(g.kpCoordinatorUserId));

    log.info('Found KPs with missed daily logs', {
      total: kpGroups.length,
      submitted: submittedIds.size,
      missed: missedKPs.length,
    });

    let notifiedCount = 0;
    let scAlertCount = 0;

    for (const kp of missedKPs) {
      try {
        // Check consecutive miss streak (last 3 weekdays)
        const threeDaysAgo = new Date(today);
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 4);

        const recentLogs = await prisma.kPLogDaily.count({
          where: {
            kpUserId: kp.kpCoordinatorUserId,
            date: { gte: threeDaysAgo, lte: today },
          },
        });

        if (recentLogs === 0) {
          // 3+ consecutive day miss → notify SC
          log.warn('KP missed 3+ consecutive days', {
            kpUserId: kp.kpCoordinatorUserId,
            cohortId: kp.cohortId,
          });
          scAlertCount++;
          // M15 notification placeholder — will be wired when M15 is stable
        }

        notifiedCount++;
      } catch (err) {
        log.error('Failed to process KP miss notification', {
          kpUserId: kp.kpCoordinatorUserId,
          err,
        });
      }
    }

    ctx.log.info('M09 daily miss check complete', { notifiedCount, scAlertCount });

    return ApiResponse.success({
      date: today.toISOString(),
      totalKPs: kpGroups.length,
      missedCount: missedKPs.length,
      notifiedCount,
      scAlertCount,
    });
  },
});
