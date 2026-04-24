/**
 * src/app/api/rubric-score/[scoreId]/route.ts
 * NAWASENA M04 — Rubric score note update endpoint.
 *
 * PATCH /api/rubric-score/[scoreId] — Update note/comment within 48h window.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, validateParams, BadRequestError } from '@/lib/api';
import { z } from 'zod';
import { updateNote } from '@/lib/rubric/service';
import { AuditAction } from '@prisma/client';

const paramsSchema = z.object({
  scoreId: z.string().min(1),
});

const patchNoteSchema = z.object({
  note: z.string().min(1).max(2000),
});

/**
 * PATCH /api/rubric-score/[scoreId]
 * Update the comment/note on an existing score.
 * Only within 48h of scoring, only by the original scorer.
 */
export const PATCH = createApiHandler({
  auth: true,
  handler: async (req, { user, params, log }) => {
    if (!user.organizationId) {
      throw BadRequestError('User has no organization');
    }

    const { scoreId } = validateParams(params, paramsSchema);
    const { note } = await validateBody(req, patchNoteSchema);

    log.info('Updating rubric score note', { scoreId, userId: user.id });

    const result = await updateNote(scoreId, note, user.id);

    if (!result.success) {
      throw BadRequestError(result.error ?? 'Failed to update note');
    }

    // Audit log
    await prisma.nawasenaAuditLog.create({
      data: {
        organizationId: user.organizationId,
        action: AuditAction.RUBRIC_SCORE_NOTE_UPDATE,
        actorUserId: user.id,
        subjectUserId: user.id,
        entityType: 'RubrikScore',
        entityId: scoreId,
        metadata: { noteLength: note.length },
      },
    });

    log.info('Rubric score note updated', { scoreId });

    return ApiResponse.success({ updated: true });
  },
});
