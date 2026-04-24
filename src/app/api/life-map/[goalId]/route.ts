/**
 * src/app/api/life-map/[goalId]/route.ts
 * NAWASENA M07 — Life Map single goal CRUD.
 *
 * GET   /api/life-map/:goalId — get goal detail (with share gate)
 * PATCH /api/life-map/:goalId — update goal content or status
 * DELETE /api/life-map/:goalId — admin only
 */

import { createApiHandler, ApiResponse, validateBody, validateParams } from '@/lib/api';
import { ForbiddenError } from '@/lib/api';
import { auditLog } from '@/services/audit-log.service';
import { getGoalById, updateGoal } from '@/lib/life-map/service';
import { LifeMapStatus } from '@prisma/client';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';

const paramsSchema = z.object({ goalId: z.string().cuid() });

const updateGoalSchema = z.object({
  status: z.nativeEnum(LifeMapStatus).optional(),
  goalText: z.string().min(20).max(500).optional(),
  metric: z.string().min(10).max(200).optional(),
  whyMatters: z.string().min(20).max(300).optional(),
  deadline: z.string().datetime().optional(),
  achievabilityNote: z.string().max(200).optional(),
  sharedWithKasuh: z.boolean().optional(),
});

// ── GET /api/life-map/:goalId ─────────────────────────────────────────────

export const GET = createApiHandler({
  auth: true,
  handler: async (_req, { user, params, log: ctx }) => {
    const { goalId } = validateParams(params, paramsSchema);

    ctx.info('Fetching Life Map goal', { goalId, userId: user.id });

    const goal = await getGoalById(goalId, { id: user.id, role: user.role });

    ctx.info('Goal fetched', { goalId });

    return ApiResponse.success(goal);
  },
});

// ── PATCH /api/life-map/:goalId ───────────────────────────────────────────

export const PATCH = createApiHandler({
  auth: true,
  handler: async (req, { user, params, log: ctx }) => {
    const { goalId } = validateParams(params, paramsSchema);
    const data = await validateBody(req, updateGoalSchema);

    ctx.info('Updating Life Map goal', { goalId, userId: user.id });

    // Get current state for audit diff
    const current = await prisma.lifeMap.findUnique({
      where: { id: goalId },
      select: { status: true, sharedWithKasuh: true, userId: true, cohortId: true },
    });

    if (!current) {
      throw new Error('Goal tidak ditemukan');
    }

    if (current.userId !== user.id) {
      throw ForbiddenError('Akses ditolak');
    }

    const updated = await updateGoal(goalId, user.id, current.cohortId, {
      ...data,
      status: data.status ?? current.status,
      deadline: data.deadline ? new Date(data.deadline) : undefined,
    });

    await auditLog.record({
      userId: user.id,
      action: 'LIFE_MAP_GOAL_UPDATE_STATUS' as Parameters<typeof auditLog.record>[0]['action'],
      resource: 'LifeMap',
      resourceId: goalId,
      oldValue: { status: current.status, sharedWithKasuh: current.sharedWithKasuh },
      newValue: { status: data.status, sharedWithKasuh: data.sharedWithKasuh },
      request: req,
    });

    ctx.info('Goal updated', { goalId, newStatus: data.status });

    return ApiResponse.success(updated);
  },
});

// ── DELETE /api/life-map/:goalId — admin only ─────────────────────────────

export const DELETE = createApiHandler({
  roles: ['admin'],
  handler: async (_req, { user, params, log: ctx }) => {
    const { goalId } = validateParams(params, paramsSchema);

    ctx.info('Admin deleting Life Map goal', { goalId, adminId: user.id });

    const goal = await prisma.lifeMap.findUnique({
      where: { id: goalId },
      select: { id: true, userId: true, area: true },
    });

    if (!goal) throw new Error('Goal tidak ditemukan');

    await prisma.lifeMap.delete({ where: { id: goalId } });

    ctx.info('Goal deleted by admin', { goalId });

    return ApiResponse.success({ deleted: true });
  },
});
