/**
 * src/lib/passport/progress.service.ts
 * NAWASENA M05 — Passport progress computation + caching.
 *
 * computeProgress(userId)    → ProgressSummary (fresh from DB)
 * getProgress(userId)        → ProgressSummary (cached 60s TTL)
 * invalidateProgress(userId) → clears cache
 * aggregateForCohort(...)    → CohortAggregate (cached 5 min)
 */

import { prisma } from '@/utils/prisma';
import { DimensiKey, PassportEntryStatus } from '@prisma/client';
import { createLogger } from '@/lib/logger';
import {
  getCachedProgress,
  setCachedProgress,
  invalidateProgressCache,
  getCachedAggregate,
  setCachedAggregate,
} from './progress-cache';
import crypto from 'crypto';

const log = createLogger('passport:progress');

// ---- Types ----

export interface DimensionProgress {
  total: number;
  verified: number;
  pending: number;
  rejected: number;
  notStarted: number;
  cancelled: number;
}

export interface ProgressSummary {
  generatedAt: string;
  totalItems: number;
  verified: number;
  pending: number;
  rejected: number;
  notStarted: number;
  cancelled: number;
  byDimension: Record<DimensiKey, DimensionProgress>;
}

export interface CohortUserProgress {
  userId: string;
  userName: string;
  nrp: string | null;
  verified: number;
  pending: number;
  rejected: number;
  notStarted: number;
  byDimension: Record<string, DimensionProgress>;
}

export interface CohortAggregateFilter {
  kpGroupId?: string;
  dimensi?: DimensiKey;
  status?: PassportEntryStatus;
}

export interface CohortAggregate {
  generatedAt: string;
  cohortId: string;
  totalMaba: number;
  byDimension: Record<DimensiKey, DimensionProgress>;
  stuckMaba: StuckMabaInfo[];
  silentVerifiers: SilentVerifierInfo[];
}

export interface StuckMabaInfo {
  userId: string;
  userName: string;
  nrp: string | null;
  dimensi: DimensiKey;
  daysSinceLastActivity: number;
}

export interface SilentVerifierInfo {
  verifierId: string;
  verifierName: string;
  queueCount: number;
  oldestPendingDays: number;
}

/**
 * Compute fresh progress for a user from the database.
 */
export async function computeProgress(userId: string): Promise<ProgressSummary> {
  log.debug('Computing progress', { userId });

  // Get all passport items
  const allItems = await prisma.passportItem.findMany({
    select: { id: true, dimensi: true },
  });
  const totalItems = allItems.length;

  // Get all entries for this user
  const entries = await prisma.passportEntry.findMany({
    where: { userId },
    select: {
      itemId: true,
      status: true,
      item: { select: { dimensi: true } },
    },
  });

  // Build a map: itemId → latest entry status
  // For resubmit chains, only the latest entry per (userId, itemId) counts
  const latestByItem = new Map<string, PassportEntryStatus>();
  for (const entry of entries) {
    // PENDING takes priority; otherwise VERIFIED; then REJECTED; CANCELLED = not started
    const current = latestByItem.get(entry.itemId);
    const priority: Record<PassportEntryStatus, number> = {
      PENDING: 3,
      VERIFIED: 4,
      REJECTED: 2,
      CANCELLED: 1,
    };
    if (!current || priority[entry.status] > priority[current]) {
      latestByItem.set(entry.itemId, entry.status);
    }
  }

  // Build dimension totals from all items
  const itemsByDimension = new Map<DimensiKey, string[]>();
  for (const item of allItems) {
    const list = itemsByDimension.get(item.dimensi) ?? [];
    list.push(item.id);
    itemsByDimension.set(item.dimensi, list);
  }

  // Count status per dimension
  const byDimension = {} as Record<DimensiKey, DimensionProgress>;

  let totalVerified = 0;
  let totalPending = 0;
  let totalRejected = 0;
  let totalNotStarted = 0;
  const totalCancelled = 0;

  for (const [dimensi, itemIds] of itemsByDimension) {
    const dp: DimensionProgress = {
      total: itemIds.length,
      verified: 0,
      pending: 0,
      rejected: 0,
      notStarted: 0,
      cancelled: 0,
    };

    for (const itemId of itemIds) {
      const status = latestByItem.get(itemId);
      if (!status || status === PassportEntryStatus.CANCELLED) {
        dp.notStarted++;
        totalNotStarted++;
      } else if (status === PassportEntryStatus.VERIFIED) {
        dp.verified++;
        totalVerified++;
      } else if (status === PassportEntryStatus.PENDING) {
        dp.pending++;
        totalPending++;
      } else if (status === PassportEntryStatus.REJECTED) {
        dp.rejected++;
        totalRejected++;
      }
    }

    byDimension[dimensi] = dp;
  }

  const result: ProgressSummary = {
    generatedAt: new Date().toISOString(),
    totalItems,
    verified: totalVerified,
    pending: totalPending,
    rejected: totalRejected,
    notStarted: totalNotStarted,
    cancelled: totalCancelled,
    byDimension,
  };

  log.debug('Progress computed', { userId, totalItems, verified: totalVerified });
  return result;
}

