/**
 * src/lib/life-map/service.ts
 * NAWASENA M07 — Life Map service layer (CRUD for goals).
 *
 * Business rules:
 * - Max 5 ACTIVE goals per area per Maba per cohort
 * - ADJUSTED status creates a new goal with previousGoalId link
 * - ACHIEVED status sets achievedAt
 * - All mutations invalidate Portfolio cache
 */

import { prisma } from '@/utils/prisma';
import { BadRequestError, NotFoundError, ForbiddenError } from '@/lib/api';
import { LifeArea, LifeMapStatus, MilestoneKey } from '@prisma/client';
import { invalidatePortfolio } from '@/lib/portfolio/cache';
import { createLogger } from '@/lib/logger';

const log = createLogger('life-map:service');

const MAX_ACTIVE_GOALS_PER_AREA = 5;

export interface CreateGoalInput {
  area: LifeArea;
  goalText: string;
  metric: string;
  whyMatters: string;
  deadline: Date;
  achievabilityNote?: string;
  sharedWithKasuh?: boolean;
  previousGoalId?: string; // set when ADJUSTED
}

export interface UpdateGoalStatusInput {
  status: LifeMapStatus;
  goalText?: string;
  metric?: string;
  whyMatters?: string;
  deadline?: Date;
  achievabilityNote?: string;
  sharedWithKasuh?: boolean;
}

export interface ListGoalFilters {
  area?: LifeArea;
  status?: LifeMapStatus;
  page?: number;
  limit?: number;
}

// ── Create Goal ───────────────────────────────────────────────────────────

export async function createGoal(
  userId: string,
  cohortId: string,
  orgId: string,
  input: CreateGoalInput,
) {
  // Enforce cap: max 5 ACTIVE goals per area
  const activeCount = await prisma.lifeMap.count({
    where: {
      userId,
      cohortId,
      area: input.area,
      status: LifeMapStatus.ACTIVE,
    },
  });

  if (activeCount >= MAX_ACTIVE_GOALS_PER_AREA) {
    const err = BadRequestError(
      `Batas maksimal ${MAX_ACTIVE_GOALS_PER_AREA} goal aktif per area sudah tercapai`,
    );
    (err as Error & { code: string }).code = 'GOAL_LIMIT_EXCEEDED';
    throw err;
  }

  const goal = await prisma.lifeMap.create({
    data: {
      organizationId: orgId,
      cohortId,
      userId,
      area: input.area,
      goalText: input.goalText,
      metric: input.metric,
      whyMatters: input.whyMatters,
      deadline: input.deadline,
      achievabilityNote: input.achievabilityNote,
      sharedWithKasuh: input.sharedWithKasuh ?? false,
      status: LifeMapStatus.ACTIVE,
      previousGoalId: input.previousGoalId ?? null,
    },
    include: {
      updates: true,
    },
  });

  log.info('Life Map goal created', { goalId: goal.id, userId, area: input.area });

  void invalidatePortfolio(userId, cohortId);

  return goal;
}

// ── Update Goal Status / Content ──────────────────────────────────────────

export async function updateGoal(
  goalId: string,
  userId: string,
  cohortId: string,
  input: UpdateGoalStatusInput,
) {
  const goal = await prisma.lifeMap.findUnique({
    where: { id: goalId },
    select: { id: true, userId: true, cohortId: true, status: true, area: true },
  });

  if (!goal) throw NotFoundError('Goal tidak ditemukan');
  if (goal.userId !== userId) throw ForbiddenError('Akses ditolak');

  const now = new Date();
  const updateData: Parameters<typeof prisma.lifeMap.update>[0]['data'] = {
    ...( input.goalText !== undefined && { goalText: input.goalText }),
    ...( input.metric !== undefined && { metric: input.metric }),
    ...( input.whyMatters !== undefined && { whyMatters: input.whyMatters }),
    ...( input.deadline !== undefined && { deadline: input.deadline }),
    ...( input.achievabilityNote !== undefined && { achievabilityNote: input.achievabilityNote }),
    ...( input.sharedWithKasuh !== undefined && { sharedWithKasuh: input.sharedWithKasuh }),
  };

  if (input.status && input.status !== goal.status) {
    updateData.status = input.status;
    if (input.status === LifeMapStatus.ACHIEVED) {
      updateData.achievedAt = now;
    }
    if (input.status === LifeMapStatus.ADJUSTED) {
      updateData.adjustedAt = now;
    }
  }

  const updated = await prisma.lifeMap.update({
    where: { id: goalId },
    data: updateData,
    include: { updates: true },
  });

  log.info('Life Map goal updated', { goalId, userId, newStatus: input.status });

  void invalidatePortfolio(userId, cohortId);

  return updated;
}

