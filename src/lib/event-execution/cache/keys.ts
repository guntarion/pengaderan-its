/**
 * src/lib/event-execution/cache/keys.ts
 * NAWASENA M08 — Cache key generators for event execution.
 */

export const EXEC_CACHE_KEYS = {
  instanceListing: (userId: string, cohortId: string) =>
    `event-execution:listing:${userId}:${cohortId}`,
  instanceDetail: (instanceId: string) =>
    `event-execution:instance:${instanceId}:detail`,
  attendanceStats: (instanceId: string) =>
    `event-execution:instance:${instanceId}:attendance:stats`,
  attendanceList: (instanceId: string) =>
    `event-execution:instance:${instanceId}:attendance:list`,
  evaluationPrefill: (instanceId: string) =>
    `event-execution:instance:${instanceId}:evaluation:prefill`,
  outputList: (instanceId: string) =>
    `event-execution:instance:${instanceId}:outputs`,
  kegiatanPicker: (orgId: string) =>
    `event-execution:kegiatan-picker:${orgId}`,

  /** Pattern for invalidating all cache for an instance */
  instancePattern: (instanceId: string) =>
    `event-execution:instance:${instanceId}:*`,
};
