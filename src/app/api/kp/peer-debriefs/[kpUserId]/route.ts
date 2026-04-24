/**
 * src/app/api/kp/peer-debriefs/[kpUserId]/route.ts
 * NAWASENA M09 — KP peer debrief detail (read-only)
 *
 * GET /api/kp/peer-debriefs/[kpUserId]?weekNumber=N&yearNumber=Y
 * Roles: KP
 */

import { createApiHandler, ApiResponse, validateParams, validateQuery } from '@/lib/api';
import { getPeerDebrief } from '@/lib/m09-access/peer-cohort-resolver';
import { prisma } from '@/utils/prisma';
import { NotFoundError } from '@/lib/api';
import { z } from 'zod';

const paramsSchema = z.object({ kpUserId: z.string().min(1) });
const querySchema = z.object({
  weekNumber: z.coerce.number().int().min(1).max(53).optional(),
  yearNumber: z.coerce.number().int().optional(),
});

export const GET = createApiHandler({
  roles: ['KP'],
  handler: async (req, ctx) => {
    const readerKpId = ctx.user.id;
    const { kpUserId: debriefKpId } = validateParams(ctx.params, paramsSchema);
    const query = validateQuery(req, querySchema);

    const now = new Date();
    const weekNumber = query.weekNumber ?? getISOWeekNumber(now);
    const yearNumber = query.yearNumber ?? now.getFullYear();

    ctx.log.info('Fetching peer debrief detail', { readerKpId, debriefKpId, weekNumber, yearNumber });

    // Get the peer's profile (limited info)
    const peerUser = await prisma.user.findUnique({
      where: { id: debriefKpId },
      select: { fullName: true, displayName: true, image: true },
    });

    if (!peerUser) {
      throw NotFoundError('Pengguna tidak ditemukan');
    }

    const debrief = await getPeerDebrief(readerKpId, debriefKpId, weekNumber, yearNumber);

    return ApiResponse.success({
      peer: {
        id: debriefKpId,
        name: peerUser.displayName ?? peerUser.fullName,
        image: peerUser.image,
      },
      debrief,
      weekNumber,
      yearNumber,
    });
  },
});

function getISOWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
    )
  );
}
