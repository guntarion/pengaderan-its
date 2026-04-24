/**
 * src/lib/kasuh-share-resolver/resolve-kasuh-for-maba.ts
 * NAWASENA M07 — Resolve active Kasuh pair for a given Maba.
 *
 * Returns the KasuhPair if the currentUser is an active Kasuh for the given Maba.
 * Returns null if no active pair exists.
 */

import { prisma } from '@/utils/prisma';

interface CurrentUser {
  id: string;
  role: string;
}

const BYPASS_ROLES = ['SUPERADMIN', 'PEMBINA', 'BLM', 'SATGAS', 'SC'];

/**
 * Verifies that currentUser is an active Kasuh for mabaUserId.
 * Returns the KasuhPair or null.
 * Admins (bypass roles) return a synthetic object.
 */
export async function resolveKasuhForMaba(
  mabaUserId: string,
  currentUser: CurrentUser,
  cohortId?: string,
) {
  // Admin bypass — no pair needed
  if (BYPASS_ROLES.includes(currentUser.role)) {
    return {
      mabaUserId,
      kasuhUserId: currentUser.id,
      cohortId: cohortId ?? '',
      status: 'ACTIVE' as const,
      isAdminBypass: true,
    };
  }

  const pair = await prisma.kasuhPair.findFirst({
    where: {
      mabaUserId,
      kasuhUserId: currentUser.id,
      ...(cohortId ? { cohortId } : {}),
      status: 'ACTIVE',
    },
  });

  if (!pair) return null;

  return { ...pair, isAdminBypass: false };
}
