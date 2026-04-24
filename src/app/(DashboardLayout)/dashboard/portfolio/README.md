# Portfolio Module — Architecture Reference

**Module**: M07 — Time Capsule & Personal Life Map (Portfolio portion)
**Routes**: `/dashboard/portfolio`
**Roles**: MABA (self), KASUH (view adik asuh via `?userId=`), SUPERADMIN/PEMBINA (bypass)

---

## Module Overview

Portfolio is a unified read-only view that aggregates a Maba's M07 data — Time Capsule entries, Life Map goals, and (future) Passport badge completions — into a single shareable record of their NAWASENA journey. Data is cached for 5 minutes and supports print-to-PDF via native browser print.

---

## Directory Structure

```
src/app/(DashboardLayout)/dashboard/portfolio/
└── page.tsx                     — Portfolio page (self or ?userId=other)

src/app/api/portfolio/
└── route.ts                     — GET /api/portfolio

src/lib/portfolio/
├── composer.ts                  — getPortfolio(), buildPortfolio(), PortfolioData interface
└── cache.ts                     — invalidatePortfolio(userId, cohortId)

src/components/portfolio/
├── PortfolioView.tsx            — Root layout: header, sections, print styles
├── PortfolioTimeCapsuleSection.tsx — Recent TC entries list
├── PortfolioLifeMapSection.tsx  — 2-column goal grid by area
└── PortfolioPassportSection.tsx — Badge progress bar (M05 placeholder)
```

---

## Data Flow

### Self Portfolio
```
page.tsx → GET /api/portfolio
  → getPortfolio(user.id, user.currentCohortId)
  → withCache('portfolio:userId:cohortId', 300, buildPortfolio)
  → buildPortfolio: Promise.all([
      timeCapsuleEntry.findMany (20 recent),
      timeCapsuleEntry.aggregate (_count),
      lifeMap.findMany (all + updates),
      Promise.resolve(null)  // passport placeholder
    ])
  → returns PortfolioData
```

### Kasuh Viewing Adik Asuh
```
page.tsx?userId=X → GET /api/portfolio?userId=X
  → resolveKasuhForMaba(X, currentUser) — verify active KasuhPair
  → audit log PORTFOLIO_VIEW_ACCESS
  → getPortfolio(X, cohortId)
  → same cache + build path
```

### Cache Invalidation
Triggered automatically (fire-and-forget) after any mutation in:
- Life Map: goal create, update, share toggle
- Time Capsule: entry create/update, attachment confirm, share toggle

```typescript
// src/lib/portfolio/cache.ts
export async function invalidatePortfolio(userId: string, cohortId: string) {
  const key = `portfolio:${userId}:${cohortId}`;
  await invalidateCache(key);
}
```

---

## API Contract

### GET /api/portfolio
- No params → returns own portfolio (uses `user.currentCohortId`)
- `?userId=<cuid>` → returns another user's portfolio (Kasuh gate)

**Response** (`ApiResponse.success(PortfolioData)`):
```typescript
interface PortfolioData {
  userId: string;
  cohortId: string;
  timeCapsule: {
    totalEntries: number;
    sharedEntries: number;
    recentEntries: Array<{
      id: string;
      title: string | null;
      body: string;
      mood: number | null;
      publishedAt: string;   // ISO string
      sharedWithKasuh: boolean;
    }>;
  };
  lifeMap: {
    totalGoals: number;
    activeGoals: number;
    achievedGoals: number;
    byArea: Array<{
      area: string;
      status: string;
      goalText: string;
      milestonesDone: string[];
    }>;
  };
  passport: {
    completedBadges: number;
    totalBadges: number;
  } | null;  // null until M05 integration
}
```

---

## Components

### PortfolioView
The root layout component. Receives `data: PortfolioData` and `readonly: boolean`. Renders:
- Print-friendly header with user info
- `PortfolioTimeCapsuleSection`
- `PortfolioLifeMapSection`
- `PortfolioPassportSection`
- Export PDF button (disabled with Tooltip — native print recommended)
- `<style jsx global>` for `@media print` rules (hide nav, expand content)

### PortfolioTimeCapsuleSection
Shows up to 20 most recent published Time Capsule entries. Each entry shows: mood emoji, title or "Tanpa Judul", date, share badge, and first ~120 chars of body text.

### PortfolioLifeMapSection
2-column responsive grid of goals grouped by area. Each card shows: area label, goal text, status badge, and `MilestoneRow` showing M1/M2/M3 completion state.

### PortfolioPassportSection
Renders a progress bar for badge completion. Currently shows a placeholder state (0/0) until M05 Passport integration is complete.

---

## Caching Strategy

| Layer | Key Pattern | TTL |
|---|---|---|
| Redis (Upstash) | `portfolio:{userId}:{cohortId}` | 300 seconds (5 min) |

Cache degrades gracefully — if Redis is unavailable, `withCache` executes `buildPortfolio` directly without throwing.

Invalidation is fire-and-forget (`void invalidatePortfolio(...)`) — portfolio staleness is acceptable for up to 5 minutes after a mutation.

---

## Access Control

| Viewer | Condition |
|---|---|
| Maba | Always sees own portfolio |
| Kasuh | Must have active KasuhPair with the target Maba; audit logged |
| SUPERADMIN/PEMBINA/BLM/SATGAS/SC | Bypass via `resolveKasuhForMaba` admin check |
| Cross-org | ForbiddenError — portfolio data includes cohort scope |

---

## Guides Followed

- `api-patterns-guide.md` — `createApiHandler`, `ApiResponse.success`
- `caching-webhook-guide.md` — `withCache(key, ttl, fn)`, `invalidateCache`
- `structured-logging-guide.md` — `createLogger('portfolio:composer')`
- `theme-guide.md` — sky/blue gradient header, `rounded-2xl` cards
- `security-compliance-guide.md` — `auditLog.record()` for Kasuh portfolio access
