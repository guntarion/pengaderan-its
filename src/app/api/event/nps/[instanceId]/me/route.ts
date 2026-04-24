/**
 * GET /api/event/nps/[instanceId]/me
 * Get own NPS submission + canSubmit flag.
 * Auth required.
 */

import { createApiHandler, ApiResponse, validateParams } from '@/lib/api';
import { getOwnNPSSubmission, canSubmitNPS } from '@/lib/event/services/nps.service';
import { z } from 'zod';

const paramsSchema = z.object({ instanceId: z.string().min(1) });

export const GET = createApiHandler({
  auth: true,
  handler: async (_req, { user, params, log }) => {
    const { instanceId } = validateParams(params, paramsSchema);
    log.info('Fetching own NPS', { userId: user.id, instanceId });

    const [submission, guard] = await Promise.all([
      getOwnNPSSubmission(user.id, instanceId),
      canSubmitNPS(user.id, instanceId),
    ]);

    return ApiResponse.success({
      submission,
      canSubmit: guard.canSubmit,
      reason: guard.reason,
      alreadySubmitted: guard.alreadySubmitted ?? Boolean(submission),
    });
  },
});
