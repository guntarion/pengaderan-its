/**
 * src/app/api/event-execution/instances/[id]/attendance/bulk/route.ts
 * NAWASENA M08 — Bulk mark all confirmed RSVPs as HADIR.
 *
 * POST /api/event-execution/instances/[id]/attendance/bulk
 *   - Body: { confirm: true }
 *   - Roles: OC, SC, SUPERADMIN
 */

import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { bulkMarkHadir } from '@/lib/event-execution/services/attendance.service';
import { bulkMarkSchema } from '@/lib/event-execution/schemas';

export const POST = createApiHandler({
  roles: ['OC', 'SC', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const instanceId = (params as { id: string }).id;
    const body = await validateBody(req, bulkMarkSchema);

    if (!body.confirm) {
      return ApiResponse.success({ skipped: true });
    }

    log.info('Bulk marking attendance HADIR', { instanceId, userId: user.id });

    const result = await bulkMarkHadir(instanceId, user.id, user.organizationId!);

    return ApiResponse.success(result);
  },
});
