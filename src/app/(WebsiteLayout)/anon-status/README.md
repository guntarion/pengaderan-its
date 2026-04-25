# Anonymous Report Status Tracker — Public Module (M12)

Public status lookup for anonymous reports. Allows reporters to track progress using their tracking code without revealing identity. Part of NAWASENA M12.

## Route Structure

| Route | File | Purpose |
|---|---|---|
| `/anon-status` | `page.tsx` | Code input form (client component) |
| `/anon-status/[code]` | `[code]/page.tsx` | Status detail page (server component) |

## Data Flow

1. User enters tracking code (`NW-XXXXXXXX`) in the `/anon-status` input form.
2. Client validates format with regex `/^NW-[A-Z0-9]{8}$/`; invalid input shows inline error, no navigation.
3. Valid code triggers `router.push('/anon-status/<NORMALIZED_CODE>')`.
4. `[code]/page.tsx` (server component) normalizes the code to uppercase and re-validates the format.
5. Invalid format → `redirect('/anon-status')`.
6. Valid format → server fetches status via `GET /api/anon-reports/status/[code]` with `cache: 'no-store'` to always show latest state.
7. Response maps to the `StatusData` interface — only allowlisted fields are returned (see below).
8. Status rendered by `StatusTrackerCard`; not found → inline error with link to retry.

## Allowlisted Status Fields (`StatusData`)

Only these fields are exposed to the public tracker endpoint — no report narrative, no internal notes, no user associations:

| Field | Type |
|---|---|
| `status` | `AnonStatus` enum |
| `category` | `AnonCategory` enum |
| `severity` | `AnonSeverity` enum |
| `acknowledgedAt` | `Date \| null` |
| `recordedAt` | `Date` |
| `publicNote` | `string \| null` |
| `closedAt` | `Date \| null` |

## Privacy / RLS Design

- `publicNote` is the only free-text field exposed; it is set by admins explicitly for public visibility.
- No reporter identity, no IP, no narrative text is returned by the status API.
- The `[code]` page is `robots: noindex` — not discoverable via search.
- The status API call uses `NEXT_PUBLIC_APP_URL` for the base URL (falls back to `localhost:3000`).

## Key Components

| Component | Source |
|---|---|
| `StatusTrackerCard` | `src/components/anon-report/StatusTrackerCard.tsx` |

## Related API

- `GET /api/anon-reports/status/[code]` — returns `StatusData` with allowlisted fields only.

## Cross-reference

See [FEATURES.md](./FEATURES.md) for the user-facing capability catalog.
For submission, see `/src/app/(WebsiteLayout)/anon-report/` [README](../anon-report/README.md).
