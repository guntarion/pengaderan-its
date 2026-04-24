/**
 * src/lib/anon-report/aggregate.ts
 * NAWASENA M12 — Aggregate statistics with cell-floor privacy protection.
 *
 * Cell floor: if count < minCellSize → count=null, masked=true.
 * This prevents de-identification of small cohorts.
 *
 * Cached with withCache TTL 300s per cohortId+date.
 *
 * PRIVACY: SC role sees aggregate only — no drill-down to individual reports.
 */

import { prisma } from '@/utils/prisma';
import { withCache } from '@/lib/cache';
import { createLogger } from '@/lib/logger';
import type { AggregateRow } from './types';

const log = createLogger('anon-aggregate');

const DEFAULT_MIN_CELL_SIZE = 3;

/**
 * Aggregate anon reports for a cohort with cell-floor masking.
 *
 * @param cohortId - The cohort ID to aggregate (or undefined for all)
 * @param minCellSize - Minimum count to show (default: 3)
 * @returns Array of AggregateRow with masked cells where count < minCellSize
 */
export async function aggregateAnonReports(
  cohortId: string | undefined,
  minCellSize = DEFAULT_MIN_CELL_SIZE,
): Promise<AggregateRow[]> {
  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const cacheKey = `m12:aggregate:${cohortId ?? 'all'}:${dateStr}`;

  return withCache(cacheKey, 300, async () => {
    log.info('Computing anon report aggregate', { cohortId, minCellSize });

    type RawRow = {
      category: string;
      severity: string;
      status: string;
      count: bigint;
    };

    let rows: RawRow[];

    if (cohortId) {
      rows = await prisma.$queryRaw<RawRow[]>`
        SELECT category, severity, status, COUNT(*) as count
        FROM anon_reports
        WHERE "cohortId" = ${cohortId}
        GROUP BY category, severity, status
        ORDER BY category, severity, status
      `;
    } else {
      rows = await prisma.$queryRaw<RawRow[]>`
        SELECT category, severity, status, COUNT(*) as count
        FROM anon_reports
        GROUP BY category, severity, status
        ORDER BY category, severity, status
      `;
    }

    const result: AggregateRow[] = rows.map((r) => {
      const count = Number(r.count);
      const masked = count < minCellSize;
      return {
        category: r.category as AggregateRow['category'],
        severity: r.severity as AggregateRow['severity'],
        status: r.status as AggregateRow['status'],
        count: masked ? null : count,
        masked,
      };
    });

    log.info('Aggregate computed', {
      rowCount: result.length,
      maskedRows: result.filter((r) => r.masked).length,
    });

    return result;
  });
}
