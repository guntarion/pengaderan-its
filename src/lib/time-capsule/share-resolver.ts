/**
 * src/lib/time-capsule/share-resolver.ts
 * NAWASENA M07 — App-layer share gate for Time Capsule entries.
 *
 * Double gate defense-in-depth:
 * 1. RLS policy in Postgres (org isolation + Kasuh conditional)
 * 2. This app-layer check provides explicit 403 with clear message
 */

import { prisma } from '@/utils/prisma';
import { ForbiddenError } from '@/lib/api';
import { createLogger } from '@/lib/logger';
import type { TimeCapsuleEntry } from '@prisma/client';

const log = createLogger('time-capsule:share-resolver');

interface CurrentUser {
  id: string;
  role: string;
}

/**
 * Assert that the current user can read a Time Capsule entry.
 * Throws ForbiddenError if not authorized.
 *
 * Access is allowed if:
 * - User is the owner
 * - OR: user is an ACTIVE Kasuh for the entry's Maba (same cohort) AND entry.sharedWithKasuh = true
 * - OR: user is an admin/SC/SUPERADMIN
 */
export async function assertCanReadEntry(
  entry: Pick<TimeCapsuleEntry, 'id' | 'userId' | 'cohortId' | 'sharedWithKasuh'>,
  currentUser: CurrentUser,
): Promise<void> {
  // Owner always allowed
  if (entry.userId === currentUser.id) return;

  // Admin bypass
  const adminRoles = ['SC', 'SUPERADMIN', 'PEMBINA', 'BLM', 'SATGAS'];
  if (adminRoles.includes(currentUser.role)) return;

  // Kasuh conditional access
  if (!entry.sharedWithKasuh) {
    log.warn('Denied: entry not shared with Kasuh', {
      entryId: entry.id,
      requesterId: currentUser.id,
    });
    throw ForbiddenError('Konten ini tidak dibagikan kepada Kakak Kasuh');
  }

  const pair = await prisma.kasuhPair.findFirst({
    where: {
      mabaUserId: entry.userId,
      kasuhUserId: currentUser.id,
      status: 'ACTIVE',
      cohortId: entry.cohortId,
    },
  });

  if (!pair) {
    log.warn('Denied: no active KasuhPair', {
      entryId: entry.id,
      requesterId: currentUser.id,
      entryOwner: entry.userId,
    });
    throw ForbiddenError('Kamu bukan Kakak Asuh aktif dari Maba ini');
  }
}
