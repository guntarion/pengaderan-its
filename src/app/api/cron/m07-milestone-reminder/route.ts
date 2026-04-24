/**
 * src/app/api/cron/m07-milestone-reminder/route.ts
 * NAWASENA M07 — Milestone reminder cron.
 *
 * Schedule (UTC): 0 1 * * * (08:00 WIB daily)
 * - For each active cohort with f2StartDate and f2EndDate configured:
 *   - Compute which M1/M2/M3 window is currently open (or overdue H+7)
 *   - Query Maba with ≥ 1 ACTIVE LifeMap who haven't submitted the current milestone
 *   - Send LIFE_MAP_MILESTONE_X_DUE notification
 *   - Send LIFE_MAP_MILESTONE_OVERDUE_REMINDER for H+7 overdue Maba
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse } from '@/lib/api';
import { verifyCronAuth } from '@/lib/notifications/cron-auth';
import { sendNotification } from '@/lib/notifications/send';
import { getMilestoneWindows } from '@/lib/life-map/milestone-timing';
import { MilestoneKey, LifeMapStatus } from '@prisma/client';
import { isWithinInterval, addDays } from 'date-fns';
import { createLogger } from '@/lib/logger';

const log = createLogger('cron:m07-milestone-reminder');

const MILESTONE_TEMPLATE_KEYS: Record<MilestoneKey, string> = {
  M1: 'LIFE_MAP_MILESTONE_1_DUE',
  M2: 'LIFE_MAP_MILESTONE_2_DUE',
  M3: 'LIFE_MAP_MILESTONE_3_DUE',
};

export const GET = createApiHandler({
  auth: false,
  handler: async (req, { log: ctx }) => {
    verifyCronAuth(req);

    ctx.info('M07 milestone reminder cron started');

    const now = new Date();

    // Fetch active cohorts with F2 dates configured
    const cohorts = await prisma.cohort.findMany({
      where: {
        f2StartDate: { not: null, lte: now },
        f2EndDate: { not: null, gte: now },
      },
      select: {
        id: true,
        name: true,
        f2StartDate: true,
        f2EndDate: true,
      },
    });

    ctx.info('Found active F2 cohorts', { count: cohorts.length });

    let totalNotifications = 0;
    let totalOverdue = 0;

    for (const cohort of cohorts) {
      if (!cohort.f2StartDate || !cohort.f2EndDate) continue;

      const cohortDates = {
        f2StartDate: cohort.f2StartDate,
        f2EndDate: cohort.f2EndDate,
      };

      const windows = getMilestoneWindows(cohortDates);

      // Find which milestone window is currently open
      const activeMilestone = windows.find((w) =>
        isWithinInterval(now, { start: w.openAt, end: w.closeAt }),
      );

      // Find which milestone window just went overdue (closeAt < now < closeAt + 7d)
      const overdueMilestone = windows.find((w) => {
        const overdueCutoff = addDays(w.closeAt, 7);
        return now > w.closeAt && now <= overdueCutoff;
      });

      // Get all Maba in this cohort with at least 1 ACTIVE LifeMap
      const mabaWithActiveGoals = await prisma.user.findMany({
        where: {
          currentCohortId: cohort.id,
          role: 'MABA',
          lifeMaps: {
            some: { cohortId: cohort.id, status: LifeMapStatus.ACTIVE },
          },
        },
        select: { id: true },
      });

      log.info('Maba with active goals', {
        cohortId: cohort.id,
        count: mabaWithActiveGoals.length,
        activeMilestone: activeMilestone?.milestone,
        overdueMilestone: overdueMilestone?.milestone,
      });

      // Send due reminders for active window
      if (activeMilestone) {
        const templateKey = MILESTONE_TEMPLATE_KEYS[activeMilestone.milestone];

        // Find Maba who haven't submitted this milestone
        const submittedUserIds = await prisma.lifeMapUpdate.findMany({
          where: {
            cohortId: cohort.id,
            milestone: activeMilestone.milestone,
          },
          select: { userId: true },
        });
        const submittedSet = new Set(submittedUserIds.map((u) => u.userId));

        const pendingMaba = mabaWithActiveGoals.filter((m) => !submittedSet.has(m.id));

        for (const maba of pendingMaba) {
          try {
            await sendNotification({
              userId: maba.id,
              templateKey,
              payload: {
                milestone: activeMilestone.milestone,
                cohortName: cohort.name,
                openAt: activeMilestone.openAt.toISOString(),
                closeAt: activeMilestone.closeAt.toISOString(),
              },
              category: 'FORM_REMINDER',
            });
            totalNotifications++;
          } catch (err) {
            log.error('Failed to send milestone reminder', {
              userId: maba.id,
              milestone: activeMilestone.milestone,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }

      // Send overdue reminders
      if (overdueMilestone) {
        const submittedUserIds = await prisma.lifeMapUpdate.findMany({
          where: {
            cohortId: cohort.id,
            milestone: overdueMilestone.milestone,
          },
          select: { userId: true },
        });
        const submittedSet = new Set(submittedUserIds.map((u) => u.userId));

        const overdueMaba = mabaWithActiveGoals.filter((m) => !submittedSet.has(m.id));

        for (const maba of overdueMaba) {
          try {
            await sendNotification({
              userId: maba.id,
              templateKey: 'LIFE_MAP_MILESTONE_OVERDUE_REMINDER',
              payload: {
                milestone: overdueMilestone.milestone,
                cohortName: cohort.name,
                closeAt: overdueMilestone.closeAt.toISOString(),
              },
              category: 'FORM_REMINDER',
            });
            totalOverdue++;
          } catch (err) {
            log.error('Failed to send overdue reminder', {
              userId: maba.id,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }
    }

    ctx.info('M07 milestone reminder cron complete', {
      totalNotifications,
      totalOverdue,
      cohorts: cohorts.length,
    });

    return ApiResponse.success({
      cohorts: cohorts.length,
      notificationsSent: totalNotifications,
      overdueRemindersSent: totalOverdue,
    });
  },
});
