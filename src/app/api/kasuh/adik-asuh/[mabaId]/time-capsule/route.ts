/**
 * src/app/api/kasuh/adik-asuh/[mabaId]/time-capsule/route.ts
 * NAWASENA M07 — Kasuh view: list shared Time Capsule entries for an adik asuh.
 *
 * GET /api/kasuh/adik-asuh/:mabaId/time-capsule
 * Auth required. Must be active Kasuh for the given Maba (or admin bypass).
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateParams, validateQuery } from '@/lib/api';
import { ForbiddenError, NotFoundError } from '@/lib/api';
import { resolveKasuhForMaba } from '@/lib/kasuh-share-resolver/resolve-kasuh-for-maba';
import { listSharedTimeCapsuleEntries, listSharedLifeMapGoals } from '@/lib/kasuh-share-resolver/list-shared-for-kasuh';
import { auditLog } from '@/services/audit-log.service';
import { z } from 'zod';

const paramsSchema = z.object({ mabaId: z.string().cuid() });
const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  includeLifeMap: z.enum(['true', 'false']).optional().default('false'),
});

export const GET = createApiHandler({
  auth: true,
  handler: async (req, { user, params, log: ctx }) => {
    const { mabaId } = validateParams(params, paramsSchema);
    const query = validateQuery(req, querySchema);

    ctx.info('Kasuh viewing shared content', { kasuhId: user.id, mabaId });

    // Verify Maba exists
    const maba = await prisma.user.findUnique({
      where: { id: mabaId },
      select: { id: true, fullName: true, currentCohortId: true },
    });

    if (!maba) throw NotFoundError('Maba tidak ditemukan');

    // Verify Kasuh pair
    const pair = await resolveKasuhForMaba(mabaId, { id: user.id, role: user.role }, maba.currentCohortId ?? undefined);

    if (!pair) {
      throw ForbiddenError('Akses ditolak: bukan Kakak Kasuh aktif dari Maba ini');
    }

    const cohortId = pair.cohortId || maba.currentCohortId;

    if (!cohortId) {
      throw new Error('Cohort tidak ditemukan');
    }

    // Fetch shared entries
    const [tcResult, lifeMapGoals] = await Promise.all([
      listSharedTimeCapsuleEntries(mabaId, cohortId, {
        page: query.page,
        limit: query.limit,
      }),
      query.includeLifeMap === 'true'
        ? listSharedLifeMapGoals(mabaId, cohortId)
        : Promise.resolve(null),
    ]);

    // Audit log for Kasuh access
    if (!pair.isAdminBypass) {
      await auditLog.record({
        userId: user.id,
        action: 'PORTFOLIO_VIEW_ACCESS' as Parameters<typeof auditLog.record>[0]['action'],
        resource: 'KasuhSharedView',
        resourceId: mabaId,
        newValue: { mabaId, cohortId, page: query.page },
        request: req,
      });
    }

    ctx.info('Kasuh shared view fetched', {
      kasuhId: user.id,
      mabaId,
      entryCount: tcResult.entries.length,
    });

    return ApiResponse.success({
      entries: tcResult.entries,
      total: tcResult.total,
      page: query.page,
      limit: query.limit,
      mabaName: maba.fullName,
      lifeMapGoals: lifeMapGoals ?? undefined,
    });
  },
});
