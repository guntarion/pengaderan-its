# Jurnal Mingguan — M04

## Purpose

`/dashboard/journal` is the weekly reflective journal section for MABA.
It lists all submitted and draft journals, allows writing a new entry,
and provides a read-only view per week.

## Routes

| File | Path | Role |
|---|---|---|
| `journal/page.tsx` | `/dashboard/journal` | List all journals |
| `journal/new/page.tsx` | `/dashboard/journal/new` | Write current-week journal |
| `journal/[weekNumber]/page.tsx` | `/dashboard/journal/<N>` | View or edit week N |

All are client components.

## Data Model (JournalRow / JournalData)

Each journal has three reflective fields (What Happened / So What / Now What),
a `wordCount`, a `status` (SUBMITTED, LATE, MISSED), and an `isLate` flag.

## Status Badges

| Status | Color | Meaning |
|---|---|---|
| SUBMITTED | Emerald | Submitted on time (before Sunday 21:00 WIB) |
| LATE | Amber | Submitted after the weekly deadline |
| MISSED | Red | Week passed without submission |

The deadline is enforced in `src/lib/journal/service.ts`:
`isLate` is set to `true` if `submittedAt > Sunday 21:00 local`.

## Minimum Word Count

`submitJournal` in `src/lib/journal/service.ts` rejects submissions with
fewer than **300 words** (`countTotalWords` across all three fields combined).
The editor displays a live word count.

## Edit Window / Draft Behavior

- A draft is auto-saved while the MABA types; drafts persist across sessions.
- Once submitted, the journal cannot be re-submitted (the new-entry page
  redirects to the read view when `data.type === 'submitted'`).
- The `[weekNumber]` route renders `JournalEditor` (pre-filled from draft)
  or `JournalReadView` (if already submitted).
- `PromptHint` (`src/components/journal/PromptHint`) surfaces a contextual
  writing prompt above the editor for the current week.

## Week Number Calculation

`src/lib/journal/week-number.ts` — `getWeekNumber(cohortStartDate, now)`
returns the elapsed week number relative to cohort start.
`cohortStartDate` is read from `session.user.cohortStartDate` (JWT claim).

## Key Dependencies

- `src/components/journal/JournalEditor` — textarea-based editor with live word count
- `src/components/journal/JournalReadView` — read-only rendered view
- `src/components/journal/PromptHint` — weekly writing prompt banner
- `src/lib/journal/service.ts` — draft upsert, submit, list
- `src/lib/journal/week-number.ts` — cohort-relative week calculation
- `src/lib/journal/word-count.ts` — `countTotalWords()`
- `src/components/shared/DataTable` — sortable table on list page
- `src/components/shared/skeletons` — `SkeletonTable`, `SkeletonCard`
- `src/components/shared/DynamicBreadcrumb`, `ErrorBoundary`
- API: `GET /api/journal`, `GET /api/journal/<week>`, `POST /api/journal`

## Related

- `FEATURES.md` — user-facing feature catalog
- `src/lib/journal/README.md` — service and week-number architecture
