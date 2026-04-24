/**
 * src/lib/portfolio/composer.ts
 * NAWASENA M07 — Portfolio composer.
 *
 * Fetches Time Capsule entries, Life Map goals, and Passport badge data in
 * parallel, caches result for 5 minutes. Returns a unified portfolio object.
 */

import { prisma } from '@/utils/prisma';
import { withCache } from '@/lib/cache';
import { LifeMapStatus } from '@prisma/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('portfolio:composer');

const CACHE_TTL_SECONDS = 300; // 5 minutes

export interface PortfolioData {
  userId: string;
  cohortId: string;
  timeCapsule: {
    totalEntries: number;
    sharedEntries: number;
    recentEntries: Array<{
      id: string;
      title: string | null;
      body: string;
      mood: number | null;
      publishedAt: string;
      sharedWithKasuh: boolean;
    }>;
  };
  lifeMap: {
    totalGoals: number;
    activeGoals: number;
    achievedGoals: number;
    byArea: Array<{
      area: string;
      status: string;
      goalText: string;
      milestonesDone: string[];
    }>;
  };
  passport: {
    completedBadges: number;
    totalBadges: number;
  } | null;
}

async function buildPortfolio(
  userId: string,
  cohortId: string,
): Promise<PortfolioData> {
  log.info('Building portfolio', { userId, cohortId });

  const [tcEntries, tcStats, lifeMapGoals, passportBadges] = await Promise.all([
    // Recent 20 published entries
    prisma.timeCapsuleEntry.findMany({
      where: { userId, cohortId, publishedAt: { not: null } },
      orderBy: { publishedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        body: true,
        mood: true,
        publishedAt: true,
        sharedWithKasuh: true,
      },
    }),
    // TC aggregates
    prisma.timeCapsuleEntry.aggregate({
      where: { userId, cohortId, publishedAt: { not: null } },
      _count: { id: true },
    }),
    // Life Map goals (all)
    prisma.lifeMap.findMany({
      where: { userId, cohortId },
      include: {
        updates: {
          select: { milestone: true },
          orderBy: { milestone: 'asc' },
        },
      },
    }),
    // Passport — placeholder for M05 integration (not yet available)
    Promise.resolve(null),
  ]);

  // Compute TC stats
  const totalEntries = tcStats._count.id;
  const sharedEntries = tcEntries.filter((e) => e.sharedWithKasuh).length;

  // Compute Life Map stats
  const activeGoals = lifeMapGoals.filter((g) => g.status === LifeMapStatus.ACTIVE).length;
  const achievedGoals = lifeMapGoals.filter((g) => g.status === LifeMapStatus.ACHIEVED).length;

  const byArea = lifeMapGoals.map((g) => ({
    area: g.area,
    status: g.status,
    goalText: g.goalText,
    milestonesDone: g.updates.map((u) => u.milestone),
  }));

  // Passport stats — placeholder for future M05 integration
  const passport: PortfolioData['passport'] = null;
  void passportBadges; // unused until M05 integration

  return {
    userId,
    cohortId,
    timeCapsule: {
      totalEntries,
      sharedEntries,
      recentEntries: tcEntries
        .filter((e) => e.publishedAt !== null)
        .map((e) => ({
          ...e,
          publishedAt: e.publishedAt!.toISOString(),
        })),
    },
    lifeMap: {
      totalGoals: lifeMapGoals.length,
      activeGoals,
      achievedGoals,
      byArea,
    },
    passport,
  };
}

/**
 * Get portfolio data with 5-minute cache.
 * Cache key: `portfolio:{userId}:{cohortId}`
 */
export async function getPortfolio(userId: string, cohortId: string): Promise<PortfolioData> {
  const cacheKey = `portfolio:${userId}:${cohortId}`;
  return withCache(cacheKey, CACHE_TTL_SECONDS, () => buildPortfolio(userId, cohortId));
}
