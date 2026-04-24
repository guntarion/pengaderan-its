/**
 * Audience: Active KP (Kakak Pendamping) users in active cohort.
 * Used by the KP Debrief Weekly cron rule.
 */

import { registerResolver, type AudienceUser } from './resolver';
import { getUsersInActiveCohort } from './_shared/by-cohort';

async function resolve(organizationId: string): Promise<AudienceUser[]> {
  return getUsersInActiveCohort(organizationId, 'KP');
}

registerResolver('kp-debrief-weekly', resolve);
export { resolve as resolveKpDebriefWeekly };
