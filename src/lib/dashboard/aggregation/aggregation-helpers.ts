/**
 * src/lib/dashboard/aggregation/aggregation-helpers.ts
 * Privacy-aware aggregation helpers for M13 Dashboard.
 *
 * MANDATORY: aggregateWithCellFloor() must be used for any M11 MH or M12 anon aggregates
 * to prevent individual identification (k-anonymity principle, minimum cell size = 5).
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('m13/aggregation-helpers');

/**
 * Wraps an async aggregation query with cell-floor enforcement.
 * Returns null if the resulting count is below the minimum cell size,
 * protecting individual privacy in small cohort segments.
 *
 * @param queryFn   - Async function returning { count, data }
 * @param minCell   - Minimum group size for k-anonymity (default: 5)
 * @returns The aggregated data, or null if count < minCell
 */
export async function aggregateWithCellFloor<T>(
  queryFn: () => Promise<{ count: number; data: T }>,
  minCell = 5,
): Promise<T | null> {
  try {
    const result = await queryFn();
    if (result.count < minCell) {
      log.debug('Cell floor applied — suppressing result', {
        count: result.count,
        minCell,
      });
      return null;
    }
    return result.data;
  } catch (err) {
    log.error('aggregateWithCellFloor query failed', { error: err });
    throw err;
  }
}

/**
 * Calculate percentage with null-safe division.
 */
export function safePercent(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 100 * 10) / 10; // 1 decimal place
}

/**
 * Calculate trend direction from an array of values.
 * Returns 'up', 'down', or 'stable'.
 */
export function calcTrend(values: number[]): 'up' | 'down' | 'stable' {
  if (values.length < 2) return 'stable';
  const first = values[0];
  const last = values[values.length - 1];
  const diff = last - first;
  if (Math.abs(diff) < 0.05) return 'stable';
  return diff > 0 ? 'up' : 'down';
}

/**
 * Get date N days ago (midnight UTC).
 */
export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Round to 2 decimal places.
 */
export function round2(n: number | null | undefined): number | null {
  if (n == null) return null;
  return Math.round(n * 100) / 100;
}
