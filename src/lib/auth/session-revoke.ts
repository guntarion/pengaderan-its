/**
 * src/lib/auth/session-revoke.ts
 * Session revocation check using sessionEpoch.
 *
 * When a user's role is changed or they are force-logged out,
 * their sessionEpoch is incremented in the DB. The JWT stores
 * the epoch at issuance; if the stored epoch < DB epoch, the
 * session is revoked and user must re-authenticate.
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('session-revoke');

/**
 * Check if a session is revoked based on epoch comparison.
 *
 * @param jwtEpoch    - sessionEpoch stored in JWT at issuance
 * @param userDbEpoch - current sessionEpoch from DB
 * @returns true if session is revoked (user must re-login)
 */
export function isSessionRevoked(jwtEpoch: number, userDbEpoch: number): boolean {
  const revoked = jwtEpoch < userDbEpoch;
  if (revoked) {
    log.warn('Session revoked due to epoch mismatch', { jwtEpoch, userDbEpoch });
  }
  return revoked;
}

/**
 * Increment session epoch to force all existing sessions to invalidate.
 * Used after role change, force logout, suspicious activity.
 *
 * @param userId - User whose sessions to invalidate
 * @param prisma - Prisma client instance
 * @returns new epoch value
 */
export async function incrementSessionEpoch(
  userId: string,
  prisma: import('@prisma/client').PrismaClient,
): Promise<number> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { sessionEpoch: { increment: 1 } },
    select: { sessionEpoch: true },
  });

  log.info('Session epoch incremented', { userId, newEpoch: user.sessionEpoch });
  return user.sessionEpoch;
}
