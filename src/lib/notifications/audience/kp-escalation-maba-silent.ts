/**
 * Audience: Active KP users in active cohort.
 * Used by the daily-scan cron rule for detecting repeatedly-silent Maba.
 *
 * In V1: resolves all active KP users (M03 integration will refine this to
 * use KPGroup assignments and only notify KPs whose Maba is silent).
 *
 * The actual escalation path is usually triggered directly via escalateToKp()
 * from send.ts when a Maba hits the rate-limit threshold. This resolver is
 * registered for completeness and future rule-based escalation scans.
 */

import { registerResolver, type AudienceUser } from './resolver';
import { getUsersInActiveCohort } from './_shared/by-cohort';

async function resolve(organizationId: string): Promise<AudienceUser[]> {
  // V1: returns all active KP in active cohort
  // M03 integration: filter to only KPs with silent Maba assigned
  return getUsersInActiveCohort(organizationId, 'KP');
}

registerResolver('kp-escalation-maba-silent', resolve);
export { resolve as resolveKpEscalationMabaSilent };
