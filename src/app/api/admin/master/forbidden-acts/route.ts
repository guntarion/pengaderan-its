/**
 * src/app/api/admin/master/forbidden-acts/route.ts
 * GET /api/admin/master/forbidden-acts — authenticated read
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { getForbiddenActs } from '@/lib/master-data/services/reference.service';

export const GET = createApiHandler({
  auth: true,
  handler: async (_req, { log }) => {
    log.info('Fetching forbidden acts');
    const data = await getForbiddenActs();
    return ApiResponse.success(data);
  },
});
