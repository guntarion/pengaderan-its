/**
 * src/lib/kp-group-resolver/resolve-kp-for-maba.ts
 * NAWASENA M04 — Resolve which KP group/coordinator a Maba belongs to.
 *
 * Queries M03 KPGroupMember → KPGroup to find the KP coordinator user ID.
 * Returns null if Maba is not yet assigned to any KP group.
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('kp-group-resolver');

export interface KPResolvedResult {
  kpUserId: string;
  kpGroupId: string;
}

/**
 * Resolve the KP coordinator for a given Maba user ID and cohort.
 *
 * @param mabaUserId - User ID of the Maba
 * @param cohortId   - Cohort ID to scope the lookup
 * @returns KP user ID and KP group ID, or null if not assigned
 */
export async function resolveKPForMaba(
  mabaUserId: string,
  cohortId: string,
): Promise<KPResolvedResult | null> {
  log.debug('Resolving KP for Maba', { mabaUserId, cohortId });

  const membership = await prisma.kPGroupMember.findFirst({
    where: {
      userId: mabaUserId,
      cohortId,
      status: 'ACTIVE',
    },
    include: {
      kpGroup: {
        select: {
          id: true,
          kpCoordinatorUserId: true,
          status: true,
        },
      },
    },
  });

  if (!membership || !membership.kpGroup) {
    log.debug('No KP group membership found for Maba', { mabaUserId, cohortId });
    return null;
  }

  return {
    kpUserId: membership.kpGroup.kpCoordinatorUserId,
    kpGroupId: membership.kpGroup.id,
  };
}
