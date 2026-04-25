# M13 — Dashboard Multi-Role

Central dashboard hub for NAWASENA that routes each authenticated user to a role-specific view. Aggregates live and pre-computed data from modules M01–M12 into 8 role-tailored dashboards, backed by a materialized KPI signal store, a rules-based red flag engine, and a two-layer caching strategy.

See [FEATURES.md](./FEATURES.md) for a product-facing catalogue of what each role sees.

---

## Purpose

A single `/dashboard` entry point that reads the session role and redirects to `/dashboard/<role>`. Each role's page fetches its payload from `GET /api/dashboard/[role]`, which builds a typed payload object from multiple source modules and caches it in Redis for 5 minutes. The architecture avoids duplication: every widget consumes a pre-shaped payload rather than making its own DB queries.

---

## Architecture Decisions

### No Dedicated Cache Table — Redis as the Cache Layer

The original plan included a `DashboardMetricCache` Prisma model. During implementation this was dropped in favour of using the existing `withCache()` utility (`src/lib/cache.ts`). The schema only persists long-lived aggregates (`KPISignal`) and alert lifecycle records (`RedFlagAlert`). Ephemeral dashboard payloads live solely in Redis.

- Trade-off: no SQL query to inspect cached payload state, but zero migration cost and consistent TTL behaviour.

### Append-Only KPISignal vs Upsert

`KPISignal` records are appended on every nightly cron run rather than upserted by `(cohortId, kpiDefId, period)`. This preserves a full time-series for trend computation. Reading the "latest" value uses the `kpi_signal_hot_read` composite index `(cohortId, kpiDefId, period, computedAt DESC)`.

### Role Guard in API, Not Middleware

The `GET /api/dashboard/[role]` handler compares `session.user.role` against `DASHBOARD_ROLE_MAP[role]`. RBAC middleware (`src/lib/rbac.ts`) enforces the page-level routes (`/dashboard/maba`, etc.) but the API adds a second check so direct API calls are equally protected.

### Privacy — Cell Floor k>=5

Any aggregate that touches mental health or anonymous report data applies a cell floor of 5: a count is returned as `0` if fewer than 5 records exist for that group. This is enforced inside the payload builders (`sc.ts`, `blm.ts`) rather than at the widget level, so the API response itself is already privacy-safe.

### SC Live Mood Polling

The SC dashboard polls `/api/dashboard/sc/mood-live` every 60 seconds via `setInterval`. The endpoint caches its result under `live:mood:{cohortId}` for 60 seconds, so all concurrent SC viewers share a single DB read. Rate limit: 30 req/min/user (enforced by `createApiHandler`).

### Red Flag Engine — Auto-Resolve via Dedup Key

Rules produce `RuleHit` objects. The engine deduplicates by `${ruleType}:${targetUserId ?? 'null'}`. On each run:
- Existing ACTIVE alert with matching key → `computedAt` updated (no duplicate created).
- New hit with no existing ACTIVE alert → new `RedFlagAlert` created.
- Existing ACTIVE alert whose key is absent from current hits → status set to `RESOLVED`.

This means alerts self-heal without manual intervention.

### Kirkpatrick L4 is Always Partial

L4 (Results) tracks cohort retention (active users / total users) but marks `partial: true` permanently, pending SIAKAD integration for IPS scores and LKMM-TD certification data. The `PartialDataBadge` widget surfaces this to SC and Pembina users.

---

## Patterns & Conventions

### Payload Builder Pattern

Each role has a builder in `src/lib/dashboard/payload-builders/<role>.ts` that accepts `(userId, cohortId[, organizationId])` and returns a typed payload. The dynamic API route at `src/app/api/dashboard/[role]/route.ts` dispatches to the correct builder and wraps the call in `getCachedDashboardPayload()`.

```
GET /api/dashboard/sc
  → createApiHandler (auth + role guard)
  → getCachedDashboardPayload("sc", userId, cohortId, ...)   TTL 5 min
    → buildSCDashboard(userId, cohortId, organizationId)
      → computeKirkpatrickSnapshot (parallel Promise.all)
      → getTodayMoodAvg         (cached 60s)
      → getActiveAlertCount     (cached CACHE_TTL.SHORT)
      → prisma.redFlagAlert.findMany
      → buildComplianceData
      → prisma.anonReport.count * 4
```

### WidgetState Envelope

All widgets accept a `WidgetState<T>` prop (defined in `src/types/dashboard.ts`):

```typescript
type WidgetState<T> =
  | { status: 'loading' }
  | { status: 'data'; data: T }
  | { status: 'empty' }
  | { status: 'partial'; data: Partial<T>; reason: string }
  | { status: 'error'; error: string };
```

Pages construct the state object from the API payload before passing to widgets. Widgets never call `fetch` themselves.

### WidgetErrorBoundary Isolation

Every widget on every dashboard page is wrapped in `<WidgetErrorBoundary widgetName="...">`. A crash in one widget renders a scoped error card without affecting the rest of the page.

