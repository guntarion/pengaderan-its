/**
 * Audience: Maba who haven't submitted Weekly Journal this week.
 */

import { registerResolver, type AudienceUser } from './resolver';
import { getUsersInActiveCohort } from './_shared/by-cohort';

async function resolve(organizationId: string): Promise<AudienceUser[]> {
  return getUsersInActiveCohort(organizationId, 'MABA');
}

registerResolver('maba-journal-weekly', resolve);
export { resolve as resolveMabaJournalWeekly };
