/**
 * src/lib/notifications/audience/_shared/by-assignment.ts
 * Helper: get users by assignment (KP group, buddy pair, etc.).
 * Stub implementation — full M03 integration in Phase H.
 */

import { prisma } from '@/utils/prisma';
import type { AudienceUser } from '../resolver';
import { createLogger } from '@/lib/logger';

const log = createLogger('notifications:audience-by-assignment');

export async function getMabaByKp(
  organizationId: string,
  kpUserId: string,
): Promise<AudienceUser[]> {
  // V1 stub: return Maba in the same org/cohort as this KP
  // Full M03 integration: query KPGroupMember where KPGroup.coordinatorId = kpUserId
  log.debug('getMabaByKp stub — returning org Mabas', { kpUserId });

  return prisma.user.findMany({
    where: { organizationId, role: 'MABA', status: 'ACTIVE' },
    select: { id: true, fullName: true, email: true },
    take: 10,
  });
}
