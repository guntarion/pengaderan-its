/**
 * src/lib/m09-logbook/kp-daily.service.ts
 * NAWASENA M09 — KP Daily Stand-up logbook service.
 *
 * Responsibilities:
 *   - getTodayFormState: return existing log + suggested mood for form pre-fill
 *   - submitKPLogDaily: upsert with 48h edit window enforcement
 *   - getHistory: last N days of logs
 *   - Audit logging on every write
 *   - Enqueue cascade job for INJURY/SHUTDOWN flags
 *   - Cache invalidation for weekly aggregate
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { ForbiddenError } from '@/lib/api';
import { auditLog } from '@/services/audit-log.service';
import { computeSuggestedMood } from '@/lib/m09-aggregate/suggested-mood';
import { invalidateWeeklyCache } from '@/lib/m09-aggregate/weekly-cache';
import { enqueueCascadeJob } from '@/lib/m09-cascade/job-queue';
import { isCascadeEnabled } from '@/lib/m09-cascade/flags';
import { hasSevereRedFlags, hasNormalRedFlags } from '@/lib/m09-logbook/validation/kp-daily.schema';
import type { KPDailyInput } from '@/lib/m09-logbook/validation/kp-daily.schema';
import type { KPLogDaily } from '@prisma/client';
import type { NextRequest } from 'next/server';

const log = createLogger('m09:kp-daily-service');

// Edit window: 48 hours in milliseconds
const EDIT_WINDOW_MS = 48 * 60 * 60 * 1000;

export interface KPDailyFormState {
  existingLog: KPLogDaily | null;
  suggestedMood: number | null;
  responderCount: number;
  totalMembers: number;
  isEditable: boolean; // false if > 48h old
  date: Date;
}

/**
 * Get form state for today's KP Daily log.
 * Returns existing log (if any), suggested mood from M04 pulse data.
 */
export async function getTodayFormState(
  kpUserId: string,
  kpGroupId: string,
  cohortId: string,
  today: Date,
): Promise<KPDailyFormState> {
  log.debug('Getting today form state', { kpUserId, kpGroupId });

  // Normalize date to start of day
  const dateOnly = new Date(today);
  dateOnly.setHours(0, 0, 0, 0);

  // Check for existing log
  const existingLog = await prisma.kPLogDaily.findUnique({
    where: { kpUserId_date: { kpUserId, date: dateOnly } },
  });

  // Compute suggested mood from M04
  const moodResult = await computeSuggestedMood(kpUserId, cohortId, kpGroupId, dateOnly);

  // Determine if existing log is editable (within 48h)
  let isEditable = true;
  if (existingLog) {
    const recordedAt = existingLog.recordedAt;
    const age = Date.now() - recordedAt.getTime();
    isEditable = age <= EDIT_WINDOW_MS;
  }

  return {
    existingLog,
    suggestedMood: moodResult.suggestedMood,
    responderCount: moodResult.responderCount,
    totalMembers: moodResult.totalMembers,
    isEditable,
    date: dateOnly,
  };
}

/**
 * Submit or update a KP Daily log.
 * Enforces 48h edit window on updates.
 * Triggers cascade and notifications as needed.
 */
