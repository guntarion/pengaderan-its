/**
 * src/app/api/event-execution/instances/[id]/outputs/route.ts
 * NAWASENA M08 — GET output uploads for an instance.
 *
 * GET /api/event-execution/instances/[id]/outputs
 *   - Roles: OC, SC, SUPERADMIN
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { getOutputsForInstance } from '@/lib/event-execution/services/output.service';

export const GET = createApiHandler({
  roles: ['OC', 'SC', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const instanceId = (params as { id: string }).id;
    log.info('Fetching outputs', { instanceId });

    const outputs = await getOutputsForInstance(instanceId, user.organizationId!);

    return ApiResponse.success(outputs);
  },
});
