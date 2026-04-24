/**
 * src/lib/dashboard/drilldown.ts
 * Drill-down routing helpers for M13 Dashboard Multi-Role.
 *
 * DASHBOARD_ROLE_MAP — single source of truth mapping dashboard path → required UserRole.
 * getDrilldownUrl — resolve a URL from an AlertItem (delegates to alert.targetUrl).
 *
 * Architecture note (§3.10): M13 only provides the URL; authorization is enforced
 * by the target module. If the target returns 403, the dashboard surfaces a toast.
 */

import type { UserRole } from '@prisma/client';
import type { AlertItem } from '@/types/dashboard';

// ---------------------------------------------------------------------------
// Role map — used by middleware to whitelist-check dashboard paths
// ---------------------------------------------------------------------------

/**
 * Maps each dashboard slug to the UserRole that may access it.
 * Middleware pattern: resolve role from path → compare to session.user.role.
 * Any path not in this map → 403 (whitelist approach).
 */
export const DASHBOARD_ROLE_MAP: Record<string, UserRole> = {
  maba: 'MABA' as UserRole,
  oc: 'OC' as UserRole,
  kasuh: 'KASUH' as UserRole,
  kp: 'KP' as UserRole,
  blm: 'BLM' as UserRole,
  pembina: 'PEMBINA' as UserRole,
  satgas: 'SATGAS' as UserRole,
  sc: 'SC' as UserRole,
};

/**
 * Given a dashboard slug (e.g. "maba"), return the allowed UserRole.
 * Returns undefined if the slug is not in the map.
 */
export function getRoleForDashboard(slug: string): UserRole | undefined {
  return DASHBOARD_ROLE_MAP[slug];
}

/**
 * Given a UserRole, return the dashboard slug.
 * Returns undefined if no dashboard exists for the role.
 */
export function getDashboardSlugForRole(role: string): string | undefined {
  const entry = Object.entries(DASHBOARD_ROLE_MAP).find(([, v]) => v === role);
  return entry ? entry[0] : undefined;
}

// ---------------------------------------------------------------------------
// Drill-down URL resolver
// ---------------------------------------------------------------------------

/**
 * Resolve the navigation URL for a given AlertItem.
 *
 * Current implementation: the `targetUrl` field is computed at rule-run time
 * (e.g. "/admin/pulse/mahasiswa/[userId]") and stored on the alert.
 * We expose this via a typed helper so components only import from one place.
 *
 * Future: if URL patterns diverge by alert type, add a switch here.
 */
export function getDrilldownUrl(alert: Pick<AlertItem, 'id' | 'type' | 'targetUrl'>): string {
  // Fallback to a generic alerts detail page if targetUrl is missing
  if (!alert.targetUrl) {
    return `/admin/alerts/${alert.id}`;
  }
  return alert.targetUrl;
}

// ---------------------------------------------------------------------------
// Role-based default dashboard URL
// ---------------------------------------------------------------------------

/**
 * Return the canonical dashboard URL for a given role.
 * Used by the entry page (/dashboard) to redirect users on first load.
 */
export function getDefaultDashboardUrl(role: string): string {
  const slug = getDashboardSlugForRole(role);
  if (slug) return `/dashboard/${slug}`;
  // Fallback: top-level dashboard (will show a role-appropriate view or 403 prompt)
  return '/dashboard';
}
