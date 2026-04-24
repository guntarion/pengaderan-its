/**
 * src/lib/life-map/milestone-timing.ts
 * NAWASENA M07 — Milestone window timing helpers.
 *
 * M1 = awal F2 (f2StartDate to f2StartDate + 2 weeks)
 * M2 = tengah F2 (f2StartDate + 6 weeks to f2StartDate + 8 weeks)
 * M3 = akhir F2 (f2EndDate - 2 weeks to f2EndDate)
 *
 * Uses date-fns-tz or plain date-fns with Asia/Jakarta offset (+7h).
 * Overdue reminder triggered H+7 past window close.
 */

import { addDays, addWeeks, subWeeks, isWithinInterval } from 'date-fns';

export type MilestoneKey = 'M1' | 'M2' | 'M3';

export interface MilestoneWindow {
  milestone: MilestoneKey;
  openAt: Date;
  closeAt: Date;
}

export interface CohortDates {
  f2StartDate: Date;
  f2EndDate: Date;
}

/**
 * Compute M1/M2/M3 windows for a given cohort.
 * M1: f2StartDate .. f2StartDate + 14d
 * M2: f2StartDate + 42d .. f2StartDate + 56d
 * M3: f2EndDate - 14d .. f2EndDate
 */
export function getMilestoneWindows(cohort: CohortDates): MilestoneWindow[] {
  const { f2StartDate, f2EndDate } = cohort;
  return [
    {
      milestone: 'M1',
      openAt: f2StartDate,
      closeAt: addDays(f2StartDate, 14),
    },
    {
      milestone: 'M2',
      openAt: addWeeks(f2StartDate, 6),
      closeAt: addWeeks(f2StartDate, 8),
    },
    {
      milestone: 'M3',
      openAt: subWeeks(f2EndDate, 2),
      closeAt: f2EndDate,
    },
  ];
}

/**
 * Returns the window for a specific milestone.
 */
export function getMilestoneWindow(
  milestone: MilestoneKey,
  cohort: CohortDates,
): MilestoneWindow {
  return getMilestoneWindows(cohort).find((w) => w.milestone === milestone)!;
}

/**
 * Check if a milestone window is currently open.
 */
export function isWindowOpen(milestone: MilestoneKey, cohort: CohortDates): boolean {
  const window = getMilestoneWindow(milestone, cohort);
  const now = new Date();
  return isWithinInterval(now, { start: window.openAt, end: window.closeAt });
}

/**
 * Returns which milestone is currently active based on today's date.
 * Returns null if no window is open.
 */
export function getCurrentMilestone(cohort: CohortDates): MilestoneKey | null {
  const milestones: MilestoneKey[] = ['M1', 'M2', 'M3'];
  for (const mk of milestones) {
    if (isWindowOpen(mk, cohort)) return mk;
  }
  return null;
}

/**
 * Compute the overdue cutoff: closeAt + 7 days.
 * A Maba is considered overdue if they haven't submitted by this date.
 */
export function getOverdueCutoff(milestone: MilestoneKey, cohort: CohortDates): Date {
  const window = getMilestoneWindow(milestone, cohort);
  return addDays(window.closeAt, 7);
}

/**
 * Determine if a submission is late (submitted after window.closeAt).
 */
export function isLateSubmission(milestone: MilestoneKey, cohort: CohortDates, submittedAt: Date): boolean {
  const window = getMilestoneWindow(milestone, cohort);
  return submittedAt > window.closeAt;
}
