/**
 * src/lib/struktur/pair-health.ts
 * Stub for computing "unhealthy" pair flags.
 *
 * V1: Returns empty array (stub — full implementation deferred to M07/M09).
 * V2: Will query KasuhLog/KPLogDaily for pairs without activity 14+/7+ days.
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('pair-health');

export interface UnhealthyPair {
  pairId: string;
  pairType: 'kasuh' | 'kp_group';
  reason: string;
  daysSinceLastActivity: number;
}

/**
 * Compute pairs without recent activity.
 *
 * V1 stub: always returns empty array.
 * TODO (M07/M09): implement real query against KasuhLog + KPLogDaily.
 */
export async function computeUnhealthyPairs(cohortId: string): Promise<UnhealthyPair[]> {
  log.debug('computeUnhealthyPairs called (V1 stub — returning empty)', { cohortId });
  return [];
}
