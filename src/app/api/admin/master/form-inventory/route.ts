/**
 * src/app/api/admin/master/form-inventory/route.ts
 * GET /api/admin/master/form-inventory — authenticated read
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { getFormInventory } from '@/lib/master-data/services/reference.service';

export const GET = createApiHandler({
  auth: true,
  handler: async (_req, { log }) => {
    log.info('Fetching form inventory');
    const data = await getFormInventory();
    return ApiResponse.success(data);
  },
});
