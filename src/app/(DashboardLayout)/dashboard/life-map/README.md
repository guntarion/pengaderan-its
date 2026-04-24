# Life Map Module — Architecture Reference

**Module**: M07 — Time Capsule & Personal Life Map (Life Map portion)
**Routes**: `/dashboard/life-map/*`
**Roles**: MABA (primary), KASUH (read-only via share), SUPERADMIN/PEMBINA/BLM/SATGAS/SC (bypass)

---

## Module Overview

Life Map lets each Maba set structured SMART goals across 6 life areas (Kepribadian, Studi/Karir, Finansial, Kesehatan, Sosial, Keluarga) and track progress through three F2 milestone checkpoints (M1, M2, M3). Goals can optionally be shared with the paired Kakak Kasuh.

---

## Directory Structure

```
src/app/(DashboardLayout)/dashboard/life-map/
├── page.tsx                    — Overview (6-area tiles + filtered goal list)
├── new/
│   └── page.tsx               — Create new SMART goal (reads ?area= query)
└── [goalId]/
    ├── page.tsx               — Goal detail with SMART fields + milestone progress
    └── update/
        └── page.tsx           — M1/M2/M3 tab form + milestone diff view

src/app/api/life-map/
├── route.ts                   — GET (overview / paginated list), POST (create)
└── [goalId]/
    ├── route.ts               — GET, PATCH, DELETE (admin only)
    ├── share/
    │   └── route.ts           — PATCH toggle sharedWithKasuh
    └── update/
        ├── route.ts           — POST (submit new milestone), GET (list updates)
        └── [milestone]/
            └── route.ts       — GET (fetch one), PATCH (edit within 7-day window)

src/lib/life-map/
├── service.ts                 — createGoal, updateGoal, listForUser, getGoalById, getOverviewForUser
├── milestone-service.ts       — submitUpdate, editUpdate, getUpdatesForGoal
├── milestone-timing.ts        — getMilestoneWindows, isWindowOpen, isLateSubmission
├── diff-compute.ts            — computeMilestoneDiff for M1/M2/M3 side-by-side view
└── share-resolver.ts          — assertCanReadGoal (share gate)

src/components/life-map/
├── LifeMapOverviewCard.tsx    — Per-area colored summary tile
├── LifeMapGoalCard.tsx        — Goal list item card
├── LifeMapGoalForm.tsx        — SMART goal create/edit form (FormWrapper + custom Select)
├── MilestoneStatusBadge.tsx   — MilestoneStatusBadge + MilestoneRow (M1/M2/M3)
├── MilestoneUpdateForm.tsx    — Progress update form (textarea + slider + reflection)
└── MilestoneDiffView.tsx      — 3-column M1/M2/M3 side-by-side comparison
```

---

## Data Flow

### Create Goal
```
page (new/) → POST /api/life-map → service.createGoal()
  → prisma.lifeMap.create
  → invalidatePortfolio(userId, cohortId)
  → audit log LIFE_MAP_GOAL_CREATE
```

### Overview Fetch
```
page (life-map/) → GET /api/life-map?overview=true → service.getOverviewForUser()
  → prisma.lifeMap.findMany (all areas) → aggregate by area
  → returns AreaOverview[] (activeCount, achievedCount, milestonesDone, latestGoal)
```

### Goal Detail + Share Gate
```
page ([goalId]/) → GET /api/life-map/:goalId → service.getGoalById()
  → if owner → return
  → if bypassRole → return
  → if sharedWithKasuh + active KasuhPair → return
  → else ForbiddenError
```

### Milestone Submit
```
update/page → POST /api/life-map/:goalId/update → milestone-service.submitUpdate()
  → milestone-timing.isLateSubmission() for isLate flag
  → prisma.lifeMapUpdate.create (unique: lifeMapId + milestone)
  → P2002 → 409 MILESTONE_UPDATE_DUPLICATE
  → if newStatus → prisma.lifeMap.update (status + achievedAt/adjustedAt)
  → invalidatePortfolio
```

### Milestone Edit
```
update/page → PATCH /api/life-map/:goalId/update/:milestone → milestone-service.editUpdate()
  → check editableUntil (recordedAt + 7 days)
  → expired → 400 EDIT_WINDOW_EXPIRED
  → prisma.lifeMapUpdate.update
  → invalidatePortfolio
```

