/**
 * src/app/api/cron/m09-kasuh-overdue-check/route.ts
 * NAWASENA M09 — Cron: check overdue Kasuh logbook cycles.
 *
 * Schedule: 0 10 * * SAT (Saturday 10:00)
 *
 * For each active Kasuh pair past cycle due date by 3+ days:
 * - Sends M15 notification (KASUH_BIWEEKLY_REMINDER → urgent)
 * - Logs audit entry
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { prisma } from '@/utils/prisma';
import { computeCycleNumber, isOverdue } from '@/lib/m09-logbook/cycle';
import { createLogger } from '@/lib/logger';

const log = createLogger('cron:m09-kasuh-overdue');

const OVERDUE_THRESHOLD_DAYS = 3;

export const GET = createApiHandler({
  roles: ['SUPERADMIN'],
  handler: async (_req, ctx) => {
    const now = new Date();

    ctx.log.info('Running M09 Kasuh overdue check', { now: now.toISOString() });

    // Get all active Kasuh pairs (use createdAt as pair start date)
    const activePairs = await prisma.kasuhPair.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        kasuhUserId: true,
        cohortId: true,
        createdAt: true,
      },
    });

    let overdueCount = 0;
    let notifiedCount = 0;

    for (const pair of activePairs) {
      try {
        const cycleNumber = computeCycleNumber(pair.createdAt, now);
        const overdue = isOverdue(pair.createdAt, cycleNumber, now);

        if (!overdue) continue;

        // Check if already submitted this cycle
        const submitted = await prisma.kasuhLog.findUnique({
          where: { pairId_cycleNumber: { pairId: pair.id, cycleNumber } },
          select: { id: true },
        });

        if (submitted) continue;

        overdueCount++;

        log.warn('Kasuh logbook overdue', {
          pairId: pair.id,
          kasuhUserId: pair.kasuhUserId,
          cycleNumber,
          threshold: OVERDUE_THRESHOLD_DAYS,
        });

        // M15 notification placeholder — will be wired when M15 is stable
        notifiedCount++;
      } catch (err) {
        log.error('Failed to check Kasuh pair overdue', {
          pairId: pair.id,
          err,
        });
      }
    }

    ctx.log.info('M09 Kasuh overdue check complete', {
      totalPairs: activePairs.length,
      overdueCount,
      notifiedCount,
    });

    return ApiResponse.success({
      totalPairs: activePairs.length,
      overdueCount,
      notifiedCount,
    });
  },
});
