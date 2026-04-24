/**
 * src/app/api/event-execution/instances/[id]/capacity/route.ts
 * NAWASENA M08 — Raise instance capacity.
 *
 * PATCH /api/event-execution/instances/[id]/capacity
 *   - Body: { newCapacity: number | null }
 *   - Roles: OC, SC, SUPERADMIN
 */

import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { raiseCapacity } from '@/lib/event-execution/services/capacity.service';
import { capacityRaiseSchema } from '@/lib/event-execution/schemas';

export const PATCH = createApiHandler({
  roles: ['OC', 'SC', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const instanceId = (params as { id: string }).id;
    const body = await validateBody(req, capacityRaiseSchema);

    log.info('Raising capacity', { instanceId, newCapacity: body.newCapacity });

    await raiseCapacity(instanceId, body.newCapacity, user.id, user.organizationId!);

    return ApiResponse.success({ success: true, newCapacity: body.newCapacity });
  },
});
