/**
 * src/lib/kp-group-resolver/resolve-maba-for-kp.ts
 * NAWASENA M04 — Resolve all Maba user IDs in a KP's group.
 *
 * Queries M03 KPGroup → KPGroupMember to find all active Maba members.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('kp-group-resolver');

export interface MabaListResult {
  mabaUserIds: string[];
  kpGroupId: string;
  kpGroupCode: string;
}

/**
 * Resolve all Maba user IDs that belong to the KP's active group in a cohort.
 *
 * @param kpUserId - User ID of the KP coordinator
 * @param cohortId - Cohort ID to scope the lookup
 * @returns List of Maba user IDs and KP group info, or null if KP has no group
 */
export async function resolveMabaForKP(
  kpUserId: string,
  cohortId: string,
): Promise<MabaListResult | null> {
  log.debug('Resolving Maba list for KP', { kpUserId, cohortId });

  const kpGroup = await prisma.kPGroup.findFirst({
    where: {
      kpCoordinatorUserId: kpUserId,
      cohortId,
      status: { not: 'ARCHIVED' },
    },
    include: {
      members: {
        where: { status: 'ACTIVE' },
        select: { userId: true },
      },
    },
  });

  if (!kpGroup) {
    log.debug('No KP group found for KP coordinator', { kpUserId, cohortId });
    return null;
  }

  const mabaUserIds = kpGroup.members.map((m) => m.userId);

  log.debug('Resolved Maba list for KP', {
    kpUserId,
    kpGroupId: kpGroup.id,
    mabaCount: mabaUserIds.length,
  });

  return {
    mabaUserIds,
    kpGroupId: kpGroup.id,
    kpGroupCode: kpGroup.code,
  };
}
