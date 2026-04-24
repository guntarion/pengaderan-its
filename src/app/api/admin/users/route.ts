/**
 * /api/admin/users
 * GET — list users with filter (SC, SUPERADMIN, PEMBINA, BLM)
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { BadRequestError } from '@/lib/api/errors';
import { prisma } from '@/utils/prisma';

export const GET = createApiHandler({
  roles: ['SC', 'SUPERADMIN', 'PEMBINA', 'BLM', 'SATGAS'],
  handler: async (req, { user, log }) => {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
    const role = searchParams.get('role');
    const cohortId = searchParams.get('cohortId');
    const search = searchParams.get('search');
    const orgId = user.role === 'SUPERADMIN' ? searchParams.get('orgId') ?? user.organizationId : user.organizationId;

    if (!orgId) throw BadRequestError('organizationId tidak ditemukan');

    log.info('Fetching users', { orgId, page, limit, role, cohortId });

    const where = {
      organizationId: orgId ?? undefined,
      ...(role && { role: role as never }),
      ...(cohortId && { currentCohortId: cohortId }),
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { nrp: { contains: search } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { fullName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, email: true, fullName: true, displayName: true,
          nrp: true, role: true, status: true, createdAt: true,
          currentCohort: { select: { code: true, name: true } },
          paktaPanitiaStatus: true, socialContractStatus: true,
          lastLoginAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return ApiResponse.paginated(users, { page, limit, total });
  },
});
