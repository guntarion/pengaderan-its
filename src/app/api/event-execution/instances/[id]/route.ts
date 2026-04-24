/**
 * src/app/api/event-execution/instances/[id]/route.ts
 * NAWASENA M08 — Get single KegiatanInstance detail.
 *
 * GET /api/event-execution/instances/[id]
 *   - Returns full instance detail for OC view
 *   - Roles: OC, SC, SUPERADMIN
 */

import { createApiHandler, ApiResponse, validateParams, idParamSchema } from '@/lib/api';
import { getInstanceDetailForOC } from '@/lib/event-execution/services/instance.service';

export const GET = createApiHandler({
  roles: ['OC', 'SC', 'SUPERADMIN'],
  handler: async (_req, { user, params, log }) => {
    const { id: instanceId } = validateParams(params, idParamSchema);

    log.info('Fetching instance detail', { instanceId });

    const instance = await getInstanceDetailForOC(instanceId, user.organizationId!);

    if (!instance) {
      throw new Error('NOT_FOUND: Instance tidak ditemukan.');
    }

    return ApiResponse.success(instance);
  },
});
