/**
 * src/app/api/cohorts/public/route.ts
 * GET /api/cohorts/public
 *
 * Public cohort list endpoint for the anonymous report submission form dropdown.
 * No authentication required.
 * Returns only ACTIVE cohorts with minimal display info.
 */

import { prisma } from '@/utils/prisma';
import { ApiResponse } from '@/lib/api/response';
import { createLogger } from '@/lib/logger';

const log = createLogger('cohorts-public');

export async function GET() {
  try {
    log.info('Fetching public cohort list for anon form');

    const cohorts = await prisma.cohort.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        code: true,
        name: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [{ organization: { name: 'asc' } }, { code: 'asc' }],
    });

    const formatted = cohorts.map((c) => ({
      id: c.id,
      label: `${c.organization.name} - ${c.code} (${c.name})`,
      organizationId: c.organizationId,
      organizationName: c.organization.name,
      organizationCode: c.organization.code,
    }));

    log.info('Public cohort list fetched', { count: formatted.length });

    return ApiResponse.success(formatted);
  } catch (err) {
    log.error('Failed to fetch public cohort list', { error: err });
    return ApiResponse.fail(500, 'INTERNAL_ERROR', 'Gagal memuat daftar kohort');
  }
}
