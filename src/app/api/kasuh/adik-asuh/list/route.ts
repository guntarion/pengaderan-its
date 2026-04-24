/**
 * src/app/api/kasuh/adik-asuh/list/route.ts
 * NAWASENA M09 — Kasuh adik asuh list with cycle status + pulse trend
 *
 * GET /api/kasuh/adik-asuh/list
 * Roles: KASUH
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { listAdikAsuh, getAdikPulseTrend } from '@/lib/m09-access/kasuh-adik-resolver';
import { withKasuhDashboardCache } from '@/lib/m09-aggregate/kasuh-dashboard-cache';
import { computeCycleNumber, computeCycleDueDate, getCycleStatus } from '@/lib/m09-logbook/cycle';
import { prisma } from '@/utils/prisma';

export const GET = createApiHandler({
  roles: ['KASUH'],
  handler: async (_req, ctx) => {
    const kasuhUserId = ctx.user.id;
    ctx.log.info('Fetching adik asuh list', { kasuhUserId });

    const data = await withKasuhDashboardCache(kasuhUserId, async () => {
      const pairs = await listAdikAsuh(kasuhUserId);
      const now = new Date();

      const adikAsuhList = await Promise.all(
        pairs.map(async (pair) => {
          const cycleNumber = computeCycleNumber(pair.createdAt, now);
          const cycleDueDate = computeCycleDueDate(pair.createdAt, cycleNumber);
          const cycleStatus = getCycleStatus(pair.createdAt, now);

          // Get latest kasuh log for this pair
          const latestLog = await prisma.kasuhLog.findFirst({
            where: { pairId: pair.id },
            orderBy: { cycleNumber: 'desc' },
            select: { cycleNumber: true, submittedAt: true, attendance: true },
          });

          // Get pulse trend (14 days)
          let pulseTrend = null;
          try {
            pulseTrend = await getAdikPulseTrend(kasuhUserId, pair.mabaUserId, 14);
          } catch {
            ctx.log.warn('Failed to get pulse trend', { mabaUserId: pair.mabaUserId });
          }

          return {
            pair: {
              id: pair.id,
              mabaUserId: pair.mabaUserId,
              status: pair.status,
              createdAt: pair.createdAt,
            },
            maba: (pair as typeof pair & { maba?: { id: string; fullName: string; displayName?: string | null; image?: string | null; nrp?: string | null } }).maba,
            cycleNumber,
            cycleDueDate,
            cycleStatus,
            latestLog,
            pulseTrend,
          };
        }),
      );

      return adikAsuhList;
    });

    ctx.log.info('Adik asuh list fetched', { kasuhUserId, count: data.length });

    return ApiResponse.success(data);
  },
});