### Cron Auth — Bearer CRON_SECRET

Cron routes (`/api/cron/nightly`, `/api/cron/redflag-engine`) do NOT use `createApiHandler`. They verify `Authorization: Bearer ${CRON_SECRET}` directly. This avoids session logic and keeps cron invocations simple.

---

## Gotchas

- **`DashboardMetricCache` model does not exist** — some planning docs reference it; it was not built. Use `KPISignal` for persisted aggregates or Redis for ephemeral ones.
- **Enum naming changed** — `RedFlagStatus` became `AlertStatus` (adds `SNOOZED`); `KPISource` became `KPISignalSource`. The Prisma schema is authoritative.
- **`PAYLOAD_BUILDERS_2ARGS` set** — Builders for `maba`, `oc`, `kasuh`, `kp` take `(userId, cohortId)`. Builders for `blm`, `pembina`, `satgas`, `sc` take `(userId, cohortId, organizationId)`. The dynamic route uses this set to dispatch correctly.
- **Nightly cron schedule is UTC** — `0 19 * * *` = 02:00 WIB. Red flag engine runs every 30 min: `*/30 * * * *`.
- **Alert `targetRoles` is a Prisma scalar list** (`UserRole[]`). When querying alerts for a specific role, use `{ targetRoles: { has: 'SC' } }`.

---

## Dependencies

### Depends On

- `src/lib/cache.ts` — `withCache`, `invalidateCache` for all Redis caching
- `src/lib/api` — `createApiHandler`, `ApiResponse`, `ForbiddenError`, `NotFoundError`
- `src/lib/logger.ts` — `createLogger` used in every service and route
- `@/utils/prisma` — all database access
- **M01** (User/Cohort/Organization schema) — cohortId, organizationId on session token
- **M04** (KP/KASUH logbook, rubrik scores) — L2 Kirkpatrick, KP payload
- **M05** (Passport) — passport completion rate, MABA dashboard
- **M06** (Events/NPS) — L1 Kirkpatrick, OC payload, attendance for L3
- **M09** (KASUH logbook) — KASUH payload, log completion rate KPI
- **M10** (Safeguard incidents) — incident resolution rate KPI, red flag rules
- **M11** (Mental health) — cell-floor applied; no individual data surfaced
- **M12** (Anonymous channel) — anon report counts for SC/BLM/Satgas
- **M02** (KPIDef master data) — `MEASURE_METHOD_REGISTRY` keys map to `kpiDef.measureMethod`

### Depended By

- `src/middleware.ts` — imports `ROUTE_RBAC_MAP` entries for `/dashboard/*` paths from `src/lib/rbac.ts`
- `src/components/layout/vertical/sidebar/Sidebaritems.ts` — dashboard navigation entries
- M14 (Triwulan) — triwulan page linked from SC dashboard drill-down

---

## State Management

Data flows one-way: Cron → PostgreSQL (`KPISignal`, `RedFlagAlert`) → API payload builder → Redis cache → Client page state → Widget props. No client-side state is written back to the server except alert acknowledgements (handled via the `/api/dashboard/alerts/[id]` endpoint).

---

## Security Considerations

- **RBAC double-check**: middleware checks page routes; API handler checks the slug against `DASHBOARD_ROLE_MAP`.
- **Privacy cell floor**: SC and Satgas anon/MH aggregates apply k>=5 floor in payload builders before the data leaves the server.
- **Cron secret**: `CRON_SECRET` env var must be set; endpoints return 500 if missing and 401 if header does not match.
- **RLS policies**: Added to migration for `kpi_signals` and `red_flag_alerts` tables (PostgreSQL row-level security on `organizationId`).

---

## Performance Notes

- Dashboard payload TTL: 5 minutes per `(role, userId, cohortId)` key.
- Live mood TTL: 60 seconds per `cohortId` (shared across all SC viewers).
- Alert count TTL: `CACHE_TTL.SHORT` (from `src/lib/cache.ts`).
- Pulse streak TTL: 60 seconds per `userId`.
- Upcoming events TTL: `CACHE_TTL.SHORT` per `(cohortId, userId, days)`.
- All cache operations use `withCache` with graceful degradation (Redis unavailable → direct DB call).
- FCP performance targets (< 1.5s cache hit, < 3s cache miss) are defined but not yet validated; see Phase 9 in `08-master-checklist.md`.

---

## Testing Notes

Unit tests exist for:
- `src/lib/dashboard/aggregation/__tests__/` — kirkpatrick, kpi-compute, live-compute, aggregation-helpers
- `src/lib/redflag-rules/__tests__/rules.test.ts` — 8 rule evaluations
- `src/components/dashboard/widgets/__tests__/widgets.test.tsx` — smoke render + error boundary

E2E tests (per-role, privacy, SC polling, cross-role 403) are planned but not yet written — see Phase 9.
