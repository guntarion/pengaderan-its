/**
 * src/lib/event-execution/cache/invalidate.ts
 * NAWASENA M08 — Cache invalidation helpers for event execution.
 */

import { invalidateCache } from '@/lib/cache';
import { EXEC_CACHE_KEYS } from './keys';

/** Invalidate all cache entries for a specific instance */
export async function invalidateInstanceCache(instanceId: string): Promise<void> {
  await invalidateCache(EXEC_CACHE_KEYS.instancePattern(instanceId));
}

/** Invalidate attendance-related cache for an instance */
export async function invalidateAttendanceCache(instanceId: string): Promise<void> {
  await Promise.allSettled([
    invalidateCache(EXEC_CACHE_KEYS.attendanceStats(instanceId)),
    invalidateCache(EXEC_CACHE_KEYS.attendanceList(instanceId)),
  ]);
}

/** Invalidate output list cache for an instance */
export async function invalidateOutputCache(instanceId: string): Promise<void> {
  await invalidateCache(EXEC_CACHE_KEYS.outputList(instanceId));
}

/** Invalidate evaluation prefill cache for an instance */
export async function invalidateEvaluationCache(instanceId: string): Promise<void> {
  await invalidateCache(EXEC_CACHE_KEYS.evaluationPrefill(instanceId));
}
