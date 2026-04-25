# KASUH Dashboard — Operational Tools (M03 + M07 + M09 + M13)

## Purpose

The KASUH (Kakak Asuh) section provides each KASUH with tools to monitor and record
interactions with their 1–2 assigned MABA (adik asuh). It covers pairing management,
logbook submission, shared time-capsule/life-map reading, and a pulse trend overview.

Access requires `UserRole.KASUH`. The landing page (`page.tsx`) is scoped to M09 + M13,
showing a 7-day pulse trend mini-graph for each adik asuh and the next logbook cycle
deadline before routing to sub-sections.

---

## Route Map

| Route | Module | Purpose |
|---|---|---|
| `/dashboard/kasuh` | M09 + M13 | Landing: adik asuh list with pulse trend + cycle status |
| `/dashboard/kasuh/adik-asuh` | M03 | Canonical adik asuh list with WhatsApp link + unreachable report |
| `/dashboard/kasuh/adik-asuh/[mabaId]` | M03 | Full non-MH profile detail + unreachable action |
| `/dashboard/kasuh/adik-asuh/[mabaId]/time-capsule` | M07 | Read-only shared time capsule + life-map goals |
| `/dashboard/kasuh/adik/[mabaId]/logbook` | M09 | Logbook form for current cycle + past cycle history |

Note: `/kasuh/adik/[mabaId]` (alternate path) mirrors `/kasuh/adik-asuh` list; both
paths exist for backward-compatible navigation.

---

## Key Components

- `components/m09/KasuhLogForm` — cycle logbook form (attendance MET/NOT_MET,
  reflection, follow-up notes, urgent flag)
- `components/m09/CycleStatusBadge` — badge showing SUBMITTED / DUE / OVERDUE / UPCOMING
- `components/kasuh/SharedNoticeBanner` — banner explaining read-only share gate policy
- `components/kasuh/SharedEntriesFeed` — paginated list of shared time-capsule entries
- `components/kasuh/SharedGoalsFeed` — life-map goals with milestone progress bars
- `components/shared/DynamicBreadcrumb` — breadcrumb on every page
- `components/shared/skeletons` — SkeletonCard, SkeletonCardGrid, SkeletonPageHeader, SkeletonForm
- `hooks/useConfirm` — confirmation dialog used before reporting unreachable

---

## Behavioral Notes

### RLS Bypass for KASUH-Adik with Mandatory Audit (M09 + M07)
The Pulse data for adik asuh is behind a row-level policy that normally prevents any
user from reading another user's pulse entries. KASUH access is granted through an
explicit service-layer bypass in the pairing service, conditioned on a verified active
pair record. Every bypass invocation records an `AUDIT_ACTIONS.READ` event with action
tag `KASUH_PULSE_READ` via `auditLog.fromContext()` so the access is fully traceable.

### Dual-Layer Share Gate for Time Capsule (M07)
Time-capsule entries only appear in the KASUH read view when:
1. The MABA has explicitly toggled `sharedWithKasuh = true` on the entry, AND
2. The requesting user has an active pair record (`KasuhPair.status = ACTIVE`) with
   that MABA at query time.

Both conditions are checked in `GET /api/kasuh/adik-asuh/[mabaId]/time-capsule` before
any entries are returned. A failed gate returns an empty `entries: []` array with a
`shareGateBlocked: true` flag so the UI (`SharedNoticeBanner`) can explain the state.
Life-map goals follow the same dual check via `lifeMapSharedWithKasuh` field.

### Logbook Cycle Logic (M09)
`/api/kasuh/logbook/[pairId]/form-state` returns `{ existingLog, cycleNumber,
cycleDueDate, pairId, mabaName }`. Cycle status is computed client-side:
- `SUBMITTED` if `existingLog` is present for the current cycle
- `OVERDUE` if `now > cycleDueDate + 3 days grace`
- `DUE` if `now > cycleDueDate - 3 days`
- `UPCOMING` otherwise

### Unreachable Report (M03)
Both the list and detail pages surface a "Tidak Dapat Dihubungi" action that posts
`type: KASUH_UNREACHABLE` to `/api/pairing/request`. The action requires a `useConfirm`
dialog before submission and is gated behind `UserRole.KASUH` server-side.

---

## API Dependencies

| Endpoint | Purpose |
|---|---|
| `GET /api/kasuh/dashboard` | Landing: adik list with pulse trend + cycle status |
| `GET /api/pairing/my-adik-asuh` | List of active KASUH pairs with MABA profiles |
| `POST /api/pairing/request` | Report unreachable (KASUH_UNREACHABLE type) |
| `GET /api/kasuh/adik-asuh/[mabaId]/time-capsule` | Shared TC entries + life-map goals |
| `GET /api/kasuh/logbook/[pairId]/form-state` | Current cycle form state |
| `POST /api/kasuh/logbook` | Submit / update cycle log |
| `GET /api/kasuh/logbook/[pairId]/history` | Past cycle logs |

---

## Library Dependencies

- `src/lib/logger.ts` — `createLogger('kasuh-*')` used on every page
- `src/lib/toast.ts` — `toast.success`, `toast.error`, `toast.apiError`
- `src/lib/contact/whatsapp.ts` — `buildWhatsAppUrl()` for direct MABA contact
- `src/i18n/struktur-copy.ts` — copy strings for unreachable confirm dialog
- See also: `src/lib/m09-logbook/README.md`, `src/lib/pairing/README.md`,
  `src/lib/pulse/README.md`, `src/lib/time-capsule/README.md`

---

## Related Documentation

- Features catalog: `src/app/(DashboardLayout)/dashboard/kasuh/FEATURES.md`
- Logbook library: `src/lib/m09-logbook/README.md`
- Pairing library: `src/lib/pairing/README.md`
- Pulse library: `src/lib/pulse/README.md`
- Time capsule library: `src/lib/time-capsule/README.md`
