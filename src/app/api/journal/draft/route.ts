/**
 * src/app/api/journal/draft/route.ts
 * NAWASENA M04 — Journal draft auto-save endpoint.
 *
 * PUT /api/journal/draft — Upsert journal draft (auto-save).
 * Returns 409 on conflict (server version is newer).
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, BadRequestError, ConflictError } from '@/lib/api';
import { z } from 'zod';
import { upsertDraft } from '@/lib/journal/service';
import { AuditAction } from '@prisma/client';

const upsertDraftSchema = z.object({
  cohortId: z.string().min(1),
  weekNumber: z.number().int().min(1),
  whatHappened: z.string(),
  soWhat: z.string(),
  nowWhat: z.string(),
  clientUpdatedAt: z.string().datetime({ offset: true }),
});

/**
 * PUT /api/journal/draft
 * Auto-save draft. Conflict check on clientUpdatedAt.
 * Returns 409 if server has a newer version.
 */
export const PUT = createApiHandler({
  auth: true,
  handler: async (req, { user, log }) => {
    if (!user.organizationId) {
      throw BadRequestError('User has no organization');
    }

    const body = await validateBody(req, upsertDraftSchema);

    log.info('Upserting journal draft', {
      userId: user.id,
      cohortId: body.cohortId,
      weekNumber: body.weekNumber,
    });

    const result = await upsertDraft({
      userId: user.id,
      organizationId: user.organizationId,
      cohortId: body.cohortId,
      weekNumber: body.weekNumber,
      fields: {
        whatHappened: body.whatHappened,
        soWhat: body.soWhat,
        nowWhat: body.nowWhat,
      },
      clientUpdatedAt: new Date(body.clientUpdatedAt),
    });

    if (result.conflict) {
      log.warn('Draft conflict: server is newer', {
        userId: user.id,
        weekNumber: body.weekNumber,
      });
      throw ConflictError('Server has a newer version of this draft');
    }

    const draft = result.draft!;

    // Audit log
    await prisma.nawasenaAuditLog.create({
      data: {
        organizationId: user.organizationId,
        action: AuditAction.JOURNAL_DRAFT_UPSERT,
        actorUserId: user.id,
        subjectUserId: user.id,
        entityType: 'JournalDraft',
        entityId: draft.id,
        metadata: {
          weekNumber: body.weekNumber,
          wordCount: draft.wordCount,
        },
      },
    });

    log.info('Draft upserted', { draftId: draft.id, wordCount: draft.wordCount });

    return ApiResponse.success(draft);
  },
});