// ── List Goals ────────────────────────────────────────────────────────────

export async function listForUser(
  userId: string,
  cohortId: string,
  filters: ListGoalFilters = {},
) {
  const { area, status, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where = {
    userId,
    cohortId,
    ...(area && { area }),
    ...(status && { status }),
  };

  const [goals, total] = await Promise.all([
    prisma.lifeMap.findMany({
      where,
      orderBy: [{ area: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
      include: {
        updates: {
          orderBy: { milestone: 'asc' },
          select: { id: true, milestone: true, progressPercent: true, recordedAt: true, isLate: true },
        },
      },
    }),
    prisma.lifeMap.count({ where }),
  ]);

  return { goals, page, limit, total };
}

// ── Get Goal by ID (with share gate) ─────────────────────────────────────

export async function getGoalById(
  goalId: string,
  currentUser: { id: string; role: string },
) {
  const goal = await prisma.lifeMap.findUnique({
    where: { id: goalId },
    include: {
      updates: {
        orderBy: { milestone: 'asc' },
      },
    },
  });

  if (!goal) throw NotFoundError('Goal tidak ditemukan');

  // Owner can always read
  if (goal.userId === currentUser.id) return goal;

  // Admins / OC roles bypass
  const bypassRoles = ['SUPERADMIN', 'PEMBINA', 'BLM', 'SATGAS', 'SC'];
  if (bypassRoles.includes(currentUser.role)) return goal;

  // Kasuh: must be sharedWithKasuh + active pair
  if (!goal.sharedWithKasuh) {
    throw ForbiddenError('Goal ini bersifat privat');
  }

  // Check active KasuhPair
  const pair = await prisma.kasuhPair.findFirst({
    where: {
      mabaUserId: goal.userId,
      kasuhUserId: currentUser.id,
      cohortId: goal.cohortId,
      status: 'ACTIVE',
    },
  });

  if (!pair) throw ForbiddenError('Akses ditolak: bukan Kakak Kasuh aktif');

  return goal;
}

// ── Overview (all areas) ─────────────────────────────────────────────────

/**
 * Returns a summary map: area → { active, achieved, adjusted, latestGoal }
 */
export async function getOverviewForUser(userId: string, cohortId: string) {
  const goals = await prisma.lifeMap.findMany({
    where: { userId, cohortId },
    orderBy: { createdAt: 'desc' },
    include: {
      updates: {
        orderBy: { milestone: 'asc' },
        select: { id: true, milestone: true, progressPercent: true, isLate: true },
      },
    },
  });

  const areas = Object.values(LifeArea);
  const overview = areas.map((area) => {
    const areaGoals = goals.filter((g) => g.area === area);
    const active = areaGoals.filter((g) => g.status === LifeMapStatus.ACTIVE);
    const achieved = areaGoals.filter((g) => g.status === LifeMapStatus.ACHIEVED);
    const adjusted = areaGoals.filter((g) => g.status === LifeMapStatus.ADJUSTED);

    // Milestones submitted on most recent active goal
    const latestActive = active[0] ?? null;
    const milestonesDone =
      latestActive?.updates.map((u) => u.milestone as MilestoneKey) ?? [];

    return {
      area,
      activeCount: active.length,
      achievedCount: achieved.length,
      adjustedCount: adjusted.length,
      latestGoal: latestActive,
      milestonesDone,
    };
  });

  return overview;
}
