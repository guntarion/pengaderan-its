/**
 * GET /api/admin/audit-log
 * Fetch audit log with filters.
 *
 * Roles: SC, PEMBINA, BLM, SUPERADMIN
 * SC/PEMBINA/BLM: org scoped
 * SUPERADMIN: can query cross-org with ?orgId=
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { BadRequestError } from '@/lib/api/errors';
import { prisma } from '@/utils/prisma';

export const GET = createApiHandler({
  roles: ['SC', 'PEMBINA', 'BLM', 'SATGAS', 'SUPERADMIN'],
  handler: async (req, { user, log }) => {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
    const action = searchParams.get('action');
    const actorUserId = searchParams.get('actorUserId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const orgId = user.role === 'SUPERADMIN'
      ? (searchParams.get('orgId') ?? user.organizationId)
      : user.organizationId;

    if (!orgId) throw BadRequestError('organizationId tidak ditemukan');

    log.info('Fetching audit log', { orgId, page, action });

    const where = {
      organizationId: orgId ?? undefined,
      ...(action && { action: action as never }),
      ...(actorUserId && { actorUserId }),
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    };

    const [entries, total] = await Promise.all([
      prisma.nawasenaAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, action: true, entityType: true, entityId: true,
          createdAt: true, reason: true, ipAddress: true,
          actor: { select: { fullName: true, email: true } },
          subject: { select: { fullName: true, email: true } },
          metadata: true,
        },
      }),
      prisma.nawasenaAuditLog.count({ where }),
    ]);

    return ApiResponse.paginated(entries, { page, limit, total });
  },
});
