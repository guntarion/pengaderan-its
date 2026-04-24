/**
 * src/app/api/sc/m09/red-flag-feed/route.ts
 * NAWASENA M09 — SC API: red flag feed (paginated, severity tier).
 *
 * GET /api/sc/m09/red-flag-feed?page=1&pageSize=20&severity=severe|normal|all&cohortId=xxx
 * Roles: SC, SUPERADMIN, PEMBINA, DOSEN_WALI
 */

import { createApiHandler, ApiResponse, validateQuery } from '@/lib/api';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';

const SC_ROLES = ['SC', 'SUPERADMIN', 'PEMBINA', 'DOSEN_WALI'] as const;
const SEVERE_FLAGS = ['INJURY', 'SHUTDOWN'];

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  severity: z.enum(['severe', 'normal', 'all']).default('all'),
  cohortId: z.string().optional(),
  weekNumber: z.coerce.number().int().optional(),
  yearNumber: z.coerce.number().int().optional(),
});

export const GET = createApiHandler({
  roles: SC_ROLES as unknown as string[],
  handler: async (req, ctx) => {
    const query = validateQuery(req, querySchema);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const severity = query.severity ?? 'all';
    const skip = (page - 1) * pageSize;

    ctx.log.info('SC: fetching M09 red flag feed', { severity, page, pageSize });

    // Resolve cohort
    let cohortId = query.cohortId;
    if (!cohortId) {
      const user = await prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { currentCohortId: true },
      });
      cohortId = user?.currentCohortId ?? undefined;
    }

    // Build flag filter
    const flagFilter =
      severity === 'severe'
        ? { hasSome: SEVERE_FLAGS }
        : severity === 'normal'
        ? { isEmpty: false }
        : { isEmpty: false };

    // Build date filter for optional week
    let dateFilter = {};
    if (query.weekNumber && query.yearNumber) {
      const jan4 = new Date(query.yearNumber, 0, 4);
      const weekStart = new Date(jan4);
      weekStart.setDate(jan4.getDate() + 7 * (query.weekNumber - 1) - ((jan4.getDay() + 6) % 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      dateFilter = { date: { gte: weekStart, lt: weekEnd } };
    }

    // Cohort filter via KPGroup
    let kpUserIds: string[] | undefined;
    if (cohortId) {
      const kpGroups = await prisma.kPGroup.findMany({
        where: { cohortId, status: { not: 'ARCHIVED' } },
        select: { kpCoordinatorUserId: true },
      });
      kpUserIds = kpGroups.map((g) => g.kpCoordinatorUserId);
    }

    const whereClause = {
      redFlagsObserved: flagFilter,
      ...dateFilter,
      ...(kpUserIds ? { kpUserId: { in: kpUserIds } } : {}),
    };

    const totalCount = await prisma.kPLogDaily.count({ where: whereClause });
    const records = await prisma.kPLogDaily.findMany({
      where: whereClause,
      select: {
        id: true,
        kpUserId: true,
        date: true,
        moodAvg: true,
        redFlagsObserved: true,
        anecdoteShort: true,
        recordedAt: true,
        kpGroupId: true,
      },
      orderBy: { recordedAt: 'desc' },
      skip: skip ?? 0,
      take: pageSize ?? 20,
    });

    // Tag severity
    const enriched = records.map((r) => ({
      ...r,
      severity: r.redFlagsObserved.some((f) => SEVERE_FLAGS.includes(f)) ? 'severe' : 'normal',
    }));

    return ApiResponse.paginated(enriched, {
      total: totalCount,
      page,
      limit: pageSize,
    });
  },
});
