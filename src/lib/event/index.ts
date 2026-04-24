/**
 * src/lib/event/index.ts
 * NAWASENA M06 — Public API for Event module.
 *
 * This file exports the stable public interface for use by:
 * - M08 (Event Management): triggerNPSForInstance, cancelNPSTrigger, invalidatePublicInstancesCache
 * - M05 (Passport): getAttendanceSummary, wasHadir (for evidence type ATTENDANCE)
 *
 * IMPORTANT: Do NOT import internal service paths directly.
 * Always import from this barrel for inter-module use.
 */

// === M08 integration contract (NPS trigger) ===
export { triggerNPSForInstance, cancelNPSTrigger } from './services/nps-trigger';

// === M08 integration contract (cache invalidation) ===
export { invalidatePublicInstancesCache } from './cache/invalidate';

// === M05 Passport integration contract (attendance evidence) ===
export { getAttendanceSummary, wasHadir } from './services/attendance.service';

// === Retention (M01 monthly cron) ===
export { purgeExpiredInstances } from './retention';

// === Retention alias — M08 contract uses purgeOldEventData signature ===
// The underlying implementation is purgeExpiredInstances (batch-safe, 3-year window).
export { purgeExpiredInstances as purgeOldEventData } from './retention';

// === Broadcast (M08 cancellation) ===
export { broadcastCancellation } from './broadcast';
