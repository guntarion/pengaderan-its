# /dashboard/konsekuensi — Konsekuensi Saya (M10, MABA view)

## Purpose

Self-service view for MABA to see and respond to pedagogical consequences
assigned to them by Safeguard staff. No role guard — any authenticated user
may access their own consequences. Staff management of consequences lives in
`/dashboard/safeguard/consequences/`.

## Routes

| Path | File | Purpose |
|---|---|---|
| `/dashboard/konsekuensi` | `page.tsx` | List of own consequences (active + completed) |
| `/dashboard/konsekuensi/[id]` | `[id]/page.tsx` | Detail + type-specific submission form |

## Key Components

| Component | Source | Role |
|---|---|---|
| `EducationalBanner` | `@/components/safeguard/EducationalBanner` | Permanent Permen 55/2024 notice (non-dismissible) |
| `RefleksiForm` | local inline (`[id]/page.tsx`) | Textarea with 500-word live counter and 5-segment progress bar |
| `GenericTaskForm` | local inline (`[id]/page.tsx`) | Notes/upload field for Presentasi Ulang and Tugas Pengabdian |
| `DynamicBreadcrumb` | `@/components/shared/DynamicBreadcrumb` | Page breadcrumb |
| `SkeletonCard` | `@/components/shared/skeletons` | Loading state |
| `Badge` | `@/components/ui/badge` | Status and type chips |

## Consequence Types and Submission Behaviour

| Type | Submit UI |
|---|---|
| `REFLEKSI_500_KATA` | Textarea, minimum 500 words enforced client-side; submit disabled until met |
| `PRESENTASI_ULANG` | File upload + notes via `GenericTaskForm` |
| `TUGAS_PENGABDIAN` | Notes field via `GenericTaskForm` |
| `POIN_PASSPORT_DIKURANGI` | Read-only; passport deduction applied automatically via cascade |
| `PERINGATAN_TERTULIS` | Read-only acknowledgement |

## 500-Word Counter

`wordCount()` splits on whitespace and filters empty tokens. A five-segment
progress bar fills as the word count crosses multiples of 100, turning
emerald green once the 500-word threshold is reached.

## Retraction Window (Incidents, not Consequences)

The 30-minute retraction window applies to **incident** reports, not
consequences themselves. Consequence cancellation is staff-only via the
safeguard module.

## Status Lifecycle

`ASSIGNED` → `PENDING_REVIEW` → `APPROVED`
                                 `NEEDS_REVISION` → `PENDING_REVIEW`

Overdue detection: client-side check `deadline < now` when status is
not `APPROVED` or `REJECTED`.

## Data Flow

```
konsekuensi/page.tsx
  └─ GET /api/konsekuensi/me?limit=50
       └─ Returns active + completed consequences for current user

konsekuensi/[id]/page.tsx
  └─ GET /api/konsekuensi/me/[id]
  └─ POST /api/safeguard/consequences/[id]/submit   (Refleksi / Generic)
```

## Dependencies

- `@/lib/logger` — `createLogger('konsekuensi-list-page')`, `('konsekuensi-detail-page')`
- `@/lib/toast` — `toast.success()`, `toast.apiError()`
- `@/lib/utils` — `cn()` for conditional class merging

## Related Files

- Staff management view: `/src/app/(DashboardLayout)/dashboard/safeguard/`
- Features catalog: `/src/app/(DashboardLayout)/dashboard/konsekuensi/FEATURES.md`
- Module planning: `docs/modul/10-safeguard/`
