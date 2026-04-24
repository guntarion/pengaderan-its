/**
 * src/app/api/event-execution/instances/[id]/attendance/route.ts
 * NAWASENA M08 — GET attendance list for an instance.
 *
 * GET /api/event-execution/instances/[id]/attendance
 *   - Returns attendance rows + stats
 *   - Roles: OC, SC, SUPERADMIN
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import {
  getAttendanceListForInstance,
  getAttendanceStats,
} from '@/lib/event-execution/services/attendance.service';

export const GET = createApiHandler({
  roles: ['OC', 'SC', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const instanceId = (params as { id: string }).id;
    log.info('Fetching attendance list', { instanceId });

    const [rows, stats] = await Promise.all([
      getAttendanceListForInstance(instanceId, user.organizationId!),
      getAttendanceStats(instanceId, user.organizationId!),
    ]);

    return ApiResponse.success({ rows, stats });
  },
});
