/**
 * src/app/api/rubric-score/route.ts
 * NAWASENA M04 — Rubric scoring endpoint.
 *
 * POST /api/rubric-score — Create a new rubric score (KP only).
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, BadRequestError, ForbiddenError, ConflictError } from '@/lib/api';
import { z } from 'zod';
import { createRubrikScore } from '@/lib/rubric/service';
import { getJournalForKPReview } from '@/lib/journal/kp-accessor';
import { AuditAction } from '@prisma/client';

const createScoreSchema = z.object({
  journalId: z.string().min(1),
  rubrikKey: z.string().min(1).default('JOURNAL_REFLECTION'),
  level: z.number().int().min(1).max(4),
  weekNumber: z.number().int().min(1),
  cohortId: z.string().min(1),
  comment: z.string().max(2000).optional().nullable(),
});

/**
 * POST /api/rubric-score
 * Create a rubric score for a Maba journal.
 * Caller must be a KP with scope to the journal's Maba.
 */
export const POST = createApiHandler({
  auth: true,
  handler: async (req, { user, log }) => {
    if (!user.organizationId) {
      throw BadRequestError('User has no organization');
    }

    const body = await validateBody(req, createScoreSchema);

    // Verify KP has scope to this journal (also audits access)
    let journal;
    try {
      journal = await getJournalForKPReview(body.journalId, user.id, user.organizationId);
    } catch (err) {
      throw ForbiddenError();
    }

    if (!journal) {
      throw BadRequestError('Journal not found');
    }

    log.info('Creating rubric score', {
      journalId: body.journalId,
      scoredByUserId: user.id,
      level: body.level,
    });

    let score;
    try {
      score = await createRubrikScore({
        subjectUserId: journal.userId,
        scoredByUserId: user.id,
        rubrikKey: body.rubrikKey ?? 'JOURNAL_REFLECTION',
        level: body.level,
        journalId: body.journalId,
        weekNumber: body.weekNumber,
        cohortId: body.cohortId,
        organizationId: user.organizationId,
        comment: body.comment ?? null,
      });
    } catch (err) {
      // P2002 = unique constraint (already scored)
      const code = (err as { code?: string }).code;
      if (code === 'P2002') {
        throw ConflictError('This journal has already been scored');
      }
      throw err;
    }

    // Audit log
    await prisma.nawasenaAuditLog.create({
      data: {
        organizationId: user.organizationId,
        action: AuditAction.RUBRIC_SCORE_CREATE,
        actorUserId: user.id,
        subjectUserId: journal.userId,
        entityType: 'RubrikScore',
        entityId: score.id,
        metadata: {
          rubrikKey: body.rubrikKey,
          level: body.level,
          journalId: body.journalId,
          weekNumber: body.weekNumber,
        },
      },
    });

    log.info('Rubric score created', { scoreId: score.id });

    return ApiResponse.success(score, 201);
  },
});
