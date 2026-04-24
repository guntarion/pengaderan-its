/**
 * src/lib/notifications/audience/resolver.ts
 * NAWASENA M15 — Audience resolver registry and dispatcher.
 *
 * Maps audienceResolverKey to the corresponding resolver function.
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('notifications:audience-resolver');

export interface AudienceUser {
  id: string;
  fullName: string;
  name?: string;
  email?: string;
}

type ResolverFn = (
  organizationId: string,
  params: Record<string, unknown> | null,
) => Promise<AudienceUser[]>;

const resolverRegistry: Record<string, ResolverFn> = {};

/**
 * Register an audience resolver function.
 */
export function registerResolver(key: string, fn: ResolverFn): void {
  resolverRegistry[key] = fn;
}

/**
 * Resolve audience for the given resolver key.
 * Returns an empty array if resolver key is not found.
 */
export async function resolveAudience(
  resolverKey: string,
  organizationId: string,
  params: Record<string, unknown> | null,
): Promise<AudienceUser[]> {
  // Handle daily-scan resolver specially (it dispatches multiple sub-resolvers)
  if (resolverKey === 'daily-scan') {
    const { resolveDailyScan } = await import('./daily-scan');
    return resolveDailyScan(organizationId);
  }

  // Lazy-load resolver modules to prevent circular dependencies
  await loadResolvers();

  const resolver = resolverRegistry[resolverKey];
  if (!resolver) {
    log.warn('Audience resolver not found', { resolverKey, organizationId });
    return [];
  }

  log.debug('Resolving audience', { resolverKey, organizationId });
  const audience = await resolver(organizationId, params);
  log.debug('Audience resolved', { resolverKey, organizationId, count: audience.length });

  return audience;
}

let resolversLoaded = false;

async function loadResolvers(): Promise<void> {
  if (resolversLoaded) return;
  resolversLoaded = true;

  // Import all resolvers — they self-register via registerResolver()
  await Promise.all([
    import('./maba-pulse-daily'),
    import('./maba-journal-weekly'),
    import('./kp-standup-daily'),
    import('./kp-debrief-weekly'),
    import('./kasuh-logbook-biweekly'),
    import('./oc-setup-h7'),
    import('./sc-triwulan-h7'),
    import('./kp-escalation-maba-silent'),
  ]);
}
