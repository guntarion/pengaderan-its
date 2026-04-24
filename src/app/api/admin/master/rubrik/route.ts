/**
 * src/app/api/admin/master/rubrik/route.ts
 * GET /api/admin/master/rubrik — authenticated read
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { getRubrikList } from '@/lib/master-data/services/reference.service';

export const GET = createApiHandler({
  auth: true,
  handler: async (_req, { log }) => {
    log.info('Fetching rubrik list');
    const data = await getRubrikList();
    return ApiResponse.success(data);
  },
});
