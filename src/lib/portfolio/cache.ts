/**
 * src/lib/portfolio/cache.ts
 * NAWASENA M07 — Portfolio cache invalidation hooks.
 *
 * Call invalidatePortfolio() from service layers whenever content changes:
 * - Time Capsule entry create/update/share toggle
 * - Life Map goal create/status update/share toggle
 * - Milestone update submit/edit
 */

import { invalidateCache } from '@/lib/cache';
import { createLogger } from '@/lib/logger';

const log = createLogger('portfolio:cache');

/**
 * Invalidate the cached portfolio for a given user+cohort combination.
 * Fire-and-forget — does not throw on failure.
 */
export async function invalidatePortfolio(userId: string, cohortId: string): Promise<void> {
  try {
    await invalidateCache(`portfolio:${userId}:${cohortId}`);
    log.debug('Portfolio cache invalidated', { userId, cohortId });
  } catch (err) {
    // Non-fatal — cache will expire naturally via TTL
    log.warn('Could not invalidate portfolio cache', { error: err, userId, cohortId });
  }
}
