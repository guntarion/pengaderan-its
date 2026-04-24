/**
 * src/lib/kasuh-share-resolver/list-shared-for-kasuh.ts
 * NAWASENA M07 — List shared Time Capsule entries and Life Map goals for Kasuh.
 *
 * Returns shared TC entries + shared LM goals for a given Maba (for Kasuh view).
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('kasuh-share-resolver:list-shared');

export interface SharedTimeCapsuleEntry {
  id: string;
  title: string | null;
  body: string;
  mood: number | null;
  publishedAt: string | null;
  attachments: Array<{ id: string; mimeType: string; originalFilename: string; size: number }>;
}

export interface SharedLifeMapGoal {
  id: string;
  area: string;
  goalText: string;
  metric: string;
  status: string;
  deadline: string;
  updates: Array<{
    id: string;
    milestone: string;
    progressPercent: number;
    isLate: boolean;
    recordedAt: string;
  }>;
}

export async function listSharedTimeCapsuleEntries(
  mabaUserId: string,
  cohortId: string,
  options: { page?: number; limit?: number } = {},
): Promise<{ entries: SharedTimeCapsuleEntry[]; total: number }> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const skip = (page - 1) * limit;

  const [entries, total] = await Promise.all([
    prisma.timeCapsuleEntry.findMany({
      where: {
        userId: mabaUserId,
        cohortId,
        sharedWithKasuh: true,
        publishedAt: { not: null },
      },
      orderBy: { publishedAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        body: true,
        mood: true,
        publishedAt: true,
        attachments: {
          select: { id: true, mimeType: true, originalFilename: true, size: true },
        },
      },
    }),
    prisma.timeCapsuleEntry.count({
      where: {
        userId: mabaUserId,
        cohortId,
        sharedWithKasuh: true,
        publishedAt: { not: null },
      },
    }),
  ]);

  log.info('Listed shared TC entries for Kasuh', {
    mabaUserId,
    cohortId,
    count: entries.length,
    total,
  });

  return {
    entries: entries.map((e) => ({
      ...e,
      publishedAt: e.publishedAt?.toISOString() ?? null,
    })),
    total,
  };
}

export async function listSharedLifeMapGoals(
  mabaUserId: string,
  cohortId: string,
): Promise<SharedLifeMapGoal[]> {
  const goals = await prisma.lifeMap.findMany({
    where: {
      userId: mabaUserId,
      cohortId,
      sharedWithKasuh: true,
    },
    orderBy: [{ area: 'asc' }, { createdAt: 'desc' }],
    include: {
      updates: {
        orderBy: { milestone: 'asc' },
        select: {
          id: true,
          milestone: true,
          progressPercent: true,
          isLate: true,
          recordedAt: true,
        },
      },
    },
  });

  log.info('Listed shared LM goals for Kasuh', { mabaUserId, cohortId, count: goals.length });

  return goals.map((g) => ({
    id: g.id,
    area: g.area,
    goalText: g.goalText,
    metric: g.metric,
    status: g.status,
    deadline: g.deadline.toISOString(),
    updates: g.updates.map((u) => ({
      id: u.id,
      milestone: u.milestone,
      progressPercent: u.progressPercent,
      isLate: u.isLate,
      recordedAt: u.recordedAt.toISOString(),
    })),
  }));
}
