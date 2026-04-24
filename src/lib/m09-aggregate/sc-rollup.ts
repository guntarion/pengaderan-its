/**
 * src/lib/m09-aggregate/sc-rollup.ts
 * NAWASENA M09 — SC weekly rollup aggregate service.
 *
 * Computes cohort-level summaries for SC monitoring:
 * - Total KP log submissions this week
 * - Red flag counts by severity
 * - Avg mood across all KPs
 * - Missing KPs
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { withCache, invalidateCache } from '@/lib/cache';

const log = createLogger('m09:sc-rollup');

const ROLLUP_TTL = 5 * 60; // 5 minutes
const ROLLUP_KEY = (weekNumber: number, yearNumber: number) =>
  `m09:sc-rollup:${yearNumber}:${weekNumber}`;

export interface WeeklyRollup {
  weekNumber: number;
  yearNumber: number;
  totalActiveKPs: number;
  submittedCount: number;
  submissionRate: number;
  avgMood: number | null;
  redFlagCounts: {
    severe: number;
    normal: number;
    total: number;
  };
  byGroup: Array<{
    kpGroupId: string;
    submitted: boolean;
    avgMood: number | null;
    redFlagCount: number;
  }>;
}

export async function getWeeklyRollup(
  cohortId: string,
  weekNumber: number,
  yearNumber: number,
): Promise<WeeklyRollup> {
  const key = ROLLUP_KEY(weekNumber, yearNumber);

  return withCache(key, ROLLUP_TTL, async () => {
    log.debug('Computing SC weekly rollup', { cohortId, weekNumber, yearNumber });

    // Get all active KP groups in cohort
    const kpGroups = await prisma.kPGroup.findMany({
      where: { cohortId, status: { not: 'ARCHIVED' } },
      select: { id: true, kpCoordinatorUserId: true },
    });

    if (kpGroups.length === 0) {
      return {
        weekNumber,
        yearNumber,
        totalActiveKPs: 0,
        submittedCount: 0,
        submissionRate: 0,
        avgMood: null,
        redFlagCounts: { severe: 0, normal: 0, total: 0 },
        byGroup: [],
      };
    }

    const kpUserIds = kpGroups.map((g) => g.kpCoordinatorUserId);

    // Get weekly debriefs for this week
    const weeklyLogs = await prisma.kPLogWeekly.findMany({
      where: { kpUserId: { in: kpUserIds }, weekNumber, yearNumber },
      select: { kpUserId: true },
    });
    const submittedIds = new Set(weeklyLogs.map((l) => l.kpUserId));

    // Get daily logs for this week's mood and red flags
    // ISO week start/end computation
    const jan4 = new Date(yearNumber, 0, 4);
    const weekStart = new Date(jan4);
    weekStart.setDate(jan4.getDate() + 7 * (weekNumber - 1) - ((jan4.getDay() + 6) % 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const dailyLogs = await prisma.kPLogDaily.findMany({
      where: {
        kpUserId: { in: kpUserIds },
        date: { gte: weekStart, lt: weekEnd },
      },
      select: { kpUserId: true, moodAvg: true, redFlagsObserved: true },
    });

    // Compute aggregates
    const moodAvgs = dailyLogs.map((d) => d.moodAvg);
    const avgMood = moodAvgs.length > 0 ? moodAvgs.reduce((a, b) => a + b, 0) / moodAvgs.length : null;

    const SEVERE_FLAGS = ['INJURY', 'SHUTDOWN'];
    let severeCount = 0;
    let normalCount = 0;

    for (const log of dailyLogs) {
      for (const flag of log.redFlagsObserved) {
        if (SEVERE_FLAGS.includes(flag)) {
          severeCount++;
        } else {
          normalCount++;
        }
      }
    }

    // Per-group breakdown
    const byGroup = kpGroups.map((group) => {
      const groupDailyLogs = dailyLogs.filter((d) => d.kpUserId === group.kpCoordinatorUserId);
      const groupMoods = groupDailyLogs.map((d) => d.moodAvg);
      const groupRedFlags = groupDailyLogs.flatMap((d) => d.redFlagsObserved);

      return {
        kpGroupId: group.id,
        submitted: submittedIds.has(group.kpCoordinatorUserId),
        avgMood: groupMoods.length > 0 ? groupMoods.reduce((a, b) => a + b, 0) / groupMoods.length : null,
        redFlagCount: groupRedFlags.length,
      };
    });

    return {
      weekNumber,
      yearNumber,
      totalActiveKPs: kpGroups.length,
      submittedCount: submittedIds.size,
      submissionRate: kpGroups.length > 0 ? submittedIds.size / kpGroups.length : 0,
      avgMood,
      redFlagCounts: {
        severe: severeCount,
        normal: normalCount,
        total: severeCount + normalCount,
      },
      byGroup,
    };
  });
}

export async function invalidateSCRollupCache(weekNumber: number, yearNumber: number) {
  await invalidateCache(ROLLUP_KEY(weekNumber, yearNumber));
}
