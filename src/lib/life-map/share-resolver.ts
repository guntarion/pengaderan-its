/**
 * src/lib/life-map/share-resolver.ts
 * NAWASENA M07 — Life Map share access gate.
 *
 * Exported: assertCanReadGoal(goal, currentUser)
 * Throws ForbiddenError if the currentUser is not allowed to read the goal.
 */

import { ForbiddenError } from '@/lib/api';
import { prisma } from '@/utils/prisma';

interface GoalAccessInfo {
  id: string;
  userId: string;
  cohortId: string;
  sharedWithKasuh: boolean;
}

interface CurrentUser {
  id: string;
  role: string;
}

const BYPASS_ROLES = ['SUPERADMIN', 'PEMBINA', 'BLM', 'SATGAS', 'SC'];

export async function assertCanReadGoal(
  goal: GoalAccessInfo,
  currentUser: CurrentUser,
): Promise<void> {
  // Owner always has access
  if (goal.userId === currentUser.id) return;

  // Admin bypass
  if (BYPASS_ROLES.includes(currentUser.role)) return;

  // Entry must be shared
  if (!goal.sharedWithKasuh) {
    throw ForbiddenError('Goal ini bersifat privat');
  }

  // Kasuh must have active pair
  const pair = await prisma.kasuhPair.findFirst({
    where: {
      mabaUserId: goal.userId,
      kasuhUserId: currentUser.id,
      cohortId: goal.cohortId,
      status: 'ACTIVE',
    },
  });

  if (!pair) {
    throw ForbiddenError('Akses ditolak: bukan Kakak Kasuh aktif');
  }
}
