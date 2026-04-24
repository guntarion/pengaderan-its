/**
 * src/lib/journal/week-number.ts
 * NAWASENA M04 — ISO week number helper for journal grouping.
 *
 * Returns the NAWASENA week number (1-based) relative to the cohort start date.
 * Week 1 = the week (Mon-Sun) in which cohortStartDate falls.
 * Uses date-fns-tz for timezone-aware calculation.
 */

import { startOfWeek } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const DEFAULT_TIMEZONE = 'Asia/Jakarta';

/**
 * Get the NAWASENA week number for a target date relative to cohort start.
 *
 * @param cohortStartDate - Date the cohort officially begins (UTC)
 * @param targetDate      - The date to compute the week number for (UTC)
 * @param timezone        - IANA timezone string
 * @returns Week number (1 = week of cohort start, 2 = next week, etc.)
 *          Returns 0 or negative if targetDate is before cohortStartDate's week.
 */
export function getWeekNumber(
  cohortStartDate: Date,
  targetDate: Date,
  timezone: string = DEFAULT_TIMEZONE,
): number {
  // Convert to local timezone
  const cohortLocal = toZonedTime(cohortStartDate, timezone);
  const targetLocal = toZonedTime(targetDate, timezone);

  // Get Monday of each week (weekStartsOn: 1 = Monday)
  const cohortWeekStart = startOfWeek(cohortLocal, { weekStartsOn: 1 });
  const targetWeekStart = startOfWeek(targetLocal, { weekStartsOn: 1 });

  // Compute difference in weeks
  const diffMs = targetWeekStart.getTime() - cohortWeekStart.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7) + 1;

  return weekNumber;
}

/**
 * Get the start and end dates of a given NAWASENA week number.
 *
 * @param cohortStartDate - Cohort start date (UTC)
 * @param weekNumber      - Week number (1-based)
 * @param timezone        - IANA timezone string
 * @returns { weekStartDate, weekEndDate } as Date objects (representing local dates)
 */
export function getWeekDates(
  cohortStartDate: Date,
  weekNumber: number,
  timezone: string = DEFAULT_TIMEZONE,
): { weekStartDate: Date; weekEndDate: Date } {
  const cohortLocal = toZonedTime(cohortStartDate, timezone);
  const cohortWeekStart = startOfWeek(cohortLocal, { weekStartsOn: 1 });

  const weekOffsetMs = (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000;
  const weekStartDate = new Date(cohortWeekStart.getTime() + weekOffsetMs);
  const weekEndDate = new Date(weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000);

  return { weekStartDate, weekEndDate };
}

/**
 * Get the current week number based on current time and cohort start.
 */
export function getCurrentWeekNumber(
  cohortStartDate: Date,
  timezone: string = DEFAULT_TIMEZONE,
): number {
  return getWeekNumber(cohortStartDate, new Date(), timezone);
}
