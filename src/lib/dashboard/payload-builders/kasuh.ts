/**
 * src/lib/dashboard/payload-builders/kasuh.ts
 * Dashboard payload builder for KASUH (Kakak Asuh) role.
 *
 * Gathers: adik asuh list with pulse trend + journal streak, logbook deadline.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import type { KasuhDashboardPayload } from '@/types/dashboard';

const log = createLogger('m13/payload-builder/kasuh');

export async function buildKasuhDashboard(
  userId: string,
  cohortId: string,
  _organizationId: string,
): Promise<KasuhDashboardPayload> {
  const start = Date.now();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Find this kasuh's pairs
  const kasuhPairs = await prisma.kasuhPair.findMany({
    where: { kasuhUserId: userId, cohortId, status: 'ACTIVE' },
    select: { mabaUserId: true },
  });

  const mabaIds = kasuhPairs.map((p) => p.mabaUserId);

  if (mabaIds.length === 0) {
    log.debug('Kasuh has no active pairs', { userId, cohortId });
    return {
      userId,
      cohortId,
      adikAsuhList: [],
      upcomingLogbookDeadline: undefined,
    };
  }

  // Get maba info + pulse trend per adik asuh
  const [mabaUsers, pulseTrends, journalCounts] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: mabaIds } },
      select: { id: true, fullName: true },
    }),

    // Pulse trend: last 7 days per maba
    Promise.all(
      mabaIds.map(async (mabaId) => {
        const pulses = await prisma.pulseCheck.findMany({
          where: { userId: mabaId, recordedAt: { gte: sevenDaysAgo } },
          select: { mood: true, localDate: true },
          orderBy: { localDate: 'asc' },
        });
        return { mabaId, scores: pulses.map((p) => p.mood) };
      }),
    ),

    // Journal streak: count journals in last 7 days per maba
    Promise.all(
      mabaIds.map(async (mabaId) => {
        const count = await prisma.journal.count({
          where: { userId: mabaId, cohortId, createdAt: { gte: sevenDaysAgo } },
        });
        return { mabaId, recentCount: count };
      }),
    ),
  ]);

  // Pulse streak: consecutive days from today going back
  const pulseStreakMap: Record<string, number> = {};
  for (const { mabaId, scores } of pulseTrends) {
    pulseStreakMap[mabaId] = scores.length; // simplified: count of entries in 7d
  }

  const journalCountMap: Record<string, number> = {};
  for (const { mabaId, recentCount } of journalCounts) {
    journalCountMap[mabaId] = recentCount;
  }

  const adikAsuhList = mabaUsers.map((maba) => ({
    id: maba.id,
    name: maba.fullName ?? 'Unknown',
    pulseStreak: pulseStreakMap[maba.id] ?? 0,
    journalStreak: journalCountMap[maba.id] ?? 0,
    moodTrend7d: (pulseTrends.find((p) => p.mabaId === maba.id)?.scores ?? []),
  }));

  // Upcoming logbook deadline: next cycle due date
  const nextCycle = await prisma.kasuhLog.findFirst({
    where: { kasuhUserId: userId, cohortId },
    orderBy: { cycleDueDate: 'desc' },
    select: { cycleDueDate: true },
  });

  log.debug('Kasuh payload built', {
    userId,
    cohortId,
    adikCount: adikAsuhList.length,
    durationMs: Date.now() - start,
  });

  return {
    userId,
    cohortId,
    adikAsuhList,
    upcomingLogbookDeadline: nextCycle?.cycleDueDate ?? undefined,
  };
}
