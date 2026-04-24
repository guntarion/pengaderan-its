/**
 * src/lib/rbac.ts
 * Role-Based Access Control configuration for NAWASENA.
 *
 * Defines which roles can access which route prefixes.
 * Used by src/middleware.ts to gate every request.
 */

import { UserRole } from '@prisma/client';

// All 12 NAWASENA roles
export const ALL_ROLES = Object.values(UserRole) as UserRole[];

// Roles that require short JWT expiry (2h instead of 8h)
export const SENSITIVE_ROLES: UserRole[] = [
  UserRole.SC,
  UserRole.PEMBINA,
  UserRole.SATGAS,
  UserRole.SUPERADMIN,
];

/**
 * Route RBAC map.
 * Keys are route prefix patterns.
 * Values are arrays of roles that can access that route.
 * More specific patterns take precedence (matched first by length).
 *
 * Convention:
 *   '/admin/organizations' — SUPERADMIN only
 *   '/admin/*'            — SC, SUPERADMIN
 *   '/pakta/sign/*'       — all authenticated roles (except DOSEN_WALI cannot sign PAKTA_PANITIA/PENGADER)
 */
export const ROUTE_RBAC_MAP: Record<string, UserRole[]> = {
  // ---- SUPERADMIN-only routes ----
  '/admin/organizations': [UserRole.SUPERADMIN],

  // ---- Admin routes (SC + SUPERADMIN) ----
  '/admin/users': [UserRole.SC, UserRole.SUPERADMIN],
  '/admin/cohorts': [UserRole.SC, UserRole.SUPERADMIN],
  '/admin/pakta': [UserRole.SC, UserRole.SUPERADMIN],
  '/admin/whitelist': [UserRole.SC, UserRole.SUPERADMIN],

  // ---- Read-only admin for BLM/PEMBINA ----
  '/admin/audit-log': [
    UserRole.SC,
    UserRole.SUPERADMIN,
    UserRole.PEMBINA,
    UserRole.BLM,
  ],

  // ---- All admin catch-all ----
  '/admin': [UserRole.SC, UserRole.SUPERADMIN, UserRole.PEMBINA, UserRole.BLM],

  // ---- Pakta signing (all authenticated except system roles) ----
  '/pakta/sign': ALL_ROLES.filter((r) => r !== UserRole.DOSEN_WALI),

  // ---- Reference pages (all authenticated) ----
  '/referensi': ALL_ROLES,

  // ---- Master data admin — SUPERADMIN only routes ----
  '/admin/master/seed': [UserRole.SUPERADMIN],
  '/admin/master/taksonomi': [UserRole.SUPERADMIN],

  // ---- Master data admin — SC + SUPERADMIN ----
  '/admin/master': [UserRole.SC, UserRole.SUPERADMIN],

  // ---- Dashboard (all authenticated) ----
  '/dashboard': ALL_ROLES,

  // ---- Profile pages (all authenticated) ----
  '/profile': ALL_ROLES,
};

/**
 * Check if a role can access a given pathname.
 *
 * Matches by longest prefix first for specificity.
 * Returns true if no matching rule found (default allow — middleware handles redirect for unauthed).
 */
export function canAccessRoute(pathname: string, role: string): boolean {
  // Find longest matching prefix
  const matchingPrefixes = Object.keys(ROUTE_RBAC_MAP)
    .filter((prefix) => pathname.startsWith(prefix))
    .sort((a, b) => b.length - a.length); // longest first

  if (matchingPrefixes.length === 0) {
    return true; // No rule = allow (middleware already requires auth for protected paths)
  }

  const longestMatch = matchingPrefixes[0];
  const allowedRoles = ROUTE_RBAC_MAP[longestMatch];

  return allowedRoles.includes(role as UserRole);
}

/**
 * Determine if a user needs to sign a pakta before accessing the dashboard.
 * Returns the pakta type they must sign first, or null if all clear.
 */
export function getPendingPaktaType(
  role: string,
  socialContractStatus: string | null | undefined,
  paktaPanitiaStatus: string | null | undefined,
): string | null {
  // MABA: must sign Social Contract first
  if (role === UserRole.MABA) {
    if (!socialContractStatus || socialContractStatus === 'PENDING' || socialContractStatus === 'PENDING_RESIGN') {
      return 'SOCIAL_CONTRACT_MABA';
    }
  }

  // Panitia roles: must sign Pakta Panitia first
  const panitiaRoles: UserRole[] = [
    UserRole.KP, UserRole.KASUH, UserRole.OC, UserRole.ELDER,
    UserRole.SC, UserRole.BLM, UserRole.SATGAS,
  ];
  if (panitiaRoles.includes(role as UserRole)) {
    if (!paktaPanitiaStatus || paktaPanitiaStatus === 'PENDING' || paktaPanitiaStatus === 'PENDING_RESIGN') {
      return 'PAKTA_PANITIA';
    }
  }

  // No pending pakta
  return null;
}
