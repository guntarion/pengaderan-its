/**
 * src/lib/notifications/audience/daily-scan.ts
 * NAWASENA M15 — Daily scan audience dispatcher.
 *
 * Special resolver for the daily-scan cron endpoint.
 * NOT registered in the standard registry — called directly by resolveAudience().
 *
 * The daily-scan cron checks rules with dynamic-date conditions (H-7 before event).
 * For now, it dispatches to OC (event setup) + SC (triwulan signoff) resolvers.
 * Returns a combined unique list across both resolvers.
 */

import { createLogger } from '@/lib/logger';
import type { AudienceUser } from './resolver';
import { getUsersInActiveCohort } from './_shared/by-cohort';

const log = createLogger('notifications:audience-daily-scan');

/**
 * Resolves the combined audience for the daily scan.
 * In V1: union of OC + SC users with active cohort in the org.
 * Future: filter to OCs with events in 7 days + SCs with Triwulan in 7 days.
 */
export async function resolveDailyScan(organizationId: string): Promise<AudienceUser[]> {
  log.debug('Resolving daily-scan audience', { organizationId });

  // V1 stub: fetch OC + SC in parallel
  // Full integration: query Events where startDate = today+7 → get assigned OC
  //                   query TriwulanPeriod where endDate = today+7 → get SC
  const [ocUsers, scUsers] = await Promise.all([
    getUsersInActiveCohort(organizationId, 'OC'),
    getUsersInActiveCohort(organizationId, 'SC'),
  ]);

  // De-duplicate by user id (a user could be both OC and SC in edge cases)
  const seen = new Set<string>();
  const combined: AudienceUser[] = [];

  for (const user of [...ocUsers, ...scUsers]) {
    if (!seen.has(user.id)) {
      seen.add(user.id);
      combined.push(user);
    }
  }

  log.debug('Daily-scan audience resolved', {
    organizationId,
    ocCount: ocUsers.length,
    scCount: scUsers.length,
    uniqueTotal: combined.length,
  });

  return combined;
}
