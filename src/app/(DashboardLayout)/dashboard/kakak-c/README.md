# /dashboard/kakak-c — Pergantian Kakak Asuh (M03)

## Purpose

Allows MABA to submit a re-pair request for their assigned Kasuh (Kakak Asuh)
and track the lifecycle status of that request. The module enforces a copy-lock
policy — button and label text must not be changed without UX + BLM review.

## Routes

| Path | File | Purpose |
|---|---|---|
| `/dashboard/kakak-c/request` | `request/page.tsx` | Submit new re-pair request |
| `/dashboard/kakak-c/request/[id]` | `request/[id]/page.tsx` | Status tracker for a submitted request |

## Key Components

| Component | Source | Role |
|---|---|---|
| `FormWrapper` + `FormTextarea` | `@/components/shared/FormWrapper` | Optional note field with Zod validation |
| `DynamicBreadcrumb` | `@/components/shared/DynamicBreadcrumb` | Breadcrumb |
| `SkeletonCard` | `@/components/shared/skeletons` | Loading state |
| `Alert` / `AlertDescription` | `@/components/ui/alert` | Eligibility gate message |
| `Badge` | `@/components/ui/badge` | Request status chips |

## Data Flow

```
request/page.tsx
  └─ GET /api/pairing/my-relations        — checks kasuhPair eligibility
  └─ POST /api/pairing/kasuh-request      — submits request, returns { id }
       └─ redirects to /dashboard/kakak-c/request/[id]

request/[id]/page.tsx
  └─ GET /api/pairing/kasuh-request/[id] — fetches request detail + status
```

## Copy Lock

Labels sourced from `@/i18n/struktur-copy` (`STRUKTUR_COPY`). The `formTitle`,
`formDescription`, and `noActiveKasuh` keys must not be altered without sign-off
from UX and BLM. Comments in source mark the locked nodes.

## Request Status Lifecycle

`PENDING` → `APPROVED` → `FULFILLED`
              `REJECTED`

Each status displayed with an icon (`Clock`, `CheckCircle`, `XCircle`) and
resolver information including resolution note and timestamp.

## Dependencies

- `@/lib/logger` — `createLogger('kakak-c-request-page')` and `('kakak-c-request-detail')`
- `@/lib/toast` — error feedback
- `@/i18n/struktur-copy` — copy-locked string constants

## Related Files

- Features catalog: `/src/app/(DashboardLayout)/dashboard/kakak-c/FEATURES.md`
- Relasi page (shows current Kasuh): `/src/app/(DashboardLayout)/dashboard/relasi/`
- Module planning: `docs/modul/03-pairing/`
