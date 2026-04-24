/**
 * src/app/api/life-map/route.ts
 * NAWASENA M07 — Life Map goal list + create.
 *
 * GET  /api/life-map — list goals for current user (overview or filtered)
 * POST /api/life-map — create a new SMART goal
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, validateQuery } from '@/lib/api';
import { auditLog } from '@/services/audit-log.service';
import { createGoal, listForUser, getOverviewForUser } from '@/lib/life-map/service';
import { LifeArea, LifeMapStatus } from '@prisma/client';
import { z } from 'zod';

// ── Validation ────────────────────────────────────────────────────────────

const createGoalSchema = z.object({
  area: z.nativeEnum(LifeArea),
  goalText: z.string().min(20, 'Minimal 20 karakter').max(500, 'Maks 500 karakter'),
  metric: z.string().min(10, 'Minimal 10 karakter').max(200, 'Maks 200 karakter'),
  whyMatters: z.string().min(20, 'Minimal 20 karakter').max(300, 'Maks 300 karakter'),
  deadline: z.string().datetime(),
  achievabilityNote: z.string().max(200).optional(),
  sharedWithKasuh: z.boolean().optional(),
  previousGoalId: z.string().cuid().optional(),
});

const listQuerySchema = z.object({
  area: z.nativeEnum(LifeArea).optional(),
  status: z.nativeEnum(LifeMapStatus).optional(),
  overview: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

// ── GET /api/life-map ─────────────────────────────────────────────────────

export const GET = createApiHandler({
  auth: true,
  handler: async (req, { user, log: ctx }) => {
    const query = validateQuery(req, listQuerySchema);

    ctx.info('Listing Life Map goals', { userId: user.id });

    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { currentCohortId: true },
    });

    if (!userRecord?.currentCohortId) {
      return ApiResponse.success([]);
    }

    // Return overview (per-area summary) if requested
    if (query.overview === 'true') {
      const overview = await getOverviewForUser(user.id, userRecord.currentCohortId);
      return ApiResponse.success(overview);
    }

    const result = await listForUser(user.id, userRecord.currentCohortId, {
      area: query.area,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });

    return ApiResponse.paginated(result.goals, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  },
});

// ── POST /api/life-map ────────────────────────────────────────────────────

export const POST = createApiHandler({
  auth: true,
  handler: async (req, { user, log: ctx }) => {
    const data = await validateBody(req, createGoalSchema);

    ctx.info('Creating Life Map goal', { userId: user.id, area: data.area });

    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true, currentCohortId: true, lifeMapShareDefault: true },
    });

    if (!userRecord?.currentCohortId) {
      throw new Error('User tidak terdaftar dalam cohort aktif');
    }

    // Validate deadline is at least 30 days from now
    const deadline = new Date(data.deadline);
    const minDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    if (deadline < minDeadline) {
      throw new Error('Deadline minimal 30 hari dari sekarang');
    }

    const sharedWithKasuh = data.sharedWithKasuh ?? userRecord.lifeMapShareDefault;

    const goal = await createGoal(
      user.id,
      userRecord.currentCohortId,
      userRecord.organizationId,
      {
        ...data,
        deadline,
        sharedWithKasuh,
      },
    );

    await auditLog.record({
      userId: user.id,
      action: 'LIFE_MAP_GOAL_CREATE' as Parameters<typeof auditLog.record>[0]['action'],
      resource: 'LifeMap',
      resourceId: goal.id,
      newValue: { area: goal.area, goalText: goal.goalText, deadline: goal.deadline },
      request: req,
    });

    ctx.info('Life Map goal created', { goalId: goal.id });

    return ApiResponse.success(goal, 201);
  },
});
