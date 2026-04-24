/**
 * Audience: Active KASUH (Koordinator Angkatan Suhari) users in active cohort.
 * Used by the Kasuh Logbook Biweekly cron rule.
 */

import { registerResolver, type AudienceUser } from './resolver';
import { getUsersInActiveCohort } from './_shared/by-cohort';

async function resolve(organizationId: string): Promise<AudienceUser[]> {
  return getUsersInActiveCohort(organizationId, 'KASUH');
}

registerResolver('kasuh-logbook-biweekly', resolve);
export { resolve as resolveKasuhLogbookBiweekly };
