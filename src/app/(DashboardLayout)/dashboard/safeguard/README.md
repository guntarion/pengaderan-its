# /dashboard/safeguard — Safeguard & Insiden (M10)

## Purpose

Operational module for managing safety incidents and assigning pedagogical
consequences during cadre activities. Access is restricted to staff roles;
MABA access to consequences is provided through the separate
`/dashboard/konsekuensi` module.

## Routes

| Path | File | Audience |
|---|---|---|
| `/safeguard/incidents` | `incidents/page.tsx` | Incident list with summary counters |
| `/safeguard/incidents/new` | `incidents/new/page.tsx` | F2 full incident report form |
| `/safeguard/incidents/[incidentId]` | `incidents/[incidentId]/page.tsx` | Detail, timeline, action bar |
| `/safeguard/incidents/[incidentId]/print` | `incidents/[incidentId]/print/page.tsx` | Print-friendly incident record |
| `/safeguard/consequences` | `consequences/page.tsx` | Staff consequence list (DataTable) |
| `/safeguard/consequences/new` | `consequences/new/page.tsx` | Assign new consequence |

## Role Guard

`layout.tsx` enforces client-side redirect to `/dashboard` for anyone whose
role is not in `['SC', 'PEMBINA', 'OC', 'KP', 'BLM', 'SATGAS', 'SUPERADMIN']`
and does not carry the `isSafeguardOfficer` flag.

## Key Components

| Component | Source | Role |
|---|---|---|
| `DataTable` | `@/components/shared/DataTable` | Paginated incident and consequence lists |
| `IncidentStatusBadge` | `@/components/safeguard/IncidentStatusBadge` | Severity-coloured status chip |
| `IncidentTimeline` | `@/components/safeguard/IncidentTimeline` | Append-only event log |
| `IncidentActionBar` | `@/components/safeguard/IncidentActionBar` | Role + state-conditional action buttons |
| `IncidentAttachmentList` | `@/components/safeguard/IncidentAttachmentList` | File attachments |
| `SeverityLegend` | `@/components/safeguard/SeverityLegend` | RED / YELLOW / GREEN legend |
| `EducationalBanner` | `@/components/safeguard/EducationalBanner` | Permanent, non-dismissible Permen 55/2024 notice |
| `ConsequenceTypePicker` | `@/components/safeguard/ConsequenceTypePicker` | Five non-physical consequence types only |
| `DynamicBreadcrumb` | `@/components/shared/DynamicBreadcrumb` | Page breadcrumb |

## Triple-Layer Physical-Punishment Prevention

1. `ConsequenceTypePicker` exposes only five Permen 55/2024-compliant types
   (`REFLEKSI_500_KATA`, `PRESENTASI_ULANG`, `POIN_PASSPORT_DIKURANGI`,
   `PERINGATAN_TERTULIS`, `TUGAS_PENGABDIAN`).
2. `EducationalBanner` is rendered permanently and cannot be dismissed.
3. API route `/api/safeguard/consequences` enforces the type allow-list
   server-side; any other value is rejected.

## Append-Only Timeline

The incident timeline is append-only. No entry can be edited or deleted after
being persisted. The `IncidentTimeline` component renders entries in
chronological order.

## Incident Retraction Window

A reporter may retract their own incident within 30 minutes of creation
(`RETRACTION_WINDOW_MS = 30 * 60 * 1000`). After that, only SC may retract
(status `RETRACTED_BY_SC`). This is enforced in
`src/lib/safeguard/state-machine.ts` and the API route
`src/app/api/safeguard/incidents/[id]/retract/route.ts`.

## Polling

The incident detail page polls `GET /api/safeguard/incidents/[id]` every
15 seconds to surface status changes without a full page reload.

## Data Flow

```
incidents/page.tsx
  └─ GET /api/safeguard/incidents?page=N&limit=20

incidents/[incidentId]/page.tsx
  └─ GET /api/safeguard/incidents/[id]      (initial + 15s poll)
  └─ POST /api/safeguard/incidents/[id]/retract
  └─ (IncidentActionBar) various PATCH endpoints per action

consequences/page.tsx
  └─ GET /api/safeguard/consequences

consequences/new/page.tsx
  └─ GET /api/users?role=MABA (to populate target user selector)
  └─ POST /api/safeguard/consequences
```

## Dependencies

- `@/lib/logger` — per-page `createLogger` instances
- `@/lib/toast` — error / success feedback
- `@/lib/safeguard/state-machine` — `RETRACTION_WINDOW_MS`, transition guards
- `@prisma/client` — `ConsequenceStatus`, `ConsequenceType` enums
- `next-auth` — session for role checks in `layout.tsx` and `consequences/new`

## Related Files

- MABA self-view: `/src/app/(DashboardLayout)/dashboard/konsekuensi/`
- Features catalog: `/src/app/(DashboardLayout)/dashboard/safeguard/FEATURES.md`
- State machine: `src/lib/safeguard/state-machine.ts`
- Schemas: `src/lib/safeguard/schemas.ts`
- Module planning: `docs/modul/10-safeguard/`
