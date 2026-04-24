/**
 * src/app/api/admin/master/roles-permissions/route.ts
 * GET /api/admin/master/roles-permissions — authenticated read
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { getRolePermissions } from '@/lib/master-data/services/reference.service';

export const GET = createApiHandler({
  auth: true,
  handler: async (_req, { log }) => {
    log.info('Fetching role permissions');
    const data = await getRolePermissions();
    return ApiResponse.success(data);
  },
});
