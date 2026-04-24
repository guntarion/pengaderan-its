/**
 * src/app/api/admin/master/taksonomi/route.ts
 * GET /api/admin/master/taksonomi — authenticated read
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { getTaxonomyMeta } from '@/lib/master-data/services/taxonomy.service';
import type { TaxonomyGroup } from '@prisma/client';

export const GET = createApiHandler({
  auth: true,
  handler: async (req, { log }) => {
    const { searchParams } = new URL(req.url);
    const group = searchParams.get('group') as TaxonomyGroup | null;
    log.info('Fetching taxonomy meta', { group });
    const data = await getTaxonomyMeta(group ?? undefined);
    return ApiResponse.success(data);
  },
});
