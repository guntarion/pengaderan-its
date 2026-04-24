/**
 * src/app/api/admin/master/passport-items/route.ts
 * GET /api/admin/master/passport-items — authenticated read
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { getPassportItems } from '@/lib/master-data/services/reference.service';
import type { DimensiKey } from '@prisma/client';

export const GET = createApiHandler({
  auth: true,
  handler: async (req, { log }) => {
    const { searchParams } = new URL(req.url);
    const dimensi = searchParams.get('dimensi') as DimensiKey | null;
    log.info('Fetching passport items', { dimensi });
    const data = await getPassportItems(dimensi ?? undefined);
    return ApiResponse.success(data);
  },
});
