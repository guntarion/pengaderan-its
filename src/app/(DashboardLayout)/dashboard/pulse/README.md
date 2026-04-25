# Pulse Harian — M04

## Purpose

`/dashboard/pulse` is the daily mood check-in page for MABA.
It shows whether today's pulse has already been submitted and renders
the submission form if not. The sub-route `/dashboard/pulse/trend`
shows a historical mood trend chart.

## Routes

| File | Path |
|---|---|
| `pulse/page.tsx` | `/dashboard/pulse` — check-in form |
| `pulse/trend/page.tsx` | `/dashboard/pulse/trend` — trend chart (7/14/30 days) |

Both are client components.

## Mood Scale

Integer 1–5 with emoji labels:

| Value | Label |
|---|---|
| 1 | Sangat Sedih |
| 2 | Sedih |
| 3 | Biasa |
| 4 | Senang |
| 5 | Sangat Senang |

The emoji for each value is resolved by `MoodEmojiSelector`
(`src/components/pulse/MoodEmojiSelector.tsx`).

## Submission Flow (pulse/page.tsx)

1. Calls `GET /api/pulse` to check whether today's pulse exists.
2. If `data.submitted === true`, displays the submitted emoji and score.
3. If not submitted, renders `PulseSubmitForm` with the cohortId from
   the session JWT (`session.user.currentCohortId`).
4. If `cohortId` is absent (user not enrolled), shows an info message.
5. Network errors are silently absorbed so the form still renders
   (offline-first approach via `offline-queue-client.ts`).

## suggestedMood (KP Usage)

`src/lib/pulse/kp-accessor.ts` — `resolveMabaForKP()` returns a
`suggestedMood` value for each MABA under a KP's supervision.
This is the most recent pulse score and is consumed by the KP daily
logbook (M09) as the default mood input when logging a MABA interaction.

## Trend Sub-route (pulse/trend/page.tsx)

- Calls `GET /api/pulse/trend?days=<7|14|30>` (default 7).
- Renders `PulseTrendChart` (line chart via Recharts).
- Also lists individual pulse records with date, emoji, and optional comment.

## Key Dependencies

- `src/components/pulse/PulseSubmitForm` — check-in form with emoji selector
- `src/components/pulse/PulseTrendChart` — Recharts line chart
- `src/lib/pulse/service.ts` — business logic, offline queue helpers
- `src/lib/pulse/kp-accessor.ts` — `suggestedMood` for KP logbook
- `src/lib/pulse/local-date.ts` — WIB-aware "today" boundary
- `src/components/shared/DynamicBreadcrumb`, `ErrorBoundary`, `SkeletonCard`
- API: `GET /api/pulse`, `GET /api/pulse/trend`

## Related

- `FEATURES.md` — user-facing feature catalog
- `src/lib/pulse/README.md` — service architecture and offline queue design
