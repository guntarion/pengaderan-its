/**
 * GET /api/event/instances/[id]/rsvp-list
 * Scoped RSVP list. Visibility depends on role.
 * Maba: sees CONFIRMED names + own status.
 * OC/SC: full list.
 */

import { createApiHandler, ApiResponse, validateParams } from '@/lib/api';
import { getRSVPListScoped, getListOC } from '@/lib/event/services/rsvp.service';
import { z } from 'zod';

const paramsSchema = z.object({ id: z.string().min(1) });

export const GET = createApiHandler({
  auth: true,
  handler: async (_req, { user, params, log }) => {
    const { id: instanceId } = validateParams(params, paramsSchema);
    const isOC = ['OC', 'SC', 'SUPERADMIN'].includes(user.role);

    log.info('Fetching RSVP list', { instanceId, role: user.role, isOC });

    if (isOC) {
      const list = await getListOC(instanceId);
      return ApiResponse.success(list);
    }

    const list = await getRSVPListScoped(instanceId, user.id, user.role);
    return ApiResponse.success(list);
  },
});
