/**
 * src/app/api/admin/event-execution/instances/[id]/lifecycle-revert/route.ts
 * NAWASENA M08 — SC force-revert instance lifecycle.
 *
 * POST /api/admin/event-execution/instances/[id]/lifecycle-revert
 *   - Roles: SC, SUPERADMIN only
 */

import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { revertBySC } from '@/lib/event-execution/services/lifecycle.service';
import { lifecycleRevertSchema } from '@/lib/event-execution/schemas';

export const POST = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const instanceId = (params as { id: string }).id;
    const body = await validateBody(req, lifecycleRevertSchema);

    log.info('SC lifecycle revert', { instanceId, fromStatus: body.fromStatus, toStatus: body.toStatus });

    const result = await revertBySC(instanceId, body, user.id, user.organizationId!);

    return ApiResponse.success(result);
  },
});
