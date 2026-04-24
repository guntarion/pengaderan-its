/**
 * Audience: Active OC (Organizing Committee) users in active cohort.
 * Used by the daily-scan cron rule for H-7 before event setup deadlines.
 *
 * The daily-scan resolver queries upcoming events 7 days ahead and
 * sends reminders to OC members responsible for setup.
 */

import { registerResolver, type AudienceUser } from './resolver';
import { getUsersInActiveCohort } from './_shared/by-cohort';

async function resolve(organizationId: string): Promise<AudienceUser[]> {
  return getUsersInActiveCohort(organizationId, 'OC');
}

registerResolver('oc-setup-h7', resolve);
export { resolve as resolveOcSetupH7 };
