/**
 * GET /api/event/instances/[id]/oc
 * OC-specific instance detail — includes internal fields, full RSVP list.
 * Roles: OC, SC, SUPERADMIN.
 */

import { createApiHandler, ApiResponse, validateParams, NotFoundError } from '@/lib/api';
import { getInstanceDetailOC } from '@/lib/event/services/instance.service';
import { z } from 'zod';

const paramsSchema = z.object({ id: z.string().min(1) });

export const GET = createApiHandler({
  roles: ['OC', 'SC', 'SUPERADMIN'],
  handler: async (_req, { params, log }) => {
    const { id: instanceId } = validateParams(params, paramsSchema);

    log.info('OC fetching instance detail', { instanceId });

    const detail = await getInstanceDetailOC(instanceId);
    if (!detail) throw NotFoundError('Instance');
    return ApiResponse.success(detail);
  },
});
