/**
 * src/lib/m09-aggregate/weekly-context.ts
 * NAWASENA M09 — Compute weekly context aggregate from KPLogDaily.
 *
 * Aggregates daily logs within a given ISO week range:
 *   - avgMood: average of moodAvg
 *   - redFlagBreakdown: count per red flag type
 *   - anecdoteList: short anecdotes with dates
 *   - dailyCount: number of daily logs submitted
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('m09:weekly-context');

export interface RedFlagBreakdown {
  MENANGIS?: number;
  SHUTDOWN?: number;
  KONFLIK?: number;
  INJURY?: number;
  WITHDRAW?: number;
  LAINNYA?: number;
  [key: string]: number | undefined;
}

export interface WeeklyContext {
  avgMood: number | null;
  redFlagBreakdown: RedFlagBreakdown;
  anecdoteList: Array<{ date: string; text: string }>;
  dailyCount: number;
  weekNumber: number;
  yearNumber: number;
}

/**
 * Compute weekly context from KPLogDaily entries for a given week.
 *
 * @param kpUserId    - The KP user ID
 * @param weekNumber  - ISO week number
 * @param yearNumber  - Year
 * @param cohortId    - Cohort for scoping
 */
export async function computeWeeklyContext(
  kpUserId: string,
  weekNumber: number,
  yearNumber: number,
  cohortId: string,
): Promise<WeeklyContext> {
  log.debug('Computing weekly context', { kpUserId, weekNumber, yearNumber });

  // Calculate week date range (Monday to Sunday)
  const { weekStart, weekEnd } = getWeekDateRange(weekNumber, yearNumber);

  const dailyLogs = await prisma.kPLogDaily.findMany({
    where: {
      kpUserId,
      cohortId,
      date: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
    select: {
      moodAvg: true,
      redFlagsObserved: true,
      anecdoteShort: true,
      date: true,
    },
    orderBy: { date: 'asc' },
  });

  if (dailyLogs.length === 0) {
    log.debug('No daily logs found for week', { kpUserId, weekNumber, yearNumber });
    return {
      avgMood: null,
      redFlagBreakdown: {},
      anecdoteList: [],
      dailyCount: 0,
      weekNumber,
      yearNumber,
    };
  }

  // Aggregate mood
  const totalMood = dailyLogs.reduce((sum, l) => sum + l.moodAvg, 0);
  const avgMood = Math.round((totalMood / dailyLogs.length) * 10) / 10;

  // Count red flags by type
  const redFlagBreakdown: RedFlagBreakdown = {};
  for (const log of dailyLogs) {
    for (const flag of log.redFlagsObserved) {
      redFlagBreakdown[flag] = (redFlagBreakdown[flag] ?? 0) + 1;
    }
  }

  // Collect anecdotes
  const anecdoteList = dailyLogs
    .filter((l) => l.anecdoteShort)
    .map((l) => ({
      date: l.date.toISOString().split('T')[0],
      text: l.anecdoteShort!,
    }));

  log.debug('Weekly context computed', {
    kpUserId,
    weekNumber,
    yearNumber,
    avgMood,
    dailyCount: dailyLogs.length,
    redFlagTypes: Object.keys(redFlagBreakdown),
  });

  return {
    avgMood,
    redFlagBreakdown,
    anecdoteList,
    dailyCount: dailyLogs.length,
    weekNumber,
    yearNumber,
  };
}

/**
 * Get Monday-Sunday date range for an ISO week number and year.
 */
function getWeekDateRange(weekNumber: number, yearNumber: number): { weekStart: Date; weekEnd: Date } {
  // Jan 4 is always in week 1 of the year
  const jan4 = new Date(yearNumber, 0, 4);
  // Find Monday of week 1
  const dayOfWeek = jan4.getDay() || 7; // 1=Mon, 7=Sun
  const week1Monday = new Date(jan4.getTime() - (dayOfWeek - 1) * 86400000);

  // Calculate target Monday
  const weekStart = new Date(week1Monday.getTime() + (weekNumber - 1) * 7 * 86400000);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}
