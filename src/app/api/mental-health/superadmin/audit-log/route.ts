/**
 * src/app/api/mental-health/superadmin/audit-log/route.ts
 * NAWASENA M11 — GET: Superadmin audit log viewer for MH access log.
 *
 * GET /api/mental-health/superadmin/audit-log
 *   Role: SUPERADMIN
 *   Query params: actorId?, targetUserId?, action?, dateFrom?, dateTo?, page?, limit?
 *
 * PRIVACY-CRITICAL:
 *   - AUDIT_REVIEW entry is written for EVERY query (the audit itself is audited).
 *   - Only SUPERADMIN can access this endpoint.
 *   - Returns MHAccessLog metadata (no decrypted content).
 *   - Uses withMHSuperadminContext to bypass RLS with mandatory audit.
 */

import { createApiHandler, ApiResponse, validateQuery } from '@/lib/api';
import { withMHSuperadminContext } from '@/lib/mh-screening/rls-helpers';
import { recordMHAccess } from '@/lib/mh-screening/access-log';
import { z } from 'zod';
import type { UserRole, MHAccessAction } from '@prisma/client';

const auditQuerySchema = z.object({
  actorId: z.string().optional(),
  targetUserId: z.string().optional(),
  action: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const GET = createApiHandler({
  roles: ['SUPERADMIN'],
  handler: async (req, ctx) => {
    const query = validateQuery(req, auditQuerySchema);

    ctx.log.info('MH audit log viewer GET', { actorId: ctx.user.id, query });

    const where: Record<string, unknown> = {};

    if (query.actorId) where.actorId = query.actorId as string;
    if (query.targetUserId) where.targetUserId = query.targetUserId as string;
    if (query.action) where.action = query.action as MHAccessAction;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom as string) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo as string) } : {}),
      };
    }

    const page = (query.page as number) ?? 1;
    const limit = (query.limit as number) ?? 50;
    const skip = (page - 1) * limit;

    const result = await withMHSuperadminContext(async (tx) => {
      // AUDIT FIRST — the audit review itself must be audited (mandatory)
      await recordMHAccess(tx, {
        actorId: ctx.user.id,
        actorRole: ctx.user.role as UserRole,
        action: 'AUDIT_REVIEW',
        targetType: 'MHAccessLog',
        metadata: {
          query: {
            actorId: query.actorId,
            targetUserId: query.targetUserId,
            action: query.action,
            dateFrom: query.dateFrom,
            dateTo: query.dateTo,
            page,
            limit,
          },
        },
      });

      const [entries, total] = await Promise.all([
        tx.mHAccessLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            actorId: true,
            actorRole: true,
            action: true,
            targetType: true,
            targetId: true,
            targetUserId: true,
            organizationId: true,
            reason: true,
            metadata: true,
            createdAt: true,
            // Note: ipHash is returned (it's already hashed — not plaintext IP)
            ipHash: true,
          },
        }),
        tx.mHAccessLog.count({ where }),
      ]);

      return { entries, total };
    });

    return ApiResponse.paginated(result.entries, {
      page,
      limit,
      total: result.total,
    });
  },
});
