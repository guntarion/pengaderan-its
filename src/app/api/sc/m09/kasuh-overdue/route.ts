/**
 * src/app/api/sc/m09/kasuh-overdue/route.ts
 * NAWASENA M09 — SC API: list overdue Kasuh logbook cycles.
 *
 * GET /api/sc/m09/kasuh-overdue?cohortId=xxx&minDaysOverdue=1
 * Roles: SC, SUPERADMIN, PEMBINA, DOSEN_WALI
 */

import { createApiHandler, ApiResponse, validateQuery } from '@/lib/api';
import { prisma } from '@/utils/prisma';
import { computeCycleNumber, computeCycleDueDate, isOverdue } from '@/lib/m09-logbook/cycle';
import { z } from 'zod';

const SC_ROLES = ['SC', 'SUPERADMIN', 'PEMBINA', 'DOSEN_WALI'] as const;

const querySchema = z.object({
  cohortId: z.string().optional(),
  minDaysOverdue: z.coerce.number().int().min(0).default(1),
});

export const GET = createApiHandler({
  roles: SC_ROLES as unknown as string[],
  handler: async (req, ctx) => {
    const rawQuery = validateQuery(req, querySchema);
    const query = {
      cohortId: rawQuery.cohortId,
      minDaysOverdue: rawQuery.minDaysOverdue ?? 1,
    };
    const now = new Date();

    ctx.log.info('SC: fetching Kasuh overdue list', { ...query });

    // Resolve cohort
    let cohortId = query.cohortId;
    if (!cohortId) {
      const user = await prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { currentCohortId: true },
      });
      cohortId = user?.currentCohortId ?? undefined;
    }

    const activePairs = await prisma.kasuhPair.findMany({
      where: {
        status: 'ACTIVE',
        ...(cohortId ? { cohortId } : {}),
      },
      select: {
        id: true,
        kasuhUserId: true,
        mabaUserId: true,
        cohortId: true,
        createdAt: true,
      },
    });

    const overdueList: Array<{
      pairId: string;
      kasuhUserId: string;
      mabaUserId: string;
      cycleNumber: number;
      dueDate: string;
      daysOverdue: number;
    }> = [];

    for (const pair of activePairs) {
      const cycleNumber = computeCycleNumber(pair.createdAt, now);
      const overdue = isOverdue(pair.createdAt, cycleNumber, now);

      if (!overdue) continue;

      // Compute approximate days overdue
      const dueDate = computeCycleDueDate(pair.createdAt, cycleNumber);
      const GRACE_DAYS = 3;
      const overdueThreshold = new Date(dueDate.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000);
      const daysOverdue = Math.floor(
        (now.getTime() - overdueThreshold.getTime()) / (24 * 60 * 60 * 1000),
      );

      if (daysOverdue < query.minDaysOverdue) continue;

      // Check if already submitted
      const submitted = await prisma.kasuhLog.findUnique({
        where: { pairId_cycleNumber: { pairId: pair.id, cycleNumber } },
        select: { id: true },
      });

      if (submitted) continue;

      overdueList.push({
        pairId: pair.id,
        kasuhUserId: pair.kasuhUserId,
        mabaUserId: pair.mabaUserId,
        cycleNumber,
        dueDate: dueDate.toISOString(),
        daysOverdue,
      });
    }

    // Sort by most overdue
    overdueList.sort((a, b) => b.daysOverdue - a.daysOverdue);

    return ApiResponse.success({
      total: overdueList.length,
      minDaysOverdue: query.minDaysOverdue,
      overduePairs: overdueList,
    });
  },
});
