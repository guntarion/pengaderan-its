/**
 * src/app/api/anon-reports/superadmin/audit-log/route.ts
 * GET /api/anon-reports/superadmin/audit-log
 *
 * SUPERADMIN-only query of AnonReportAccessLog.
 * Filter by actorId, action, date range. Paginated.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateQuery } from '@/lib/api';
import { setAnonSessionVars } from '@/lib/anon-report/rls-helpers';
import { z } from 'zod';

const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  actorId: z.string().optional(),
  action: z.string().optional(),
  reportId: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export const GET = createApiHandler({
  roles: ['SUPERADMIN'],
  handler: async (req, { user, log }) => {
    const query = validateQuery(req, auditLogQuerySchema);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { actorId, action, reportId, dateFrom, dateTo } = query;

    log.info('Fetching anon audit log', { role: user.role });

    const where: Record<string, unknown> = {};
    if (actorId) where.actorId = actorId;
    if (action) where.action = action;
    if (reportId) where.reportId = reportId;
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }

    const [entries, total] = await prisma.$transaction(async (tx) => {
      await setAnonSessionVars(tx, user);

      return Promise.all([
        tx.anonReportAccessLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            reportId: true,
            actorId: true,
            actorRole: true,
            action: true,
            meta: true,
            createdAt: true,
            // actorIpHash: excluded — sensitive even if hashed
          },
        }),
        tx.anonReportAccessLog.count({ where }),
      ]);
    });

    return ApiResponse.paginated(entries, { page, limit, total });
  },
});
