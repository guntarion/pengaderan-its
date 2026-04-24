/**
 * src/app/api/mental-health/aggregate/transition/route.ts
 * NAWASENA M11 — F1→F4 severity transition aggregate (admin-only).
 *
 * GET /api/mental-health/aggregate/transition?cohortId=...
 *   Role: SC, PEMBINA, BLM, SATGAS, SUPERADMIN
 *   Returns: transition matrix F1 severity × F4 severity.
 *   Cell-floor masking (< 5) applied.
 *   Every access audited.
 */

import { createApiHandler, ApiResponse, validateQuery } from '@/lib/api';
import { aggregateF1toF4Transition } from '@/lib/mh-screening/aggregate';
import { withCache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';
import { z } from 'zod';
import type { UserRole } from '@prisma/client';

const transitionQuerySchema = z.object({
  cohortId: z.string().min(1, 'cohortId required'),
});

const ADMIN_ROLES = ['SC', 'PEMBINA', 'BLM', 'SATGAS', 'SUPERADMIN'];

export const GET = createApiHandler({
  roles: ADMIN_ROLES,
  handler: async (req, { user, log }) => {
    const { cohortId } = validateQuery(req, transitionQuerySchema);

    log.info('MH aggregate transition GET', { cohortId, actorId: user.id });

    const cacheKey = CACHE_KEYS.custom('mh-aggregate-transition', cohortId);

    const rows = await withCache(cacheKey, CACHE_TTL.MEDIUM, () =>
      aggregateF1toF4Transition(
        cohortId,
        {
          id: user.id,
          role: user.role as UserRole,
          organizationId: (user as { organizationId?: string }).organizationId,
        },
      ),
    );

    return ApiResponse.success(rows);
  },
});
