/**
 * src/lib/m09-cascade/flags.ts
 * NAWASENA M09 — Feature flags for red flag cascade.
 *
 * M09_M10_CASCADE_ENABLED: controls whether INJURY/SHUTDOWN flags
 * trigger an M10 SafeguardIncident draft creation.
 *
 * Default: false (M10 not yet built).
 * Flip to true in production when M10 API is stable.
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('m09:cascade-flags');

/**
 * Returns true if the M09→M10 cascade is enabled.
 * Reads M09_M10_CASCADE_ENABLED env var.
 */
export function isCascadeEnabled(): boolean {
  const enabled = process.env.M09_M10_CASCADE_ENABLED === 'true';
  log.debug('Cascade flag checked', { enabled });
  return enabled;
}
