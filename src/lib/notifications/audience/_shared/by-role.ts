/**
 * src/lib/notifications/audience/_shared/by-role.ts
 * Helper: get all active users with a given role in an organization.
 */

import { prisma } from '@/utils/prisma';
import type { UserRole } from '@prisma/client';
import type { AudienceUser } from '../resolver';

export async function getActiveUsersByRole(
  organizationId: string,
  role: UserRole,
): Promise<AudienceUser[]> {
  return prisma.user.findMany({
    where: {
      organizationId,
      role,
      status: 'ACTIVE',
    },
    select: { id: true, fullName: true, email: true },
  });
}
