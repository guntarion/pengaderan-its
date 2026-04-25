# Dashboard Entry — M13 Role Router

## Purpose

`/dashboard` is the single entry point for all authenticated users.
It reads the active session role and immediately redirects to the
role-specific dashboard sub-route.  No data is fetched here.

## Route

`src/app/(DashboardLayout)/dashboard/page.tsx`

Client component (`'use client'`).

## Role Detection and Redirect Logic

1. `useAuth()` provides `{ user, isLoading }` from the NextAuth JWT token.
2. While `isLoading` is true the page renders `SkeletonCard` placeholders.
3. On resolution, the role is checked against `NAWASENA_ROLES`:
   `['MABA', 'KP', 'KASUH', 'OC', 'SC', 'BLM', 'PEMBINA', 'SATGAS']`
4. If the role is in that list, `getDefaultDashboardUrl(role)` from
   `src/lib/dashboard/drilldown.ts` resolves the slug and the page calls
   `router.replace('/dashboard/<slug>')`.
5. `SUPERADMIN` / `admin` are redirected to `/dashboard/superadmin`.
6. Any other role that is not mapped falls through to a **fallback UI** that
   renders a "Pilih Panel" link list.

## Redirect Map (DASHBOARD_ROLE_MAP in drilldown.ts)

| Slug       | Role      |
|------------|-----------|
| maba       | MABA      |
| kp         | KP        |
| kasuh      | KASUH     |
| oc         | OC        |
| sc         | SC        |
| blm        | BLM       |
| pembina    | PEMBINA   |
| satgas     | SATGAS    |

SAC, ELDER, DOSEN_WALI, ALUMNI have no slug in the map; they reach the
fallback UI.

## Unauthorized Subroute

`/dashboard/unauthorized` — static page surfaced when middleware blocks a
user from a role-gated dashboard slug (e.g. a MABA visiting `/dashboard/sc`).

## Key Dependencies

- `src/hooks/useAuth.ts` — reads session JWT
- `src/lib/dashboard/drilldown.ts` — `getDefaultDashboardUrl()`, `DASHBOARD_ROLE_MAP`
- `src/components/shared/skeletons` — `SkeletonCard` (loading state)
- `src/lib/logger.ts` — `createLogger('m13/dashboard/entry')`

## Related

- `FEATURES.md` — user-facing feature catalog
- `src/lib/dashboard/README.md` — payload builders and drilldown helpers
