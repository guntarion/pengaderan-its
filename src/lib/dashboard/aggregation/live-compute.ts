/**
 * src/lib/dashboard/aggregation/live-compute.ts
 * Live (realtime) compute helpers for M13 Dashboard.
 *
 * These functions are called on-demand and cached in Redis for 60s.
 * All queries must complete < 500ms p95.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { withCache, CACHE_TTL } from '@/lib/cache';
import { daysAgo, round2 } from './aggregation-helpers';

const log = createLogger('m13/live-compute');

export interface MoodAvgResult {
  avg: number | null;
  count: number;
  trend7d: number[]; // daily avg for last 7 days
}

export interface AlertCountResult {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface UpcomingEvent {
  id: string;
  title: string;
  startTime: Date;
  location?: string;
  rsvpStatus?: string;
}

/**
 * Get today's average mood for a cohort.
 * Cached 60s with shared key per cohortId.
 */
export async function getTodayMoodAvg(cohortId: string): Promise<MoodAvgResult> {
  const cacheKey = `live:mood:${cohortId}`;

  return withCache(cacheKey, 60, async () => {
    const start = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await prisma.pulseCheck.aggregate({
      _avg: { mood: true },
      _count: { mood: true },
      where: {
        cohortId,
        recordedAt: { gte: today },
      },
    });

    // 7-day trend
    const trend7d: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = daysAgo(i);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayResult = await prisma.pulseCheck.aggregate({
        _avg: { mood: true },
        where: {
          cohortId,
          recordedAt: { gte: dayStart, lte: dayEnd },
        },
      });

      trend7d.push(round2(dayResult._avg.mood ?? null) ?? 0);
    }

    const durationMs = Date.now() - start;
    const moodCount = (result._count as { mood?: number }).mood ?? 0;
    log.debug('getTodayMoodAvg computed', { cohortId, count: moodCount, durationMs });

    return {
      avg: round2(result._avg.mood ?? null),
      count: moodCount,
      trend7d,
    };
  });
}

/**
 * Get active alert count for a cohort, broken down by severity.
 */
export async function getActiveAlertCount(
  cohortId: string,
  filter?: { severity?: string },
): Promise<AlertCountResult> {
  const cacheKey = `live:alerts:${cohortId}:${filter?.severity ?? 'all'}`;

  return withCache(cacheKey, CACHE_TTL.SHORT, async () => {
    const start = Date.now();

    const whereBase = {
      cohortId,
      status: 'ACTIVE' as const,
      ...(filter?.severity ? { severity: filter.severity as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' } : {}),
    };

    const [total, critical, high, medium, low] = await Promise.all([
      prisma.redFlagAlert.count({ where: { cohortId, status: 'ACTIVE' } }),
      prisma.redFlagAlert.count({ where: { ...whereBase, severity: 'CRITICAL' } }),
      prisma.redFlagAlert.count({ where: { ...whereBase, severity: 'HIGH' } }),
      prisma.redFlagAlert.count({ where: { ...whereBase, severity: 'MEDIUM' } }),
      prisma.redFlagAlert.count({ where: { ...whereBase, severity: 'LOW' } }),
    ]);

    const durationMs = Date.now() - start;
    log.debug('getActiveAlertCount computed', { cohortId, total, durationMs });

    return { total, critical, high, medium, low };
  });
}

/**
 * Get upcoming events for a cohort within the next N days.
 */
export async function getUpcomingEvents(
  cohortId: string,
  userId: string,
  days = 7,
): Promise<UpcomingEvent[]> {
  const cacheKey = `live:events:${cohortId}:${userId}:${days}d`;

  return withCache(cacheKey, CACHE_TTL.SHORT, async () => {
    const start = Date.now();
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const instances = await prisma.kegiatanInstance.findMany({
      where: {
        cohortId,
        scheduledAt: { gte: now, lte: future },
        status: { in: ['PLANNED', 'RUNNING'] },
      },
      select: {
        id: true,
        scheduledAt: true,
        location: true,
        kegiatan: { select: { nama: true } },
        rsvps: {
          where: { userId },
          select: { status: true },
          take: 1,
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
    });

    const durationMs = Date.now() - start;
    log.debug('getUpcomingEvents computed', { cohortId, userId, count: instances.length, durationMs });

    return instances.map((inst) => ({
      id: inst.id,
      title: inst.kegiatan.nama,
      startTime: inst.scheduledAt,
      location: inst.location ?? undefined,
      rsvpStatus: inst.rsvps[0]?.status,
    }));
  });
}

/**
 * Get the pulse streak (consecutive days with pulse entry) for a user.
 */
export async function getPulseStreak(userId: string): Promise<number> {
  const cacheKey = `live:streak:${userId}`;

  return withCache(cacheKey, 60, async () => {
    const start = Date.now();

    // Get all pulse entries for the user in the last 60 days (max streak check window)
    const since = daysAgo(60);
    const entries = await prisma.pulseCheck.findMany({
      where: { userId, recordedAt: { gte: since } },
      select: { recordedAt: true },
      orderBy: { recordedAt: 'desc' },
    });

    // Calculate streak from today going back
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i <= 60; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);

      const hasEntry = entries.some((e) => {
        const d = new Date(e.recordedAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === checkDate.getTime();
      });

      if (hasEntry) {
        streak++;
      } else if (i === 0) {
        // Today no entry yet — count yesterday streak
        continue;
      } else {
        break;
      }
    }

    const durationMs = Date.now() - start;
    log.debug('getPulseStreak computed', { userId, streak, durationMs });

    return streak;
  });
}
