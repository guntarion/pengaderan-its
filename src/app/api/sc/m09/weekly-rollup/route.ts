/**
 * src/app/api/sc/m09/weekly-rollup/route.ts
 * NAWASENA M09 — SC API: weekly KP log rollup summary.
 *
 * GET /api/sc/m09/weekly-rollup?weekNumber=N&yearNumber=Y&cohortId=xxx
 * Roles: SC, SUPERADMIN, PEMBINA, DOSEN_WALI
 * Cache: 5 min
 */

import { createApiHandler, ApiResponse, validateQuery } from '@/lib/api';
import { getWeeklyRollup } from '@/lib/m09-aggregate/sc-rollup';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';

const SC_ROLES = ['SC', 'SUPERADMIN', 'PEMBINA', 'DOSEN_WALI'] as const;

const querySchema = z.object({
  weekNumber: z.coerce.number().int().min(1).max(53).optional(),
  yearNumber: z.coerce.number().int().optional(),
  cohortId: z.string().optional(),
});

function getISOWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
    )
  );
}

export const GET = createApiHandler({
  roles: SC_ROLES as unknown as string[],
  handler: async (req, ctx) => {
    const query = validateQuery(req, querySchema);
    const now = new Date();
    const weekNumber = query.weekNumber ?? getISOWeekNumber(now);
    const yearNumber = query.yearNumber ?? now.getFullYear();

    ctx.log.info('SC: fetching M09 weekly rollup', { weekNumber, yearNumber });

    // Resolve cohort: explicit param or user's current cohort
    let cohortId = query.cohortId;
    if (!cohortId) {
      const user = await prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { currentCohortId: true, organizationId: true },
      });
      // For SC, use latest cohort if none specified
      if (!user?.currentCohortId) {
        const latestCohort = await prisma.cohort.findFirst({
          where: { organizationId: user?.organizationId ?? '' },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        cohortId = latestCohort?.id ?? '';
      } else {
        cohortId = user.currentCohortId;
      }
    }

    if (!cohortId) {
      return ApiResponse.success(null);
    }

    const rollup = await getWeeklyRollup(cohortId, weekNumber, yearNumber);

    return ApiResponse.success(rollup);
  },
});