export async function submitKPLogDaily(
  kpUserId: string,
  orgId: string,
  cohortId: string,
  kpGroupId: string,
  payload: KPDailyInput,
  req: NextRequest,
): Promise<KPLogDaily> {
  log.info('Submitting KP Daily log', {
    kpUserId,
    kpGroupId,
    moodAvg: payload.moodAvg,
    redFlagsCount: payload.redFlagsObserved.length,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check for existing log (update vs. create)
  const existing = await prisma.kPLogDaily.findUnique({
    where: { kpUserId_date: { kpUserId, date: today } },
  });

  if (existing) {
    // Enforce 48h edit window
    const age = Date.now() - existing.recordedAt.getTime();
    if (age > EDIT_WINDOW_MS) {
      log.warn('Edit window expired', { kpUserId, recordedAt: existing.recordedAt });
      throw ForbiddenError('EDIT_WINDOW_EXPIRED');
    }
  }

  const isCreate = !existing;
  const auditAction = isCreate ? 'KP_LOG_DAILY_SUBMIT' : 'KP_LOG_DAILY_EDIT';

  // Upsert the log
  const logEntry = await prisma.kPLogDaily.upsert({
    where: { kpUserId_date: { kpUserId, date: today } },
    create: {
      organizationId: orgId,
      cohortId,
      kpGroupId,
      kpUserId,
      date: today,
      moodAvg: payload.moodAvg,
      suggestedMood: payload.suggestedMood ?? null,
      responderCount: payload.responderCount ?? null,
      totalMembers: payload.totalMembers ?? null,
      redFlagsObserved: payload.redFlagsObserved,
      redFlagOther: payload.redFlagOther ?? null,
      anecdoteShort: payload.anecdoteShort ?? null,
      recordedAt: new Date(),
      updatedAt: new Date(),
    },
    update: {
      moodAvg: payload.moodAvg,
      suggestedMood: payload.suggestedMood ?? undefined,
      responderCount: payload.responderCount ?? undefined,
      totalMembers: payload.totalMembers ?? undefined,
      redFlagsObserved: payload.redFlagsObserved,
      redFlagOther: payload.redFlagOther ?? null,
      anecdoteShort: payload.anecdoteShort ?? null,
      editedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  log.info('KP Daily log saved', { logId: logEntry.id, isCreate });

  // Audit log
  await auditLog.record({
    userId: kpUserId,
    action: auditAction,
    resource: 'KPLogDaily',
    resourceId: logEntry.id,
    oldValue: existing ? { moodAvg: existing.moodAvg, redFlagsObserved: existing.redFlagsObserved } : undefined,
    newValue: { moodAvg: logEntry.moodAvg, redFlagsObserved: logEntry.redFlagsObserved },
    request: req,
    metadata: { kpGroupId, cohortId, date: today.toISOString() },
  });

  // Invalidate weekly cache for this week
  const { weekNumber, yearNumber } = getISOWeekAndYear(today);
  await invalidateWeeklyCache(kpUserId, weekNumber, yearNumber);

  // Handle red flag cascade and notifications
  const flags = payload.redFlagsObserved;

  if (hasSevereRedFlags(flags)) {
    // Enqueue M10 cascade (infrastructure only, flag controls actual M10 call)
    if (isCascadeEnabled()) {
      await enqueueCascadeJob(logEntry.id, 'SEVERE', flags);
    } else {
      log.info('Cascade disabled — skipping M10 cascade enqueue', { logId: logEntry.id });
      // Still enqueue for future processing when enabled
      await enqueueCascadeJob(logEntry.id, 'SEVERE', flags);
    }
  } else if (hasNormalRedFlags(flags)) {
    log.info('Normal red flags observed — M15 notification queued (not implemented yet)', {
      logId: logEntry.id,
      flags,
    });
  }

  // Handle edit removing severe flags
  if (!isCreate && existing) {
    const prevSevere = hasSevereRedFlags(existing.redFlagsObserved);
    const currSevere = hasSevereRedFlags(flags);
    if (prevSevere && !currSevere) {
      log.info('Severe red flag removed — audit RED_FLAG_REVOKED', { logId: logEntry.id });
      await auditLog.record({
        userId: kpUserId,
        action: 'RED_FLAG_REVOKED',
        resource: 'KPLogDaily',
        resourceId: logEntry.id,
        oldValue: { redFlagsObserved: existing.redFlagsObserved },
        newValue: { redFlagsObserved: logEntry.redFlagsObserved },
        request: req,
        metadata: { kpGroupId, cohortId },
      });
    }
  }

  return logEntry;
}

/**
 * Get the last N days of KP Daily logs for a user.
 */
export async function getKPDailyHistory(
  kpUserId: string,
  days: number = 7,
): Promise<KPLogDaily[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  return prisma.kPLogDaily.findMany({
    where: {
      kpUserId,
      date: { gte: since },
    },
    orderBy: { date: 'desc' },
    take: days,
  });
}

// ---- Internal helpers ----

function getISOWeekAndYear(date: Date): { weekNumber: number; yearNumber: number } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNumber =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
    );
  return { weekNumber, yearNumber: d.getFullYear() };
}
