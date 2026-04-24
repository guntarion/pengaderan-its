/**
 * src/app/api/event-execution/instances/[id]/attendance/manual/route.ts
 * NAWASENA M08 — OC manual mark single attendance row.
 *
 * PATCH /api/event-execution/instances/[id]/attendance/manual
 *   - Body: { userId, status, notes? }
 *   - Roles: OC, SC, SUPERADMIN
 */

import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { manualMark } from '@/lib/event-execution/services/attendance.service';
import { manualMarkSchema } from '@/lib/event-execution/schemas';

export const PATCH = createApiHandler({
  roles: ['OC', 'SC', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const instanceId = (params as { id: string }).id;
    const body = await validateBody(req, manualMarkSchema);

    log.info('Manual mark attendance', { instanceId, userId: user.id, targetUserId: body.userId });

    const row = await manualMark(instanceId, body, user.id, user.organizationId!);

    return ApiResponse.success(row);
  },
});
