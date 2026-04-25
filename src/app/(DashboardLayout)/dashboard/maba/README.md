# Dashboard MABA — M13

## Purpose

`/dashboard/maba` is the landing page for role MABA (Mahasiswa Baru).
It aggregates personal KPI signals into a single scrollable view, and
enforces the pakta gate before rendering any content.

## Route

`src/app/(DashboardLayout)/dashboard/maba/page.tsx`

Client component. Fetches `GET /api/dashboard/maba` once on mount and
populates widgets from the `MabaDashboardPayload` type
(`src/types/dashboard.ts`).

## Pakta Gate

If `payload.paktaSigned === false` the page calls
`router.replace('/dashboard/maba/pakta-sign')` before rendering any widget.
No content is shown until the digital pakta has been signed.

## Widgets

| Widget | Data field | Component |
|---|---|---|
| Pulse Streak | `pulseStreak` (number of consecutive days) | Inline card with Flame icon |
| Passport Progress Ring | `passportCompletion` (0–100 %) | `ProgressRing` from `@/components/dashboard/widgets/ProgressRing` |
| Mood Hari Ini | `moodToday` | `MoodCard` from `@/components/dashboard/widgets/MoodCard` |
| Agenda Mendatang | `upcomingEvents[]` | `EventListCard` from `@/components/dashboard/widgets/EventListCard` |
| Alat & Bantuan | static menu | Inline link list |

Every widget is wrapped in `WidgetErrorBoundary` to isolate failures.

## Bantuan Menu (Quick Actions)

| Label | Destination |
|---|---|
| Kesehatan Mental | `/dashboard/mental-health` |
| Kakak Konselor | `/dashboard/kakak-c` |
| Pulse Check | `/dashboard/pulse` |
| Jurnal Harian | `/dashboard/journal` |
| Passport | `/dashboard/passport` |

## Key Dependencies

- `src/types/dashboard.ts` — `MabaDashboardPayload` interface
- `src/components/dashboard/widgets/` — MoodCard, EventListCard, ProgressRing, WidgetErrorBoundary
- `src/components/shared/DynamicBreadcrumb` — breadcrumb nav
- `src/components/shared/skeletons` — `SkeletonCard` (loading state)
- `src/lib/toast.ts` — `toast.apiError()` for network errors
- `src/lib/logger.ts` — `createLogger('m13/dashboard/maba')`
- API: `GET /api/dashboard/maba`

## Related

- `FEATURES.md` — user-facing feature catalog
- `src/lib/dashboard/README.md` — payload builder for MABA dashboard
