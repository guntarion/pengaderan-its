/**
 * src/lib/m09-logbook/kp-weekly.service.ts
 * NAWASENA M09 — KP Weekly Debrief logbook service.
 *
 * Responsibilities:
 *   - getWeeklyFormState: cache-aware form pre-fill + existing debrief
 *   - submitKPLogWeekly: insert with unique constraint enforcement
 *   - getHistory: list own debriefs
 *   - Audit logging
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { ConflictError } from '@/lib/api';
import { auditLog } from '@/services/audit-log.service';
import { computeWeeklyContext } from '@/lib/m09-aggregate/weekly-context';
import { withWeeklyCache } from '@/lib/m09-aggregate/weekly-cache';
import type { KPWeeklyInput } from '@/lib/m09-logbook/validation/kp-weekly.schema';
import type { KPLogWeekly } from '@prisma/client';
import type { NextRequest } from 'next/server';

const log = createLogger('m09:kp-weekly-service');

export interface WeeklyFormState {
  context: {
    avgMood: number | null;
    redFlagBreakdown: Record<string, number>;
    anecdoteList: Array<{ date: string; text: string }>;
    dailyCount: number;
  };
  existingDebrief: KPLogWeekly | null;
  weekNumber: number;
  yearNumber: number;
}

/**
 * Get the weekly form state: context aggregate + existing debrief.
 * Cache-aware: reads from Redis cache first, falls back to live compute.
 */
export async function getWeeklyFormState(
  kpUserId: string,
  weekNumber: number,
  yearNumber: number,
  cohortId: string,
): Promise<WeeklyFormState> {
  log.debug('Getting weekly form state', { kpUserId, weekNumber, yearNumber });

  // Get context from cache or live compute
  const context = await withWeeklyCache(kpUserId, yearNumber, weekNumber, () =>
    computeWeeklyContext(kpUserId, weekNumber, yearNumber, cohortId),
  );

  // Check for existing debrief
  const existingDebrief = await prisma.kPLogWeekly.findUnique({
    where: { kpUserId_weekNumber_yearNumber: { kpUserId, weekNumber, yearNumber } },
  });

  // Normalize redFlagBreakdown: remove undefined values for Record<string, number> compatibility
  const normalizedBreakdown: Record<string, number> = Object.fromEntries(
    Object.entries(context.redFlagBreakdown).filter(([, v]) => v !== undefined).map(([k, v]) => [k, v as number]),
  );

  return {
    context: {
      avgMood: context.avgMood,
      redFlagBreakdown: normalizedBreakdown,
      anecdoteList: context.anecdoteList,
      dailyCount: context.dailyCount,
    },
    existingDebrief,
    weekNumber,
    yearNumber,
  };
}

/**
 * Submit a weekly debrief.
 * Throws ConflictError if debrief already exists for this week.
 */
export async function submitKPLogWeekly(
  kpUserId: string,
  orgId: string,
  cohortId: string,
  kpGroupId: string,
  payload: KPWeeklyInput,
  context: { avgMood: number | null; redFlagBreakdown: Record<string, number>; anecdoteList: Array<{ date: string; text: string }>; dailyCount: number },
  req: NextRequest,
): Promise<KPLogWeekly> {
  log.info('Submitting KP weekly debrief', {
    kpUserId,
    weekNumber: payload.weekNumber,
    yearNumber: payload.yearNumber,
  });

  // Check for duplicate
  const existing = await prisma.kPLogWeekly.findUnique({
    where: {
      kpUserId_weekNumber_yearNumber: {
        kpUserId,
        weekNumber: payload.weekNumber,
        yearNumber: payload.yearNumber,
      },
    },
  });

  if (existing) {
    throw ConflictError('Debrief mingguan sudah disubmit untuk minggu ini');
  }

  const contextSnapshot = {
    avgMood: context.avgMood,
    redFlagBreakdown: context.redFlagBreakdown,
    anecdoteList: context.anecdoteList,
    dailyCount: context.dailyCount,
  };

  const debrief = await prisma.kPLogWeekly.create({
    data: {
      organizationId: orgId,
      cohortId,
      kpGroupId,
      kpUserId,
      weekNumber: payload.weekNumber,
      yearNumber: payload.yearNumber,
      whatWorked: payload.whatWorked,
      whatDidnt: payload.whatDidnt,
      changesNeeded: payload.changesNeeded,
      contextSnapshot,
      avgMoodSnapshot: context.avgMood ?? undefined,
      redFlagSummary: context.redFlagBreakdown,
      dailyCount: context.dailyCount,
      submittedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  log.info('KP weekly debrief saved', { debriefId: debrief.id, kpUserId });

  await auditLog.record({
    userId: kpUserId,
    action: 'KP_LOG_WEEKLY_SUBMIT',
    resource: 'KPLogWeekly',
    resourceId: debrief.id,
    newValue: { weekNumber: payload.weekNumber, yearNumber: payload.yearNumber },
    request: req,
    metadata: { kpGroupId, cohortId },
  });

  return debrief;
}

/**
 * Get the history of weekly debriefs for a KP.
 */
export async function getKPWeeklyHistory(kpUserId: string): Promise<KPLogWeekly[]> {
  return prisma.kPLogWeekly.findMany({
    where: { kpUserId },
    orderBy: [{ yearNumber: 'desc' }, { weekNumber: 'desc' }],
    take: 20,
  });
}
