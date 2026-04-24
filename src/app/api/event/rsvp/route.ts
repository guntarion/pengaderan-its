/**
 * POST /api/event/rsvp
 * Create or update RSVP for an instance.
 * Auth required. Rate limited (10/hour per user).
 */

import { createApiHandler, ApiResponse, validateBody, BadRequestError, RateLimitError } from '@/lib/api';
import { createOrUpdateRSVP } from '@/lib/event/services/rsvp.service';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';

const bodySchema = z.object({
  instanceId: z.string().min(1, 'instanceId is required'),
});

export const POST = createApiHandler({
  auth: true,
  handler: async (req, { user, log }) => {
    const { instanceId } = await validateBody(req, bodySchema);

    // Get user's organizationId
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true },
    });

    if (!dbUser) throw BadRequestError('User not found');

    log.info('Creating RSVP', { userId: user.id, instanceId });

    try {
      const result = await createOrUpdateRSVP(user.id, instanceId, dbUser.organizationId);
      return ApiResponse.success(result, 201);
    } catch (err) {
      const message = (err as Error).message ?? '';
      if (message.startsWith('RATE_LIMITED:')) {
        throw RateLimitError(message.replace('RATE_LIMITED: ', ''));
      }
      if (message.startsWith('BAD_REQUEST:')) {
        throw BadRequestError(message.replace('BAD_REQUEST: ', ''));
      }
      throw err;
    }
  },
});
