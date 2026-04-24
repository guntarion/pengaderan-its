/**
 * src/lib/dashboard/payload-builders/maba.ts
 * Dashboard payload builder for MABA role.
 *
 * Gathers: pulse streak, passport completion %, upcoming events, today's mood, pakta status.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import {
  getTodayMoodAvg,
  getUpcomingEvents,
  getPulseStreak,
} from '@/lib/dashboard/aggregation/live-compute';
import type { MabaDashboardPayload } from '@/types/dashboard';

const log = createLogger('m13/payload-builder/maba');

export async function buildMabaDashboard(
  userId: string,
  cohortId: string,
  _organizationId: string,
): Promise<MabaDashboardPayload> {
  const start = Date.now();

  const [user, pulseStreak, passportStats, upcomingEvents, moodToday] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { paktaPanitiaStatus: true, socialContractStatus: true },
    }),
    getPulseStreak(userId),
    prisma.passportEntry.aggregate({
      _count: { id: true },
      where: { userId, cohortId },
    }).then(async (total) => {
      const verified = await prisma.passportEntry.count({
        where: { userId, cohortId, status: 'VERIFIED' },
      });
      return { total: total._count.id, verified };
    }),
    getUpcomingEvents(cohortId, userId, 7),
    getTodayMoodAvg(cohortId),
  ]);

  const passportCompletion = passportStats.total > 0
    ? Math.round((passportStats.verified / passportStats.total) * 100)
    : null;

  // Maba pakta = socialContractStatus (MABA signs Social Contract, not Pakta Panitia)
  const paktaSigned = user?.socialContractStatus === 'SIGNED';

  log.debug('Maba payload built', { userId, cohortId, durationMs: Date.now() - start });

  return {
    userId,
    cohortId,
    pulseStreak,
    passportCompletion,
    upcomingEvents,
    moodToday,
    paktaSigned,
  };
}
