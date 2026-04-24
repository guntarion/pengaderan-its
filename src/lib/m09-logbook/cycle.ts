/**
 * src/lib/m09-logbook/cycle.ts
 * NAWASENA M09 — Kasuh biweekly cycle computation utilities.
 *
 * Cycle is computed per-pair from KasuhPair.createdAt + 14-day intervals.
 * Cycle 1 = days 1-14 after pair creation, cycle 2 = days 15-28, etc.
 */

const CYCLE_DAYS = 14;
const OVERDUE_GRACE_DAYS = 3;

/**
 * Compute the current cycle number for a KasuhPair.
 *
 * @param pairCreatedAt - Date the pair was created
 * @param asOf          - Date to compute cycle for (usually now)
 * @returns Cycle number (1-based), minimum 1
 */
export function computeCycleNumber(pairCreatedAt: Date, asOf: Date): number {
  const diffMs = asOf.getTime() - pairCreatedAt.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return Math.max(1, Math.floor(diffDays / CYCLE_DAYS) + 1);
}

/**
 * Compute the due date for a specific cycle.
 * Due date = pairCreatedAt + (cycleNumber * 14 days)
 *
 * @param pairCreatedAt - Date the pair was created
 * @param cycleNumber   - Cycle number (1-based)
 */
export function computeCycleDueDate(pairCreatedAt: Date, cycleNumber: number): Date {
  const dueMs = pairCreatedAt.getTime() + cycleNumber * CYCLE_DAYS * 24 * 60 * 60 * 1000;
  return new Date(dueMs);
}

/**
 * Check if a cycle is overdue (> dueDate + 3 days).
 *
 * @param pairCreatedAt - Date the pair was created
 * @param cycleNumber   - Cycle to check
 * @param asOf          - Current date
 */
export function isOverdue(pairCreatedAt: Date, cycleNumber: number, asOf: Date): boolean {
  const dueDate = computeCycleDueDate(pairCreatedAt, cycleNumber);
  const overdueThreshold = new Date(
    dueDate.getTime() + OVERDUE_GRACE_DAYS * 24 * 60 * 60 * 1000,
  );
  return asOf > overdueThreshold;
}

/**
 * Get the cycle status for the current cycle.
 *
 * @param pairCreatedAt - Date the pair was created
 * @param now           - Current date
 * @returns 'on-track' | 'due' | 'overdue'
 */
export function getCycleStatus(
  pairCreatedAt: Date,
  now: Date,
): 'on-track' | 'due' | 'overdue' {
  const currentCycle = computeCycleNumber(pairCreatedAt, now);
  const dueDate = computeCycleDueDate(pairCreatedAt, currentCycle);

  if (isOverdue(pairCreatedAt, currentCycle, now)) {
    return 'overdue';
  }

  // "Due" = within 3 days before or after due date
  const daysUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntilDue <= 3) {
    return 'due';
  }

  return 'on-track';
}
