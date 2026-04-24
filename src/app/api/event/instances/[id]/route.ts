/**
 * GET /api/event/instances/[id]
 * Instance detail — role-shaped response.
 * Maba: hides notesPanitia, picRoleHint.
 * OC/SC: full detail.
 */

import { createApiHandler, ApiResponse, validateParams, NotFoundError } from '@/lib/api';
import { getInstanceDetail, getInstanceDetailOC } from '@/lib/event/services/instance.service';
import { z } from 'zod';

const paramsSchema = z.object({ id: z.string().min(1) });

export const GET = createApiHandler({
  auth: true,
  handler: async (_req, { user, params, log }) => {
    const { id: instanceId } = validateParams(params, paramsSchema);
    const isOC = ['OC', 'SC', 'SUPERADMIN'].includes(user.role);

    log.info('Fetching instance detail', { instanceId, role: user.role });

    if (isOC) {
      const detail = await getInstanceDetailOC(instanceId);
      if (!detail) throw NotFoundError('Instance');
      return ApiResponse.success(detail);
    }

    const detail = await getInstanceDetail(instanceId, user.id);
    if (!detail) throw NotFoundError('Instance');
    return ApiResponse.success(detail);
  },
});
