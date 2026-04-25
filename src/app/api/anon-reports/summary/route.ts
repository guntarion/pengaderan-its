/**
 * src/app/api/anon-reports/summary/route.ts
 * GET /api/anon-reports/summary
 *
 * Aggregate statistics for SC/BLM/Satgas/SUPERADMIN.
 * SC role can ONLY access this endpoint (not detail).
 * Uses cell floor 3 to prevent de-identification.
 * Cached with withCache TTL 5 minutes.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateQuery } from '@/lib/api';
import { withCache, CACHE_TTL } from '@/lib/cache';
import { setAnonSessionVars } from '@/lib/anon-report/rls-helpers';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';

const log = createLogger('anon-summary');

const summaryQuerySchema = z.object({
  cohortId: z.string().optional(),
  organizationId: z.string().optional(),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
});

const MIN_CELL_SIZE = 3;

export const GET = createApiHandler({
  roles: ['BLM', 'SATGAS_PPKPT', 'SC', 'SUPERADMIN'],
  handler: async (req, { user, log: reqLog }) => {
    const query = validateQuery(req, summaryQuerySchema);

    reqLog.info('Fetching anon report aggregate', {
      role: user.role,
      hasFilter: !!(query.cohortId || query.organizationId),
    });

    const cacheKey = `anon-summary:${user.role}:${query.cohortId ?? 'all'}:${query.organizationId ?? 'all'}:${query.periodStart ?? ''}:${query.periodEnd ?? ''}`;

    const aggregate = await withCache(
      cacheKey,
      CACHE_TTL.MEDIUM, // 5 min
      async () => {
        return prisma.$transaction(async (tx) => {
          await setAnonSessionVars(tx, user);

          // Build where conditions
          const conditions: string[] = ['1=1'];
          const values: unknown[] = [];
          let paramIdx = 1;

          if (query.cohortId) {
            conditions.push(`"cohortId" = $${paramIdx++}`);
            values.push(query.cohortId);
          }

          if (query.organizationId && user.role !== 'SC') {
            // SC cannot filter by org (aggregate only, cell floor enforced)
            conditions.push(`"organizationId" = $${paramIdx++}`);
            values.push(query.organizationId);
          }

          if (query.periodStart) {
            conditions.push(`"recordedAt" >= $${paramIdx++}`);
            values.push(new Date(query.periodStart));
          }

          if (query.periodEnd) {
            conditions.push(`"recordedAt" <= $${paramIdx++}`);
            values.push(new Date(query.periodEnd));
          }

          const whereClause = conditions.join(' AND ');

          type AggRow = { category: string; severity: string; status: string; count: bigint };

          const rows = await tx.$queryRawUnsafe<AggRow[]>(
            `SELECT category, severity, status, COUNT(*) as count
             FROM anon_reports
             WHERE ${whereClause}
             GROUP BY category, severity, status`,
            ...values,
          );

          // Apply cell floor: mask cells with count < MIN_CELL_SIZE
          return rows.map((r) => {
            const count = Number(r.count);
            return {
              category: r.category,
              severity: r.severity,
              status: r.status,
              count: count >= MIN_CELL_SIZE ? count : null,
              masked: count < MIN_CELL_SIZE,
            };
          });
        });
      },
    );

    // Compute totals
    const totals = {
      submitted: aggregate.reduce((sum, r) => sum + (r.count ?? 0), 0),
      escalated: aggregate
        .filter((r) => r.status === 'ESCALATED_TO_SATGAS')
        .reduce((sum, r) => sum + (r.count ?? 0), 0),
      resolved: aggregate
        .filter((r) => r.status === 'RESOLVED')
        .reduce((sum, r) => sum + (r.count ?? 0), 0),
    };

    log.info('Summary computed', { rowCount: aggregate.length });

    return ApiResponse.success({ aggregate, totals });
  },
});
