/**
 * src/app/api/mental-health/aggregate/route.ts
 * NAWASENA M11 — MH aggregate query API (admin-only).
 *
 * GET /api/mental-health/aggregate?cohortId=...&phase=F1
 *   Role: SC, PEMBINA, BLM, SATGAS, SUPERADMIN
 *   Returns: severity distribution per KP group with cell-floor masking (min 5).
 *   Cache: 5 minutes per (cohortId, phase).
 *   Audit log: EXPORT_AGGREGATE.
 *
 * PRIVACY-CRITICAL:
 *   - Cell floor = 5 enforced server-side (never a UI toggle).
 *   - No individual userId is ever returned.
 *   - Uses withMHBypass — every call is audited.
 *   - Caching applies only to aggregate (never individual data).
 */

import { createApiHandler, ApiResponse, validateQuery } from '@/lib/api';
import { aggregateSeverityPerKPGroup } from '@/lib/mh-screening/aggregate';
import { withCache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';
import { z } from 'zod';
import type { UserRole } from '@prisma/client';

const aggregateQuerySchema = z.object({
  cohortId: z.string().min(1, 'cohortId required'),
  phase: z.enum(['F1', 'F4']).default('F1'),
});

const ADMIN_ROLES = ['SC', 'PEMBINA', 'BLM', 'SATGAS', 'SUPERADMIN'];

export const GET = createApiHandler({
  roles: ADMIN_ROLES,
  handler: async (req, { user, log }) => {
    const { cohortId: rawCohortId, phase: rawPhase } = validateQuery(req, aggregateQuerySchema);
    const cohortId = rawCohortId as string;
    const phase = (rawPhase as 'F1' | 'F4') ?? 'F1';

    log.info('MH aggregate GET', { cohortId, phase, actorId: user.id, actorRole: user.role });

    // Cache key includes cohortId + phase (never by user — aggregate is shared)
    const cacheKey = CACHE_KEYS.custom('mh-aggregate', `${cohortId}:${phase}`);

    const rows = await withCache(cacheKey, CACHE_TTL.MEDIUM, () =>
      aggregateSeverityPerKPGroup(
        cohortId,
        phase,
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
