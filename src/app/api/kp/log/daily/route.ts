/**
 * src/app/api/kp/log/daily/route.ts
 * NAWASENA M09 — KP Daily Stand-up Log API
 *
 * GET  /api/kp/log/daily  — Return form state with suggested mood + existing log
 * POST /api/kp/log/daily  — Submit or update today's daily log
 *
 * Roles: KP only
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { kpDailySchema } from '@/lib/m09-logbook/validation/kp-daily.schema';
import { getTodayFormState, submitKPLogDaily, getKPDailyHistory } from '@/lib/m09-logbook/kp-daily.service';
import { NotFoundError } from '@/lib/api';

// GET /api/kp/log/daily
export const GET = createApiHandler({
  roles: ['KP'],
  handler: async (req, ctx) => {
    const kpUserId = ctx.user.id;
    ctx.log.info('Fetching KP daily form state', { kpUserId });

    // Resolve KP's group from M03
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

    const today = new Date();
    const [formState, history] = await Promise.all([
      getTodayFormState(kpUserId, kpGroup.id, kpUser.currentCohortId, today),
      getKPDailyHistory(kpUserId, 7),
    ]);

    ctx.log.info('KP daily form state fetched', { kpUserId, hasExistingLog: !!formState.existingLog });

    return ApiResponse.success({
      formState: {
        existingLog: formState.existingLog,
        suggestedMood: formState.suggestedMood,
        responderCount: formState.responderCount,
        totalMembers: formState.totalMembers,
        isEditable: formState.isEditable,
        date: formState.date.toISOString(),
      },
      history,
      kpGroupId: kpGroup.id,
      cohortId: kpUser.currentCohortId,
    });
  },
});

// POST /api/kp/log/daily
export const POST = createApiHandler({
  roles: ['KP'],
  handler: async (req, ctx) => {
    const kpUserId = ctx.user.id;
    ctx.log.info('Submitting KP daily log', { kpUserId });

    const body = await validateBody(req, kpDailySchema);

    // Resolve KP context
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

    const logEntry = await submitKPLogDaily(
      kpUserId,
      kpUser.organizationId,
      kpUser.currentCohortId,
      kpGroup.id,
      { ...body, redFlagsObserved: body.redFlagsObserved ?? [] },
      req,
    );

    ctx.log.info('KP daily log submitted', { logId: logEntry.id, kpUserId });

    return ApiResponse.success(logEntry, 201);
  },
});