### Share Toggle
```
goal detail → PATCH /api/life-map/:goalId/share
  → flip sharedWithKasuh
  → audit log LIFE_MAP_SHARE_TOGGLE
  → sendNotification(LIFE_MAP_UPDATE_SHARED) to active Kasuh when toggling ON
  → invalidatePortfolio
```

---

## Key Business Rules

| Rule | Implementation |
|---|---|
| Max 5 ACTIVE goals per area per cohort | `service.createGoal()` counts + throws `GOAL_LIMIT_EXCEEDED` |
| Milestone uniqueness | `@@unique([lifeMapId, milestone])` + P2002 → 409 |
| Edit window | `editableUntil = recordedAt + 7 days`, checked in `editUpdate()` |
| Late submission | `isLateSubmission()` compares submittedAt vs window closeAt |
| Share gate | `sharedWithKasuh + active KasuhPair` required for Kasuh access |
| Status transitions | ACHIEVED sets `achievedAt`, ADJUSTED sets `adjustedAt` |
| Portfolio invalidation | After every mutation via `invalidatePortfolio(userId, cohortId)` |

---

## Milestone Timing

Milestone windows are derived from `Cohort.f2StartDate` and `Cohort.f2EndDate`:

| Milestone | Opens | Closes |
|---|---|---|
| M1 | f2StartDate | f2StartDate + 14d |
| M2 | f2StartDate + 42d | f2StartDate + 56d |
| M3 | f2EndDate - 14d | f2EndDate |

Overdue reminder triggers at closeAt + 7d via the M07 milestone reminder cron at `0 1 * * *` (08:00 WIB).

---

## API Contracts

### GET /api/life-map
- `?overview=true` → `AreaOverview[]`
- `?area=STUDI_KARIR&status=ACTIVE&page=1&limit=20` → paginated `GoalSummary[]`

### POST /api/life-map
Body: `{ area, goalText, metric, whyMatters, deadline (ISO string ≥ now+30d), achievabilityNote?, sharedWithKasuh? }`

### PATCH /api/life-map/:goalId
Body: any subset of `{ status, goalText, metric, whyMatters, deadline, achievabilityNote, sharedWithKasuh }`

### POST /api/life-map/:goalId/update
Body: `{ milestone: 'M1'|'M2'|'M3', progressText (50-1000), progressPercent (0-100), reflectionText (50-1000), newStatus? }`

### PATCH /api/life-map/:goalId/update/:milestone
Body: same fields, all optional.

---

## Components

### LifeMapOverviewCard
Receives `overview: AreaOverview`. Each area has a distinct color scheme (violet, sky, emerald, rose, amber, orange). Clicking navigates to `?area=AREA_VALUE`.

### MilestoneUpdateForm
Uses `FormWrapper` with a `control` prop child render. The progress percent slider is managed as external state (not part of the Zod schema) and merged on submit. The status change select is also external state.

### MilestoneDiffView
Calls `computeMilestoneDiff(updates)` which returns 3 columns (M1/M2/M3), each with `data | null` and `percentDelta`. Shows `PercentDeltaBadge` with TrendingUp/Down icons.

---

## Error Codes

| Code | HTTP | When |
|---|---|---|
| `GOAL_LIMIT_EXCEEDED` | 400 | >5 ACTIVE goals in same area |
| `MILESTONE_UPDATE_DUPLICATE` | 409 | Prisma P2002 on unique milestone per goal |
| `EDIT_WINDOW_EXPIRED` | 400 | editableUntil < now |
| `GOAL_NOT_FOUND` | 404 | Goal ID not found |

---

## Cron Jobs

- `GET /api/cron/m07-milestone-reminder` — Daily 08:00 WIB. Sends `LIFE_MAP_MILESTONE_X_DUE` to pending Maba; sends `LIFE_MAP_MILESTONE_OVERDUE_REMINDER` at H+7.

---

## Guides Followed

- `api-patterns-guide.md` — `createApiHandler`, `ApiResponse`, `validateBody/Params`
- `ui-components-guide.md` — `FormWrapper`, `DataTable` (not used — custom list), `useConfirm`, `toast`
- `structured-logging-guide.md` — `createLogger('life-map:service')`, `ctx.info/error` in handlers
- `theme-guide.md` — sky/blue gradient header, `rounded-2xl` cards, dark mode variants
- `caching-webhook-guide.md` — `invalidateCache` via `invalidatePortfolio()`
- `security-compliance-guide.md` — `auditLog.record()` for all mutations
