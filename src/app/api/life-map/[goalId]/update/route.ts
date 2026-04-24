/**
 * src/app/api/life-map/[goalId]/update/route.ts
 * NAWASENA M07 — Milestone updates for a Life Map goal.
 *
 * POST /api/life-map/:goalId/update — submit new milestone update
 * GET  /api/life-map/:goalId/update — list all updates for goal
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, validateParams } from '@/lib/api';
import { auditLog } from '@/services/audit-log.service';
import { submitUpdate, getUpdatesForGoal } from '@/lib/life-map/milestone-service';
import { MilestoneKey, LifeMapStatus } from '@prisma/client';
import { z } from 'zod';

const paramsSchema = z.object({ goalId: z.string().cuid() });

const submitSchema = z.object({
  milestone: z.nativeEnum(MilestoneKey),
  progressText: z.string().min(50, 'Minimal 50 karakter').max(1000, 'Maks 1000 karakter'),
  progressPercent: z.number().int().min(0).max(100),
  reflectionText: z.string().min(50, 'Minimal 50 karakter').max(1000, 'Maks 1000 karakter'),
  newStatus: z.nativeEnum(LifeMapStatus).optional(),
});

// ── POST /api/life-map/:goalId/update ─────────────────────────────────────

export const POST = createApiHandler({
  auth: true,
  handler: async (req, { user, params, log: ctx }) => {
    const { goalId } = validateParams(params, paramsSchema);
    const data = await validateBody(req, submitSchema);

    ctx.info('Submitting milestone update', {
      goalId,
      milestone: data.milestone,
      userId: user.id,
    });

    // Fetch cohort dates for isLate computation
    const goal = await prisma.lifeMap.findUnique({
      where: { id: goalId },
      select: {
        cohort: {
          select: { f2StartDate: true, f2EndDate: true },
        },
      },
    });

    const cohortDates =
      goal?.cohort?.f2StartDate && goal?.cohort?.f2EndDate
        ? { f2StartDate: goal.cohort.f2StartDate, f2EndDate: goal.cohort.f2EndDate }
        : null;

    const update = await submitUpdate(
      goalId,
      data.milestone,
      user.id,
      {
        progressText: data.progressText,
        progressPercent: data.progressPercent,
        reflectionText: data.reflectionText,
        newStatus: data.newStatus,
      },
      cohortDates,
    );

    await auditLog.record({
      userId: user.id,
      action: 'LIFE_MAP_MILESTONE_UPDATE_CREATE' as Parameters<typeof auditLog.record>[0]['action'],
      resource: 'LifeMapUpdate',
      resourceId: update.id,
      newValue: {
        goalId,
        milestone: data.milestone,
        progressPercent: data.progressPercent,
        isLate: update.isLate,
      },
      request: req,
    });

    ctx.info('Milestone update submitted', { updateId: update.id });

    return ApiResponse.success(update, 201);
  },
});

// ── GET /api/life-map/:goalId/update ──────────────────────────────────────

export const GET = createApiHandler({
  auth: true,
  handler: async (_req, { user, params, log: ctx }) => {
    const { goalId } = validateParams(params, paramsSchema);

    ctx.info('Fetching milestone updates', { goalId, userId: user.id });

    // Verify access (at least owner)
    const goal = await prisma.lifeMap.findUnique({
      where: { id: goalId },
      select: { userId: true },
    });

    if (!goal || goal.userId !== user.id) {
      // Admin bypass
      const bypass = ['SUPERADMIN', 'PEMBINA', 'BLM', 'SATGAS', 'SC'];
      if (!bypass.includes(user.role)) {
        throw new Error('Akses ditolak');
      }
    }

    const updates = await getUpdatesForGoal(goalId);

    ctx.info('Updates fetched', { goalId, count: updates.length });

    return ApiResponse.success(updates);
  },
});
