/**
 * POST /api/event/rsvp/[id]/decline
 * Decline (cancel) an RSVP. Owner only.
 * Uses advisory lock + Serializable isolation for waitlist promote.
 * [id] = instanceId (not RSVP id, for simplicity).
 */

import { createApiHandler, ApiResponse, validateParams, ForbiddenError, NotFoundError } from '@/lib/api';
import { declineRSVP } from '@/lib/event/services/rsvp.service';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';

const paramsSchema = z.object({ id: z.string().min(1) });

export const POST = createApiHandler({
  auth: true,
  handler: async (_req, { user, params, log }) => {
    const { id: instanceId } = validateParams(params, paramsSchema);

    // Verify ownership — must have an RSVP for this instance
    const rsvp = await prisma.rSVP.findUnique({
      where: { instanceId_userId: { instanceId, userId: user.id } },
      select: { id: true, status: true, userId: true },
    });

    if (!rsvp) throw NotFoundError('RSVP');
    if (rsvp.userId !== user.id) throw ForbiddenError();
    if (rsvp.status === 'DECLINED') {
      return ApiResponse.success({ message: 'RSVP already declined', promoted: false });
    }

    log.info('Declining RSVP', { userId: user.id, instanceId, rsvpId: rsvp.id });

    const result = await declineRSVP(user.id, instanceId);
    return ApiResponse.success(result);
  },
});
