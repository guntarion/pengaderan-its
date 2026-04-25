# /dashboard/relasi — Relasi Saya (M03)

## Purpose

Read-only dashboard page for MABA to view the three pairing relationships
assigned to them: KP Group (Kelompok Pendamping), Buddy pair, and Kasuh
(Kakak Asuh). All data is fetched from the current user's session and rendered
client-side with skeleton loading states.

## Route

`/dashboard/relasi` — single page, no subroutes.

## Key Components

| Component | Source | Role |
|---|---|---|
| `UserCard` | local inline | Renders a member avatar, NRP, province, interests tags, optional WhatsApp link |
| `DynamicBreadcrumb` | `@/components/shared/DynamicBreadcrumb` | Page breadcrumb |
| `SkeletonCard` | `@/components/shared/skeletons` | Loading state (3 cards) |
| `Badge` | `@/components/ui/badge` | KP group code badge |

## Data Flow

```
page.tsx (client)
  └─ GET /api/pairing/my-relations
       └─ Returns: { kpGroup, buddyPair, kasuhPair } — sanitized (no raw PII beyond what role permits)
```

## Dependencies

- `@/lib/logger` — `createLogger('relasi-page')` for fetch lifecycle
- `@/lib/toast` — `toast.apiError()` on fetch failure
- `next-auth` session embedded in API call (cookie-based)

## Display Rules

- KP Group card: group name, code, member count, coordinator UserCard, up to 5 member UserCards.
- Buddy card: list of buddy members with WhatsApp links (`showContact=true`).
- Kasuh card: single Kasuh UserCard with cohort info and WhatsApp link.
- Empty states: each card shows a friendly message if no pairing data.
- WhatsApp links use `https://wa.me/` with digits-only phone number.

## Related Files

- Features catalog: `/src/app/(DashboardLayout)/dashboard/relasi/FEATURES.md`
- API: `src/app/api/pairing/my-relations/route.ts`
- Module planning: `docs/modul/03-pairing/`
