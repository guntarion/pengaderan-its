/**
 * prisma/seed/master-data/lock.ts
 * PostgreSQL advisory lock to prevent concurrent seed runs.
 * Uses pg_advisory_lock with a stable hash of the lock key string.
 */

import { createLogger } from '../../../src/lib/logger';

const log = createLogger('seed:lock');

// Stable integer lock key for master data seed (derived from string hash)
// Using two 32-bit integers for pg_advisory_lock(bigint) — use the combined 64-bit form
const LOCK_KEY = BigInt('5672834701234567'); // arbitrary stable key for M02 seed

export interface AdvisoryLock {
  release: () => Promise<void>;
}

/**
 * Acquire PostgreSQL advisory lock.
 * Throws if lock cannot be acquired (already held by another process).
 * Returns an object with a release() method.
 */
export async function acquireAdvisoryLock(
  prisma: import('@prisma/client').PrismaClient,
): Promise<AdvisoryLock> {
  log.info('Acquiring advisory lock', { lockKey: LOCK_KEY.toString() });

  // pg_try_advisory_lock returns immediately: true if acquired, false if already held
  const result = await prisma.$queryRaw<[{ acquired: boolean }]>`
    SELECT pg_try_advisory_lock(${LOCK_KEY}::bigint) AS acquired
  `;

  const acquired = result[0]?.acquired;

  if (!acquired) {
    throw new Error(
      `Seed advisory lock is already held by another process. ` +
        `Run 'SELECT pg_advisory_unlock(${LOCK_KEY}::bigint)' to force release.`,
    );
  }

  log.info('Advisory lock acquired');

  return {
    release: async () => {
      await prisma.$queryRaw`SELECT pg_advisory_unlock(${LOCK_KEY}::bigint)`;
      log.info('Advisory lock released');
    },
  };
}
