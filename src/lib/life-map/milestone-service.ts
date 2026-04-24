/**
 * src/lib/life-map/milestone-service.ts
 * NAWASENA M07 — Milestone update service layer.
 *
 * Business rules:
 * - One update per milestone per goal (@@unique constraint)
 * - P2002 (unique constraint violation) → 409 CONFLICT
 * - editableUntil = recordedAt + 7d (stored)
 * - isLate = submittedAt > window.closeAt
 * - If newStatus is provided, updates parent LifeMap.status
 * - Invalidates Portfolio cache on submit/edit
 */

import { prisma } from '@/utils/prisma';
import { BadRequestError, NotFoundError, ForbiddenError } from '@/lib/api';
import { LifeMapStatus, MilestoneKey } from '@prisma/client';
import { addDays } from 'date-fns';
import { invalidatePortfolio } from '@/lib/portfolio/cache';
import { isLateSubmission } from './milestone-timing';
import type { CohortDates } from './milestone-timing';
import { createLogger } from '@/lib/logger';

const log = createLogger('life-map:milestone-service');

export interface SubmitUpdateInput {
  progressText: string;
  progressPercent: number;
  reflectionText: string;
  newStatus?: LifeMapStatus;
}

export interface EditUpdateInput {
  progressText?: string;
  progressPercent?: number;
  reflectionText?: string;
  newStatus?: LifeMapStatus;
}

// ── Submit Milestone Update ───────────────────────────────────────────────

export async function submitUpdate(
  goalId: string,
  milestone: MilestoneKey,
  userId: string,
  input: SubmitUpdateInput,
  cohortDates: CohortDates | null,
) {
  // Verify goal ownership
  const goal = await prisma.lifeMap.findUnique({
    where: { id: goalId },
    select: {
      id: true,
      userId: true,
      cohortId: true,
      organizationId: true,
      status: true,
    },
  });

  if (!goal) throw NotFoundError('Goal tidak ditemukan');
  if (goal.userId !== userId) throw ForbiddenError('Akses ditolak');
  if (goal.status !== LifeMapStatus.ACTIVE) {
    throw BadRequestError('Update hanya dapat dilakukan pada goal yang masih aktif');
  }

  const now = new Date();
  const editableUntil = addDays(now, 7);

  // Determine if late
  const isLate = cohortDates
    ? isLateSubmission(milestone, cohortDates, now)
    : false;

  try {
    const update = await prisma.lifeMapUpdate.create({
      data: {
        organizationId: goal.organizationId,
        cohortId: goal.cohortId,
        userId,
        lifeMapId: goalId,
        milestone,
        progressText: input.progressText,
        progressPercent: input.progressPercent,
        reflectionText: input.reflectionText,
        newStatus: input.newStatus ?? null,
        isLate,
        editableUntil,
        recordedAt: now,
      },
    });

    // If newStatus provided, update parent goal
    if (input.newStatus && input.newStatus !== goal.status) {
      await prisma.lifeMap.update({
        where: { id: goalId },
        data: {
          status: input.newStatus,
          ...(input.newStatus === LifeMapStatus.ACHIEVED && { achievedAt: now }),
          ...(input.newStatus === LifeMapStatus.ADJUSTED && { adjustedAt: now }),
        },
      });
    }

    log.info('Milestone update submitted', { goalId, milestone, userId, isLate });
    void invalidatePortfolio(userId, goal.cohortId);

    return update;
  } catch (err: unknown) {
    // Handle unique constraint violation (P2002)
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      const conflictErr = BadRequestError(
        `Update milestone ${milestone} sudah ada untuk goal ini`,
      );
      (conflictErr as unknown as { code: string; status: number }).code = 'MILESTONE_UPDATE_DUPLICATE';
      (conflictErr as unknown as { code: string; status: number }).status = 409;
      throw conflictErr;
    }
    throw err;
  }
}

// ── Edit Milestone Update ─────────────────────────────────────────────────

export async function editUpdate(
  updateId: string,
  userId: string,
  input: EditUpdateInput,
) {
  const update = await prisma.lifeMapUpdate.findUnique({
    where: { id: updateId },
    select: {
      id: true,
      userId: true,
      lifeMapId: true,
      editableUntil: true,
      lifeMap: { select: { cohortId: true } },
    },
  });

  if (!update) throw NotFoundError('Update tidak ditemukan');
  if (update.userId !== userId) throw ForbiddenError('Akses ditolak');

  // Check edit window
  if (update.editableUntil < new Date()) {
    const err = BadRequestError('Batas waktu edit sudah berakhir (7 hari setelah submit)');
    (err as Error & { code: string }).code = 'EDIT_WINDOW_EXPIRED';
    throw err;
  }

  const updated = await prisma.lifeMapUpdate.update({
    where: { id: updateId },
    data: {
      ...(input.progressText !== undefined && { progressText: input.progressText }),
      ...(input.progressPercent !== undefined && { progressPercent: input.progressPercent }),
      ...(input.reflectionText !== undefined && { reflectionText: input.reflectionText }),
      ...(input.newStatus !== undefined && { newStatus: input.newStatus }),
    },
  });

  // If newStatus changed, update parent goal
  if (input.newStatus) {
    const now = new Date();
    await prisma.lifeMap.update({
      where: { id: update.lifeMapId },
      data: {
        status: input.newStatus,
        ...(input.newStatus === LifeMapStatus.ACHIEVED && { achievedAt: now }),
        ...(input.newStatus === LifeMapStatus.ADJUSTED && { adjustedAt: now }),
      },
    });
  }

  log.info('Milestone update edited', { updateId, userId });
  void invalidatePortfolio(userId, update.lifeMap.cohortId);

  return updated;
}

// ── Get Updates for Goal ──────────────────────────────────────────────────

export async function getUpdatesForGoal(goalId: string) {
  return prisma.lifeMapUpdate.findMany({
    where: { lifeMapId: goalId },
    orderBy: { milestone: 'asc' },
  });
}
