# KP Dashboard — Operational Tools (M03 + M04 + M09 + M10 + M13)

## Purpose

The KP (Kakak Pembimbing) section gives KP coordinators a single operational hub for
monitoring their assigned MABA group, reviewing journals, tracking daily/weekly logs,
and reading peer-produced debriefs within the same cohort.

Access requires `UserRole.KP`. The landing page (`page.tsx`) is scoped to M10 + M13,
surfacing a SafeWord quick-widget, passport review queue count, active red-flag count,
and a debrief reminder before routing to sub-sections.

---

## Route Map

| Route | Module | Purpose |
|---|---|---|
| `/dashboard/kp` | M10 + M13 | Landing: quick-links, SafeWord widget, M13 counters |
| `/dashboard/kp/mood` | M04 | Cohort mood aggregate + distribution + red-flag panel |
| `/dashboard/kp/journal-review` | M04 | Queue of unscored journals from group members |
| `/dashboard/kp/journal-review/[journalId]` | M04 | Two-panel scoring view (content + rubric) |
| `/dashboard/kp/log/daily` | M09 | KP daily stand-up log form + 7-day history |
| `/dashboard/kp/log/weekly` | M09 | KP weekly debrief form + weekly-context card |
| `/dashboard/kp/group` | M03 | KP group member roster |
| `/dashboard/kp/group/[memberId]` | M03 | Sanitized member profile (no KIP/emergency contact) |
| `/dashboard/kp/peer-debriefs` | M09 | Feed of peers in same cohort who submitted this week |
| `/dashboard/kp/peer-debriefs/[kpUserId]` | M09 | Read-only peer debrief detail |

---

## Key Components

- `components/kp-mood/MoodAggregateCard` — avg mood + total submitted/total members
- `components/kp-mood/MoodDistributionChart` — bar chart of mood 1–5
- `components/kp-mood/NotCheckedInList` — members who have not checked in today
- `components/kp-mood/RedFlagPanel` — triggered red-flag events with status
- `components/kp-mood/FollowUpModal` — modal to record follow-up on a red-flag event
- `components/rubric/RubricScoringPanel` — rubric-based scoring widget used in journal detail
- `components/m09/KPDailyForm` — form for daily stand-up (mood avg, red flags, anecdote)
- `components/m09/KPWeeklyForm` — form for weekly debrief (whatWorked, whatDidnt, changesNeeded)
- `components/m09/WeeklyContextCard` — pre-computed weekly context surfaced from daily logs
- `components/shared/DataTable` — used in journal-review queue
- `components/shared/DynamicBreadcrumb` — breadcrumb navigation on every page
- `components/shared/skeletons` — SkeletonCard, SkeletonTable, SkeletonForm, SkeletonCardGrid
- `kp/components/SafeWordQuickWidget` — inline safe-word activation widget (M10)

---

## Behavioral Notes

### 48-Hour Edit Window (M09 Daily Log)
`/api/kp/log/daily` returns `isEditable: boolean` based on whether the entry's
`recordedAt` is within 48 hours. The form is rendered in read-only mode once the
window expires.

### Weekly Pre-Compute Cron (M09)
`WeeklyContextCard` data (`avgMood`, `redFlagBreakdown`, `anecdoteList`) is pre-computed
by a weekly cron job. The page fetches it via `/api/kp/log/weekly`; if no pre-computed
record exists for the current week the card renders empty gracefully.

### Peer Debrief — Read-Only + Same-Cohort Scope (M09)
`/api/kp/peer-debriefs` and `/api/kp/peer-debriefs/[kpUserId]` enforce same-cohort
checks server-side. Cross-cohort requests receive `403 ForbiddenError`. The detail page
renders no input fields — it is strictly a read-only view.

### M09 -> M10 Cascade Feature Flag
The daily log form checks a feature flag before surfacing the Safe-Word shortcut. If the
flag `M10_SAFEGUARD_ENABLED` is off, the `SafeWordQuickWidget` is hidden on the landing
page and the cascade link from daily log to M10 is suppressed.

### Mood Auto-Refresh (M04)
`/dashboard/kp/mood` polls `/api/kp/mood` and `/api/kp/red-flags` every 60 seconds via
a `useEffect`/`setInterval` loop. `lastFetched` state drives the "N menit lalu" label.

---

## API Dependencies

| Endpoint | Purpose |
|---|---|
| `GET /api/pairing/my-group` | Group roster + member list |
| `GET /api/kp/group-info` | Returns `{ cohortId, kpGroupId }` for mood queries |
| `GET /api/kp/mood` | Mood aggregate + not-checked-in list |
| `GET /api/kp/red-flags` | Active red-flag events |
| `GET /api/journal/unscored` | Unscored journals for KP's group |
| `GET /api/journal/by-id/[id]` | Full journal content |
| `GET /api/kp/log/daily` | Daily form state + 7-day history |
| `POST /api/kp/log/daily` | Submit / update daily log |
| `GET /api/kp/log/weekly` | Weekly form state + context + history |
| `POST /api/kp/log/weekly` | Submit weekly debrief |
| `GET /api/kp/peer-debriefs` | Peers in same cohort with debriefs this week |
| `GET /api/kp/peer-debriefs/[kpUserId]` | Single peer debrief (cohort-scoped) |

---

## Library Dependencies

- `src/lib/logger.ts` — `createLogger('kp-*')` used on every page and component
- `src/lib/toast.ts` — `toast.success`, `toast.error`, `toast.apiError`
- `src/lib/cache.ts` — server-side caching for mood aggregate and group info
- See also: `src/lib/pairing/README.md`, `src/lib/pulse/README.md`

---

## Related Documentation

- Features catalog: `src/app/(DashboardLayout)/dashboard/kp/FEATURES.md`
- Logbook library: `src/lib/m09-logbook/README.md`
- Pairing library: `src/lib/pairing/README.md`
- Pulse library: `src/lib/pulse/README.md`
