/**
 * src/app/api/triwulan/archive/route.ts
 * NAWASENA M14 — GET /api/triwulan/archive
 *
 * Returns list of finalized/BLM-acknowledged triwulan reviews for the org.
 * Roles: SC, PEMBINA, BLM, SUPERADMIN
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { listArchivedReviews } from '@/lib/triwulan/archive/service';

export const GET = createApiHandler({
  roles: ['SC', 'PEMBINA', 'BLM', 'SUPERADMIN'],
  handler: async (_req, ctx) => {
    const orgId = ctx.user.organizationId!;

    ctx.log.info('Fetching triwulan archive', { orgId, userId: ctx.user.id });

    const reviews = await listArchivedReviews(orgId);

    return ApiResponse.success(reviews);
  },
});