/**
 * Get cached progress (with fallback to fresh compute).
 */
export async function getProgress(userId: string): Promise<ProgressSummary> {
  const cached = await getCachedProgress<ProgressSummary>(userId);
  if (cached) return cached;

  const fresh = await computeProgress(userId);
  await setCachedProgress(userId, fresh);
  return fresh;
}

/**
 * Invalidate progress cache for a user.
 */
export async function invalidateProgress(userId: string): Promise<void> {
  await invalidateProgressCache(userId);
}

/**
 * Aggregate progress for all Maba in a cohort.
 * Cached 5 minutes in Redis.
 */
export async function aggregateForCohort(
  cohortId: string,
  filter: CohortAggregateFilter = {},
): Promise<CohortAggregate> {
  const filterHash = crypto
    .createHash('md5')
    .update(JSON.stringify(filter))
    .digest('hex')
    .slice(0, 8);

  const cached = await getCachedAggregate<CohortAggregate>(cohortId, filterHash);
  if (cached) return cached;

  log.debug('Computing cohort aggregate', { cohortId, filter });

  // Get all Maba in cohort
  const mabaUsers = await prisma.user.findMany({
    where: {
      currentCohortId: cohortId,
      role: 'MABA',
      ...(filter.kpGroupId
        ? {
            kpGroupMemberships: {
              some: {
                kpGroupId: filter.kpGroupId,
                leftAt: null,
              },
            },
          }
        : {}),
    },
    select: { id: true, fullName: true, nrp: true },
  });

  const allItems = await prisma.passportItem.findMany({
    select: { id: true, dimensi: true },
    ...(filter.dimensi ? { where: { dimensi: filter.dimensi } } : {}),
  });

  // Aggregate by dimension
  const byDimension = {} as Record<DimensiKey, DimensionProgress>;

  // Initialize all dimensions
  const dimensiKeys = Object.values(DimensiKey);
  for (const d of dimensiKeys) {
    const dimItems = allItems.filter((i) => i.dimensi === d);
    byDimension[d] = {
      total: dimItems.length * mabaUsers.length,
      verified: 0,
      pending: 0,
      rejected: 0,
      notStarted: 0,
      cancelled: 0,
    };
  }

  const mabaIds = mabaUsers.map((u) => u.id);
  let entries: { userId: string; itemId: string; status: PassportEntryStatus; item: { dimensi: import('@prisma/client').DimensiKey } }[] = [];
  if (mabaIds.length > 0) {
    entries = await prisma.passportEntry.findMany({
      where: {
        cohortId,
        userId: { in: mabaIds },
      },
      select: {
        userId: true,
        itemId: true,
        status: true,
        item: { select: { dimensi: true } },
      },
    });

    // Build latest per (userId, itemId)
    const latestMap = new Map<string, PassportEntryStatus>();
    const priority: Record<PassportEntryStatus, number> = {
      PENDING: 3,
      VERIFIED: 4,
      REJECTED: 2,
      CANCELLED: 1,
    };
    for (const e of entries) {
      const key = `${e.userId}:${e.itemId}`;
      const cur = latestMap.get(key);
      if (!cur || priority[e.status] > priority[cur]) {
        latestMap.set(key, e.status);
      }
    }

    // Aggregate
    for (const [key, status] of latestMap) {
      const [, itemId] = key.split(':');
      const item = allItems.find((i) => i.id === itemId);
      if (!item) continue;
      const dp = byDimension[item.dimensi];
      if (!dp) continue;

      if (status === PassportEntryStatus.VERIFIED) dp.verified++;
      else if (status === PassportEntryStatus.PENDING) dp.pending++;
      else if (status === PassportEntryStatus.REJECTED) dp.rejected++;
    }

    // notStarted = total - verified - pending - rejected - cancelled
    for (const dp of Object.values(byDimension)) {
      dp.notStarted = dp.total - dp.verified - dp.pending - dp.rejected - dp.cancelled;
    }
  }

  // Identify stuck Maba (no submit in any dimension > 14 days)
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const stuckMaba: StuckMabaInfo[] = [];

  // Per-dimension check: any dimensi where Maba has not submitted in 14+ days
  for (const maba of mabaUsers) {
    for (const d of dimensiKeys) {
      const dimItems = allItems.filter((i) => i.dimensi === d);
      if (dimItems.length === 0) continue;

      const hasDimEntry = await prisma.passportEntry.findFirst({
        where: {
          userId: maba.id,
          cohortId,
          item: { dimensi: d },
          submittedAt: { gte: fourteenDaysAgo },
        },
      });

      if (!hasDimEntry) {
        // Check if there are unverified items in this dimension
        const dimItemIds = dimItems.map((i) => i.id);
        const verifiedCount = entries.filter(
          (e) =>
            e.userId === maba.id &&
            dimItemIds.includes(e.itemId) &&
            e.status === PassportEntryStatus.VERIFIED,
        ).length;

        if (verifiedCount < dimItems.length) {
          stuckMaba.push({
            userId: maba.id,
            userName: maba.fullName,
            nrp: maba.nrp,
            dimensi: d,
            daysSinceLastActivity: 14,
          });
        }
      }
    }
  }

  // Identify silent verifiers (queue > 5 items)
  const silentVerifiers: SilentVerifierInfo[] = [];
  const verifierCounts = await prisma.passportEntry.groupBy({
    by: ['verifierId'],
    where: {
      cohortId,
      status: PassportEntryStatus.PENDING,
      verifierId: { not: null },
    },
    _count: { id: true },
    having: { id: { _count: { gt: 5 } } },
  });

  for (const vc of verifierCounts) {
    if (!vc.verifierId) continue;
    const verifier = await prisma.user.findUnique({
      where: { id: vc.verifierId },
      select: { fullName: true },
    });

    const oldestEntry = await prisma.passportEntry.findFirst({
      where: {
        verifierId: vc.verifierId,
        cohortId,
        status: PassportEntryStatus.PENDING,
      },
      orderBy: { submittedAt: 'asc' },
      select: { submittedAt: true },
    });

    const daysDiff = oldestEntry
      ? Math.floor((Date.now() - oldestEntry.submittedAt.getTime()) / (24 * 60 * 60 * 1000))
      : 0;

    silentVerifiers.push({
      verifierId: vc.verifierId,
      verifierName: verifier?.fullName ?? 'Unknown',
      queueCount: vc._count.id,
      oldestPendingDays: daysDiff,
    });
  }

  const aggregate: CohortAggregate = {
    generatedAt: new Date().toISOString(),
    cohortId,
    totalMaba: mabaUsers.length,
    byDimension,
    stuckMaba: stuckMaba.slice(0, 50), // limit to 50
    silentVerifiers,
  };

  await setCachedAggregate(cohortId, filterHash, aggregate);
  return aggregate;
}
