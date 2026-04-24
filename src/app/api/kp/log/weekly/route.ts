/**
 * src/app/api/kp/log/weekly/route.ts
 * NAWASENA M09 — KP Weekly Debrief API
 *
 * GET  /api/kp/log/weekly?weekNumber=N&yearNumber=Y  — Form state + existing debrief
 * POST /api/kp/log/weekly  — Submit debrief
 *
 * Roles: KP only
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, validateQuery } from '@/lib/api';
import { NotFoundError } from '@/lib/api';
import { kpWeeklySchema } from '@/lib/m09-logbook/validation/kp-weekly.schema';
import { getWeeklyFormState, submitKPLogWeekly, getKPWeeklyHistory } from '@/lib/m09-logbook/kp-weekly.service';
import { invalidateWeeklyCache } from '@/lib/m09-aggregate/weekly-cache';
import { z } from 'zod';

const querySchema = z.object({
  weekNumber: z.coerce.number().int().min(1).max(53).optional(),
  yearNumber: z.coerce.number().int().optional(),
});

// GET /api/kp/log/weekly
export const GET = createApiHandler({
  roles: ['KP'],
  handler: async (req, ctx) => {
    const kpUserId = ctx.user.id;
    const query = validateQuery(req, querySchema);

    // Default to current ISO week
    const now = new Date();
    const weekNumber = query.weekNumber ?? getISOWeekNumber(now);
    const yearNumber = query.yearNumber ?? now.getFullYear();

    ctx.log.info('Fetching KP weekly form state', { kpUserId, weekNumber, yearNumber });

    const kpUser = await prisma.user.findUnique({
      where: { id: kpUserId },
      select: { currentCohortId: true, organizationId: true },
    });

    if (!kpUser?.currentCohortId) {
      throw NotFoundError('Cohort aktif tidak ditemukan');
    }

    const kpGroup = await prisma.kPGroup.findFirst({
      where: {
        kpCoordinatorUserId: kpUserId,
        cohortId: kpUser.currentCohortId,
        status: { not: 'ARCHIVED' },
      },
      select: { id: true },
    });

    if (!kpGroup) {
      throw NotFoundError('KP Group tidak ditemukan');
    }

    const [formState, history] = await Promise.all([
      getWeeklyFormState(kpUserId, weekNumber, yearNumber, kpUser.currentCohortId),
      getKPWeeklyHistory(kpUserId),
    ]);

    return ApiResponse.success({
      formState,
      history,
      kpGroupId: kpGroup.id,
      cohortId: kpUser.currentCohortId,
    });
  },
});

// POST /api/kp/log/weekly
export const POST = createApiHandler({
  roles: ['KP'],
  handler: async (req, ctx) => {
    const kpUserId = ctx.user.id;
    ctx.log.info('Submitting KP weekly debrief', { kpUserId });

    const body = await validateBody(req, kpWeeklySchema);

    const kpUser = await prisma.user.findUnique({
      where: { id: kpUserId },
      select: { currentCohortId: true, organizationId: true },
    });

    if (!kpUser?.currentCohortId) {
      throw NotFoundError('Cohort aktif tidak ditemukan');
    }

    const kpGroup = await prisma.kPGroup.findFirst({
      where: {
        kpCoordinatorUserId: kpUserId,
        cohortId: kpUser.currentCohortId,
        status: { not: 'ARCHIVED' },
      },
      select: { id: true },
    });

    if (!kpGroup) {
      throw NotFoundError('KP Group tidak ditemukan');
    }

    // Get context for snapshot (live compute — not from cache to ensure fresh context)
    const formState = await getWeeklyFormState(
      kpUserId,
      body.weekNumber,
      body.yearNumber,
      kpUser.currentCohortId,
    );

    const debrief = await submitKPLogWeekly(
      kpUserId,
      kpUser.organizationId,
      kpUser.currentCohortId,
      kpGroup.id,
      body,
      formState.context,
      req,
    );

    // Invalidate cache after submit
    await invalidateWeeklyCache(kpUserId, body.weekNumber, body.yearNumber);

    ctx.log.info('KP weekly debrief submitted', { debriefId: debrief.id, kpUserId });

    return ApiResponse.success(debrief, 201);
  },
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
