# Kasuh — Shared View Module (M07)

**Module**: M07 — Time Capsule & Personal Life Map (Kasuh read view)
**Routes**: `/dashboard/kasuh/adik-asuh/:mabaId/time-capsule`
**Roles**: KASUH (primary), SUPERADMIN/PEMBINA/BLM/SATGAS/SC (admin bypass)

---

## Module Overview

Provides Kakak Kasuh a read-only window into the Time Capsule entries and Life Map goals that their paired Adik Asuh has explicitly chosen to share. This view enforces the share gate: only entries/goals with `sharedWithKasuh = true` are visible, and only to the specific Kasuh paired in an active KasuhPair.

---

## Directory Structure

```
src/app/(DashboardLayout)/dashboard/kasuh/adik-asuh/[mabaId]/time-capsule/
└── page.tsx                   — Main tabbed view (Time Capsule + Life Map tabs)

src/app/api/kasuh/adik-asuh/[mabaId]/time-capsule/
└── route.ts                   — GET — fetches shared entries + goals with gate check

src/lib/kasuh-share-resolver/
├── resolve-kasuh-for-maba.ts  — resolveKasuhForMaba() — verifies active pair
└── list-shared-for-kasuh.ts   — listSharedTimeCapsuleEntries(), listSharedLifeMapGoals()

src/components/kasuh/
├── SharedNoticeBanner.tsx     — Privacy notice banner at top of page
├── SharedEntriesFeed.tsx      — Read-only TC entry list using TimeCapsulePreview
└── SharedGoalsFeed.tsx        — Read-only LM goal list with MilestoneRow badges
```

---

## Data Flow

```
page ([mabaId]/time-capsule) → GET /api/kasuh/adik-asuh/:mabaId/time-capsule
  → resolveKasuhForMaba(mabaId, currentUser, cohortId)
      → kasuhPair.findFirst({ mabaUserId: mabaId, kasuhUserId: currentUser.id, status: ACTIVE })
      → admin roles get synthetic bypass object with { isAdminBypass: true }
  → ForbiddenError if no valid pair
  → auditLog.record(PORTFOLIO_VIEW_ACCESS)
  → listSharedTimeCapsuleEntries(mabaId, cohortId, { page, limit })
  → if includeLifeMap=true: listSharedLifeMapGoals(mabaId, cohortId)
  → ApiResponse.success({ entries, total, page, limit, mabaName, lifeMapGoals })
```

---

## API Contract

### GET /api/kasuh/adik-asuh/:mabaId/time-capsule
Query params:
- `page` (default 1)
- `limit` (default 20)
- `includeLifeMap=true` — includes shared Life Map goals in response

Response shape:
```typescript
{
  entries: SharedEntry[];     // TC entries where sharedWithKasuh=true
  total: number;
  page: number;
  limit: number;
  mabaName: string;           // User.fullName of the Maba
  lifeMapGoals: SharedGoal[]; // when includeLifeMap=true
}
```

---

## Access Control

| Condition | Result |
|---|---|
| Active KasuhPair (mabaUserId=target, kasuhUserId=current) | Allowed |
| SUPERADMIN / PEMBINA / BLM / SATGAS / SC | Bypass (admin synthetic object) |
| No active pair | ForbiddenError 403 |
| Cross-organization | ForbiddenError 403 (implicit via Prisma org scope) |

All access is audit logged as `PORTFOLIO_VIEW_ACCESS`.

---

## Components

### SharedNoticeBanner
Displays a sky-blue info card explaining:
- This content was shared voluntarily by the Maba
- Kasuh may not share it further or use it outside the mentorship context

### SharedEntriesFeed
Renders the list of shared TC entries. Each entry shows:
- Mood emoji
- Title or "Tanpa Judul"
- Publication date
- Markdown body preview (first ~200 chars, plain text)
- Attachment count badge

Read-only — no edit, delete, or comment controls.

### SharedGoalsFeed
Renders shared Life Map goals with:
- Area label
- Full goal text
- Status badge
- `MilestoneRow` showing M1/M2/M3 submission state

Read-only — no update, share, or edit controls.

---

## Guides Followed

- `api-patterns-guide.md` — `createApiHandler`, `ApiResponse.success`
- `structured-logging-guide.md` — `ctx.info/error` in handler
- `theme-guide.md` — sky/blue gradient header, `rounded-2xl` cards, tab styling
- `security-compliance-guide.md` — `auditLog.record()` for every Kasuh access
