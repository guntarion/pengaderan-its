/**
 * src/app/api/verifier/queue/route.ts
 * NAWASENA M05 — GET: Verifier's PENDING queue (cached 15s Redis).
 */

import {
  createApiHandler,
  ApiResponse,
  validateQuery,
} from '@/lib/api';
import { listQueue } from '@/lib/passport/verifier.service';
import { withCache, CACHE_TTL } from '@/lib/cache';
import { z } from 'zod';

const querySchema = z.object({
  dimensi: z.string().optional(),
  mabaName: z.string().optional(),
});

export const GET = createApiHandler({
  roles: ['KP', 'KASUH', 'DOSEN_WALI', 'SC', 'SUPERADMIN'],
  handler: async (req, { user, log }) => {
    const query = validateQuery(req, querySchema);

    log.debug('Fetching verifier queue', { verifierId: user.id, filters: query });

    // Cache 15s per verifier to mitigate polling storm
    const cacheKey = `passport:queue:${user.id}:${JSON.stringify(query)}`;
    const queue = await withCache(
      cacheKey,
      CACHE_TTL.SHORT / 2, // 15s
      () => listQueue(user.id, query),
    );

    return ApiResponse.success(queue);
  },
});
