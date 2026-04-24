/**
 * Audience: Active SC (Steering Committee) users in active cohort.
 * Used by the daily-scan cron rule for H-7 before Triwulan signoff deadlines.
 *
 * The daily-scan resolver queries upcoming Triwulan events 7 days ahead and
 * sends reminders to SC members who need to sign off.
 */

import { registerResolver, type AudienceUser } from './resolver';
import { getUsersInActiveCohort } from './_shared/by-cohort';

async function resolve(organizationId: string): Promise<AudienceUser[]> {
  return getUsersInActiveCohort(organizationId, 'SC');
}

registerResolver('sc-triwulan-h7', resolve);
export { resolve as resolveScTriwulanH7 };
