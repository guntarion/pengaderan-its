/**
 * src/lib/rubric/service.ts
 * NAWASENA M04 — Rubric scoring service.
 *
 * Operations:
 * - createRubrikScore: append-only score creation
 * - updateNote: edit comment within 48h window
 * - getByJournal: get score for a journal
 * - listUnscoredJournalsForKP: journals awaiting scoring
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('rubric-service');

const NOTE_EDIT_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

export interface CreateRubrikScoreInput {
  subjectUserId: string;
  scoredByUserId: string;
  rubrikKey: string;
  level: number;           // 1-4
  journalId: string;
  weekNumber: number;
  cohortId: string;
  organizationId: string;
  comment?: string | null;
}

/**
 * Create a rubric score (append-only — unique per subjectUserId + contextKey).
 * contextKey format: "${rubrikKey}:${journalId}"
 */
export async function createRubrikScore(input: CreateRubrikScoreInput) {
  const contextKey = `${input.rubrikKey}:${input.journalId}`;

  log.info('Creating rubric score', {
    subjectUserId: input.subjectUserId,
    scoredByUserId: input.scoredByUserId,
    rubrikKey: input.rubrikKey,
    level: input.level,
    contextKey,
  });

  const context = {
    journalId: input.journalId,
    weekNumber: input.weekNumber,
    cohortId: input.cohortId,
  };

  const score = await prisma.rubrikScore.create({
    data: {
      organizationId: input.organizationId,
      subjectUserId: input.subjectUserId,
      scoredByUserId: input.scoredByUserId,
      rubrikKey: input.rubrikKey,
      level: input.level,
      context,
      contextKey,
      comment: input.comment ?? null,
      commentUpdatedAt: input.comment ? new Date() : null,
      cohortId: input.cohortId,
    },
  });

  log.info('Rubric score created', { scoreId: score.id });
  return score;
}

/**
 * Update the comment/note on an existing rubric score.
 * Only the original scorer can update.
 * Only within 48h of scoredAt.
 */
export async function updateNote(
  scoreId: string,
  note: string,
  requesterUserId: string,
): Promise<{ success: boolean; error?: string }> {
  const score = await prisma.rubrikScore.findUnique({
    where: { id: scoreId },
    select: { id: true, scoredByUserId: true, scoredAt: true },
  });

  if (!score) {
    return { success: false, error: 'Score not found' };
  }

  if (score.scoredByUserId !== requesterUserId) {
    log.warn('Note update rejected: not scorer', { scoreId, requesterUserId });
    return { success: false, error: 'Forbidden: only the scorer can update the note' };
  }

  const timeSinceScore = Date.now() - score.scoredAt.getTime();
  if (timeSinceScore > NOTE_EDIT_WINDOW_MS) {
    log.warn('Note update rejected: 48h window expired', { scoreId });
    return { success: false, error: 'Note can only be updated within 48 hours of scoring' };
  }

  await prisma.rubrikScore.update({
    where: { id: scoreId },
    data: {
      comment: note,
      commentUpdatedAt: new Date(),
    },
  });

  log.info('Note updated', { scoreId });
  return { success: true };
}

/**
 * Get rubric score for a specific journal (JOURNAL_REFLECTION rubrikKey).
 */
export async function getByJournal(journalId: string) {
  const contextKey = `JOURNAL_REFLECTION:${journalId}`;

  return prisma.rubrikScore.findFirst({
    where: { contextKey },
    include: {
      scoredBy: {
        select: { id: true, fullName: true, displayName: true },
      },
    },
  });
}
