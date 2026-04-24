/**
 * src/app/api/journal/submit/route.ts
 * NAWASENA M04 — Journal submit endpoint.
 *
 * POST /api/journal/submit — Final submission of a weekly journal.
 * Validates minimum 300 words, sets isLate flag, clears draft.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, BadRequestError } from '@/lib/api';
import { z } from 'zod';
import { submitJournal } from '@/lib/journal/service';
import { AuditAction } from '@prisma/client';

const submitJournalSchema = z.object({
  cohortId: z.string().min(1),
  weekNumber: z.number().int().min(1),
  whatHappened: z.string().min(1),
  soWhat: z.string().min(1),
  nowWhat: z.string().min(1),
  cohortStartDate: z.string().datetime({ offset: true }),
  timezone: z.string().optional(),
});

/**
 * POST /api/journal/submit
 * Submit a completed journal. Validates min 300 words, determines isLate.
 */
export const POST = createApiHandler({
  auth: true,
  handler: async (req, { user, log }) => {
    if (!user.organizationId) {
      throw BadRequestError('User has no organization');
    }

    const body = await validateBody(req, submitJournalSchema);

    log.info('Journal submit request', {
      userId: user.id,
      cohortId: body.cohortId,
      weekNumber: body.weekNumber,
    });

    let journal;
    try {
      journal = await submitJournal({
        userId: user.id,
        organizationId: user.organizationId,
        cohortId: body.cohortId,
        weekNumber: body.weekNumber,
        fields: {
          whatHappened: body.whatHappened,
          soWhat: body.soWhat,
          nowWhat: body.nowWhat,
        },
        cohortStartDate: new Date(body.cohortStartDate),
        timezone: body.timezone,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit journal';
      throw BadRequestError(message);
    }

    // Audit log
    await prisma.nawasenaAuditLog.create({
      data: {
        organizationId: user.organizationId,
        action: AuditAction.JOURNAL_SUBMIT,
        actorUserId: user.id,
        subjectUserId: user.id,
        entityType: 'Journal',
        entityId: journal.id,
        metadata: {
          weekNumber: journal.weekNumber,
          wordCount: journal.wordCount,
          isLate: journal.isLate,
          status: journal.status,
        },
      },
    });

    log.info('Journal submitted', {
      journalId: journal.id,
      weekNumber: journal.weekNumber,
      isLate: journal.isLate,
    });

    return ApiResponse.success(journal, 201);
  },
});
