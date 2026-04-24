/**
 * src/app/api/admin/master/safeguard/route.ts
 * GET /api/admin/master/safeguard — authenticated read
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { getSafeguardProtocols } from '@/lib/master-data/services/reference.service';

export const GET = createApiHandler({
  auth: true,
  handler: async (_req, { log }) => {
    log.info('Fetching safeguard protocols');
    const data = await getSafeguardProtocols();
    return ApiResponse.success(data);
  },
});
