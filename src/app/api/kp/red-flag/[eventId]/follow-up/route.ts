/**
 * src/app/api/kp/red-flag/[eventId]/follow-up/route.ts
 * NAWASENA M04 — Follow-up recording endpoint.
 *
 * POST /api/kp/red-flag/[eventId]/follow-up — Record a follow-up action.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, validateParams, BadRequestError, NotFoundError, ForbiddenError } from '@/lib/api';
import { z } from 'zod';
import { createFollowUp } from '@/lib/follow-up/service';
import { resolveMabaForKP } from '@/lib/kp-group-resolver/resolve-maba-for-kp';
import { AuditAction, FollowUpContactType } from '@prisma/client';

const paramsSchema = z.object({
  eventId: z.string().min(1),
});

const createFollowUpSchema = z.object({
  cohortId: z.string().min(1),
  contactType: z.enum(['CHAT', 'CALL', 'IN_PERSON', 'OTHER']),
  summary: z.string().min(20, 'Summary must be at least 20 characters').max(2000),
  nextAction: z.string().max(1000).optional().nullable(),
});

/**
 * POST /api/kp/red-flag/[eventId]/follow-up
 * Record a follow-up action for a red-flag event.
 * KP must have scope to the subject Maba.
 */
export const POST = createApiHandler({
  auth: true,
  handler: async (req, { user, params, log }) => {
    if (!user.organizationId) {
      throw BadRequestError('User has no organization');
    }

    const { eventId } = validateParams(params, paramsSchema);
    const body = await validateBody(req, createFollowUpSchema);

    log.info('Recording follow-up', { eventId, actorUserId: user.id });

    // Fetch the red-flag event to verify access
    const event = await prisma.redFlagEvent.findFirst({
      where: {
        id: eventId,
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        subjectUserId: true,
        cohortId: true,
        status: true,
        organizationId: true,
      },
    });

    if (!event) {
      throw NotFoundError('RedFlagEvent');
    }

    // Verify KP has scope to this Maba
    const mabaInfo = await resolveMabaForKP(user.id, event.cohortId);
    const hasScope =
      mabaInfo && mabaInfo.mabaUserIds.includes(event.subjectUserId);

    if (!hasScope) {
      log.warn('KP does not have scope to this red-flag event', {
        eventId,
        kpUserId: user.id,
        subjectUserId: event.subjectUserId,
      });
      throw ForbiddenError();
    }

    let followUp;
    try {
      followUp = await createFollowUp({
        organizationId: user.organizationId,
        redFlagEventId: eventId,
        actorUserId: user.id,
        subjectUserId: event.subjectUserId,
        contactType: body.contactType as FollowUpContactType,
        summary: body.summary,
        nextAction: body.nextAction ?? null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create follow-up';
      throw BadRequestError(message);
    }

    // Audit log
    await prisma.nawasenaAuditLog.create({
      data: {
        organizationId: user.organizationId,
        action: AuditAction.RED_FLAG_FOLLOW_UP,
        actorUserId: user.id,
        subjectUserId: event.subjectUserId,
        entityType: 'FollowUpRecord',
        entityId: followUp.id,
        metadata: {
          redFlagEventId: eventId,
          contactType: body.contactType,
          summaryLength: body.summary.length,
        },
      },
    });

    log.info('Follow-up recorded', {
      followUpId: followUp.id,
      eventId,
      actorUserId: user.id,
    });

    return ApiResponse.success(followUp, 201);
  },
});
