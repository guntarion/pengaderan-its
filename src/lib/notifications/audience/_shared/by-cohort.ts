/**
 * src/lib/notifications/audience/_shared/by-cohort.ts
 * Helper: get users in a specific cohort with a given role.
 */

import { prisma } from '@/utils/prisma';
import type { UserRole } from '@prisma/client';
import type { AudienceUser } from '../resolver';

export async function getUsersByCohort(
  organizationId: string,
  role: UserRole,
  cohortId: string,
): Promise<AudienceUser[]> {
  return prisma.user.findMany({
    where: {
      organizationId,
      role,
      status: 'ACTIVE',
      currentCohortId: cohortId,
    },
    select: { id: true, fullName: true, email: true },
  });
}

export async function getUsersInActiveCohort(
  organizationId: string,
  role: UserRole,
): Promise<AudienceUser[]> {
  const activeCohort = await prisma.cohort.findFirst({
    where: { organizationId, isActive: true },
    select: { id: true },
  });

  if (!activeCohort) return [];

  return getUsersByCohort(organizationId, role, activeCohort.id);
}
