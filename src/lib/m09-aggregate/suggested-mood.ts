/**
 * src/lib/m09-aggregate/suggested-mood.ts
 * NAWASENA M09 — Compute suggested mood from M04 PulseCheck data.
 *
 * Queries PulseCheck for all KP Group members on a given date,
 * returns average mood with responder count context.
 * Returns null if responderCount < MIN_RESPONDERS (3).
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('m09:suggested-mood');

const MIN_RESPONDERS = 3;

export interface SuggestedMoodResult {
  suggestedMood: number | null; // null if < MIN_RESPONDERS
  responderCount: number;
  totalMembers: number;
}

/**
 * Compute the suggested mood for a KP's group based on M04 PulseCheck.
 *
 * @param kpUserId    - The KP user ID (to look up their KPGroup)
 * @param cohortId    - Cohort ID for scoping pulse checks
 * @param kpGroupId   - KPGroup ID to find member user IDs
 * @param localDate   - The local date (Asia/Jakarta) to query pulse for
 */
export async function computeSuggestedMood(
  kpUserId: string,
  cohortId: string,
  kpGroupId: string,
  localDate: Date,
): Promise<SuggestedMoodResult> {
  log.debug('Computing suggested mood', { kpUserId, cohortId, kpGroupId, localDate });

  // 1. Get all ACTIVE members of this KP group
  const members = await prisma.kPGroupMember.findMany({
    where: {
      kpGroupId,
      cohortId,
      status: 'ACTIVE',
    },
    select: { userId: true },
  });

  const totalMembers = members.length;
  const memberUserIds = members.map((m) => m.userId);

  if (totalMembers === 0) {
    log.debug('No active KP group members found', { kpGroupId });
    return { suggestedMood: null, responderCount: 0, totalMembers: 0 };
  }

  // 2. Query PulseCheck for these members on this date
  // Match localDate by date portion only (ignoring time)
  const dateStart = new Date(localDate);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(localDate);
  dateEnd.setHours(23, 59, 59, 999);

  const pulseChecks = await prisma.pulseCheck.findMany({
    where: {
      cohortId,
      userId: { in: memberUserIds },
      localDate: {
        gte: dateStart,
        lte: dateEnd,
      },
    },
    select: { mood: true, userId: true },
  });

  const responderCount = pulseChecks.length;

  if (responderCount < MIN_RESPONDERS) {
    log.debug('Not enough responders for suggested mood', {
      kpGroupId,
      responderCount,
      totalMembers,
      threshold: MIN_RESPONDERS,
    });
    return { suggestedMood: null, responderCount, totalMembers };
  }

  // 3. Compute average mood
  const totalMood = pulseChecks.reduce((sum, p) => sum + p.mood, 0);
  const suggestedMood = Math.round((totalMood / responderCount) * 10) / 10;

  log.debug('Suggested mood computed', {
    kpGroupId,
    suggestedMood,
    responderCount,
    totalMembers,
  });

  return { suggestedMood, responderCount, totalMembers };
}
