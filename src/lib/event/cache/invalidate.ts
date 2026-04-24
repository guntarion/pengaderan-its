/**
 * src/lib/event/cache/invalidate.ts
 * Cache invalidation helpers for M06 Event module.
 *
 * Exported as part of the M08 public API contract:
 * - invalidatePublicInstancesCache(kegiatanId, orgCode?) — called by M08 after instance create/update
 */

import { invalidateCache } from '@/lib/cache';
import { createLogger } from '@/lib/logger';
import { revalidatePath } from 'next/cache';

const log = createLogger('event:cache');

/**
 * Invalidate public-facing caches for a specific Kegiatan's instances.
 * Called by M08 after create/update instance, and by M06 internally.
 */
export async function invalidatePublicInstancesCache(
  kegiatanId: string,
  orgCode?: string,
): Promise<void> {
  try {
    // Invalidate Redis cache for upcoming instances
    if (orgCode) {
      await invalidateCache(`kegiatan:instances:upcoming:${orgCode}:${kegiatanId}`);
    }
    // Invalidate broad pattern to catch all org codes
    await invalidateCache(`kegiatan:instances:upcoming:*:${kegiatanId}`);
    // Invalidate public catalog pages
    revalidatePath('/kegiatan');
    revalidatePath(`/kegiatan/${kegiatanId}`);
    log.info('Public instances cache invalidated', { kegiatanId, orgCode });
  } catch (err) {
    log.warn('Failed to invalidate public instances cache', { error: err, kegiatanId, orgCode });
  }
}

/**
 * Invalidate all cached data for a specific instance.
 * Called after RSVP mutations, NPS submissions, status changes.
 */
export async function invalidateInstanceCache(instanceId: string): Promise<void> {
  try {
    await invalidateCache(`event:instance:${instanceId}:*`);
    log.debug('Instance cache invalidated', { instanceId });
  } catch (err) {
    log.warn('Failed to invalidate instance cache', { error: err, instanceId });
  }
}

/**
 * Invalidate NPS aggregate cache for an instance.
 * Called after NPS submission.
 */
export async function invalidateNPSAggregateCache(instanceId: string): Promise<void> {
  try {
    await invalidateCache(`event:instance:${instanceId}:nps-aggregate`);
    log.debug('NPS aggregate cache invalidated', { instanceId });
  } catch (err) {
    log.warn('Failed to invalidate NPS aggregate cache', { error: err, instanceId });
  }
}
