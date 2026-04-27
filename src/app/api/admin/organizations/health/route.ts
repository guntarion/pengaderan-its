/**
 * GET /api/admin/organizations/health
 * Aggregated multi-HMJ health snapshot — PII-free.
 * Cached for 5 minutes.
 *
 * Returns: [{ orgId, slug, code, activeCohortCount, registrationStatus }]
 *
 * Phase RV-B — M01 Revisi Multi-HMJ
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { withCache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';
import { prisma } from '@/utils/prisma';

const HEALTH_CACHE_KEY = CACHE_KEYS.custom('organizations', 'health');

export const GET = createApiHandler({
  roles: ['SUPERADMIN'],
  handler: async (_req, { log }) => {
    log.info('Fetching organization health aggregates');

    const snapshot = await withCache(
      HEALTH_CACHE_KEY,
      CACHE_TTL.MEDIUM, // 5 minutes
      async () => {
        const orgs = await prisma.organization.findMany({
          where: { isActive: true },
          select: {
            id: true,
            code: true,
            slug: true,
            registrationStatus: true,
            facultyCode: true,
            organizationType: true,
            createdAt: true,
            _count: {
              select: {
                cohorts: true,
                users: true,
                paktaVersions: true,
              },
            },
          },
          orderBy: { code: 'asc' },
        });

        return orgs.map((org) => ({
          orgId: org.id,
          code: org.code,
          slug: org.slug,
          facultyCode: org.facultyCode,
          organizationType: org.organizationType,
          registrationStatus: org.registrationStatus,
          cohortCount: org._count.cohorts,
          userCount: org._count.users,
          paktaVersionCount: org._count.paktaVersions,
          createdAt: org.createdAt,
        }));
      },
    );

    return ApiResponse.success(snapshot);
  },
});
