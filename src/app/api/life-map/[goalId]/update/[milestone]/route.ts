/**
 * src/app/api/life-map/[goalId]/update/[milestone]/route.ts
 * NAWASENA M07 — Get or edit a specific milestone update.
 *
 * GET   /api/life-map/:goalId/update/:milestone — get update
 * PATCH /api/life-map/:goalId/update/:milestone — edit update (within 7-day window)
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, validateParams } from '@/lib/api';
import { NotFoundError, ForbiddenError } from '@/lib/api';
import { auditLog } from '@/services/audit-log.service';
import { editUpdate } from '@/lib/life-map/milestone-service';
import { MilestoneKey, LifeMapStatus } from '@prisma/client';
import { z } from 'zod';

const paramsSchema = z.object({
  goalId: z.string().cuid(),
  milestone: z.nativeEnum(MilestoneKey),
});

const editSchema = z.object({
  progressText: z.string().min(50).max(1000).optional(),
  progressPercent: z.number().int().min(0).max(100).optional(),
  reflectionText: z.string().min(50).max(1000).optional(),
  newStatus: z.nativeEnum(LifeMapStatus).optional(),
});

// ── GET /api/life-map/:goalId/update/:milestone ───────────────────────────

export const GET = createApiHandler({
  auth: true,
  handler: async (_req, { user, params, log: ctx }) => {
    const { goalId, milestone } = validateParams(params, paramsSchema);

    ctx.info('Fetching milestone update', { goalId, milestone, userId: user.id });

    const update = await prisma.lifeMapUpdate.findUnique({
      where: { lifeMapId_milestone: { lifeMapId: goalId, milestone } },
    });

    if (!update) throw NotFoundError('Update tidak ditemukan');

    // Only owner or admin can access
    if (update.userId !== user.id) {
      const bypass = ['SUPERADMIN', 'PEMBINA', 'BLM', 'SATGAS', 'SC'];
      if (!bypass.includes(user.role)) {
        throw ForbiddenError('Akses ditolak');
      }
    }

    return ApiResponse.success(update);
  },
});

// ── PATCH /api/life-map/:goalId/update/:milestone ─────────────────────────

export const PATCH = createApiHandler({
  auth: true,
  handler: async (req, { user, params, log: ctx }) => {
    const { goalId, milestone } = validateParams(params, paramsSchema);
    const data = await validateBody(req, editSchema);

    ctx.info('Editing milestone update', { goalId, milestone, userId: user.id });

    // Find the update by composite key
    const existing = await prisma.lifeMapUpdate.findUnique({
      where: { lifeMapId_milestone: { lifeMapId: goalId, milestone } },
      select: { id: true, userId: true, progressPercent: true, newStatus: true },
    });

    if (!existing) throw NotFoundError('Update tidak ditemukan');
    if (existing.userId !== user.id) throw ForbiddenError('Akses ditolak');

    const updated = await editUpdate(existing.id, user.id, data);

    await auditLog.record({
      userId: user.id,
      action: 'LIFE_MAP_MILESTONE_UPDATE_EDIT' as Parameters<typeof auditLog.record>[0]['action'],
      resource: 'LifeMapUpdate',
      resourceId: existing.id,
      oldValue: { progressPercent: existing.progressPercent, newStatus: existing.newStatus },
      newValue: { progressPercent: data.progressPercent, newStatus: data.newStatus },
      request: req,
    });

    ctx.info('Milestone update edited', { updateId: existing.id });

    return ApiResponse.success(updated);
  },
});
