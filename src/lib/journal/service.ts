/**
 * src/lib/journal/service.ts
 * NAWASENA M04 — Weekly Journal service.
 *
 * Operations:
 * - upsertDraft: create/update draft with conflict resolution
 * - submitJournal: validate, create Journal, delete draft, set isLate
 * - getJournalByWeek: get journal or draft for a user/week
 * - autoLockMissedJournals: cron helper to clean up orphan drafts
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { countTotalWords, meetsMinimumWordCount } from './word-count';
import { getWeekDates } from './week-number';
import { getLocalDateString } from '@/lib/pulse/local-date';

const log = createLogger('journal-service');

const DEFAULT_TIMEZONE = 'Asia/Jakarta';

export interface JournalFields {
  whatHappened: string;
  soWhat: string;
  nowWhat: string;
}

export interface UpsertDraftInput {
  userId: string;
  organizationId: string;
  cohortId: string;
  weekNumber: number;
  fields: JournalFields;
  clientUpdatedAt: Date;
}

export interface SubmitJournalInput {
  userId: string;
  organizationId: string;
  cohortId: string;
  weekNumber: number;
  fields: JournalFields;
  cohortStartDate: Date;
  timezone?: string;
}

/**
 * Upsert a journal draft.
 * Conflict check: if existing draft has newer clientUpdatedAt, return 409.
 */
export async function upsertDraft(input: UpsertDraftInput) {
  const wordCount = countTotalWords(input.fields);

  log.info('Upserting journal draft', {
    userId: input.userId,
    weekNumber: input.weekNumber,
    wordCount,
  });

  // Check for conflict: existing draft newer than incoming?
  const existing = await prisma.journalDraft.findUnique({
    where: {
      userId_cohortId_weekNumber: {
        userId: input.userId,
        cohortId: input.cohortId,
        weekNumber: input.weekNumber,
      },
    },
    select: { id: true, clientUpdatedAt: true },
  });

  if (existing && existing.clientUpdatedAt > input.clientUpdatedAt) {
    log.warn('Draft conflict: server has newer version', {
      userId: input.userId,
      weekNumber: input.weekNumber,
      serverTs: existing.clientUpdatedAt,
      clientTs: input.clientUpdatedAt,
    });
    // Return existing draft — caller should handle 409
    return { conflict: true as const, draft: null };
  }

  const draft = await prisma.journalDraft.upsert({
    where: {
      userId_cohortId_weekNumber: {
        userId: input.userId,
        cohortId: input.cohortId,
        weekNumber: input.weekNumber,
      },
    },
    create: {
      organizationId: input.organizationId,
      userId: input.userId,
      cohortId: input.cohortId,
      weekNumber: input.weekNumber,
      whatHappened: input.fields.whatHappened,
      soWhat: input.fields.soWhat,
      nowWhat: input.fields.nowWhat,
      wordCount,
      clientUpdatedAt: input.clientUpdatedAt,
    },
    update: {
      whatHappened: input.fields.whatHappened,
      soWhat: input.fields.soWhat,
      nowWhat: input.fields.nowWhat,
      wordCount,
      clientUpdatedAt: input.clientUpdatedAt,
    },
  });

  log.info('Draft upserted', { draftId: draft.id, wordCount });
  return { conflict: false as const, draft };
}

/**
 * Submit a journal (final).
 * - Validates minimum 300 words
 * - Determines isLate flag (submit after Sunday 21:00 local)
 * - Creates Journal row
 * - Deletes JournalDraft
 */
export async function submitJournal(input: SubmitJournalInput) {
  const timezone = input.timezone ?? DEFAULT_TIMEZONE;

  if (!meetsMinimumWordCount(input.fields)) {
    const wordCount = countTotalWords(input.fields);
    log.warn('Journal submit rejected: insufficient words', {
      userId: input.userId,
      weekNumber: input.weekNumber,
      wordCount,
    });
    throw new Error(`Journal must have at least 300 words. Current: ${wordCount}`);
  }

  // Check for existing submitted journal
  const existingJournal = await prisma.journal.findUnique({
    where: {
      userId_cohortId_weekNumber: {
        userId: input.userId,
        cohortId: input.cohortId,
        weekNumber: input.weekNumber,
      },
    },
  });

  if (existingJournal) {
    throw new Error('Journal for this week has already been submitted');
  }

  // Compute week dates
  const { weekStartDate, weekEndDate } = getWeekDates(input.cohortStartDate, input.weekNumber, timezone);

  // Determine if late: submitted after Sunday 21:00 local time
  const now = new Date();
  const deadline = new Date(weekEndDate);
  deadline.setHours(21, 0, 0, 0); // Sunday 21:00

  const isLate = now > deadline;

  const wordCount = countTotalWords(input.fields);

  log.info('Submitting journal', {
    userId: input.userId,
    weekNumber: input.weekNumber,
    wordCount,
    isLate,
  });

  // Create journal + delete draft in a transaction
  const [journal] = await prisma.$transaction([
    prisma.journal.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        cohortId: input.cohortId,
        weekNumber: input.weekNumber,
        whatHappened: input.fields.whatHappened,
        soWhat: input.fields.soWhat,
        nowWhat: input.fields.nowWhat,
        wordCount,
        status: isLate ? 'LATE' : 'SUBMITTED',
        isLate,
        submittedAt: now,
        weekStartDate,
        weekEndDate,
      },
    }),
    prisma.journalDraft.deleteMany({
      where: {
        userId: input.userId,
        cohortId: input.cohortId,
        weekNumber: input.weekNumber,
      },
    }),
  ]);

  log.info('Journal submitted', { journalId: journal.id, status: journal.status });
  return journal;
}

/**
 * Get a journal (or draft if not submitted) for a user/week.
 */
export async function getJournalByWeek(
  userId: string,
  cohortId: string,
  weekNumber: number,
): Promise<
  | { type: 'submitted'; journal: Awaited<ReturnType<typeof prisma.journal.findUnique>> }
  | { type: 'draft'; draft: Awaited<ReturnType<typeof prisma.journalDraft.findUnique>> }
  | { type: 'none' }
> {
  const journal = await prisma.journal.findUnique({
    where: { userId_cohortId_weekNumber: { userId, cohortId, weekNumber } },
  });

  if (journal) return { type: 'submitted', journal };

  const draft = await prisma.journalDraft.findUnique({
    where: { userId_cohortId_weekNumber: { userId, cohortId, weekNumber } },
  });

  if (draft) return { type: 'draft', draft };

  return { type: 'none' };
}

/**
 * Auto-lock (delete orphan drafts for past weeks).
 * Called by cron job on Wednesdays.
 * Deletes drafts where weekNumber is more than 1 week behind current.
 */
export async function autoLockMissedJournals(cohortId: string, currentWeekNumber: number) {
  const cutoffWeek = currentWeekNumber - 1;

  log.info('Auto-locking missed journals', { cohortId, cutoffWeek });

  const deleted = await prisma.journalDraft.deleteMany({
    where: {
      cohortId,
      weekNumber: { lt: cutoffWeek },
    },
  });

  log.info('Orphan drafts deleted', { count: deleted.count });
  return deleted.count;
}

/**
 * List all journals for a user (newest week first).
 */
export async function listJournals(userId: string, cohortId: string) {
  return prisma.journal.findMany({
    where: { userId, cohortId },
    orderBy: { weekNumber: 'desc' },
    select: {
      id: true,
      weekNumber: true,
      status: true,
      isLate: true,
      wordCount: true,
      submittedAt: true,
      weekStartDate: true,
      weekEndDate: true,
    },
  });
}
