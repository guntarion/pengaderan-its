/**
 * Audience: Maba who haven't submitted Pulse today.
 * Uses all ACTIVE Maba in org (M09 Pulse module integration will refine).
 */

import { registerResolver, type AudienceUser } from './resolver';
import { getUsersInActiveCohort } from './_shared/by-cohort';

async function resolve(organizationId: string): Promise<AudienceUser[]> {
  // V1: all active Maba in active cohort
  // M09 integration: filter out those who already submitted Pulse today
  return getUsersInActiveCohort(organizationId, 'MABA');
}

registerResolver('maba-pulse-daily', resolve);
export { resolve as resolveMabaPulseDaily };
