# M09 — KP & Kasuh Logbook

Developer-facing architecture documentation for the KP & Kasuh Logbook module (M09). Product-facing feature catalogue is in [FEATURES.md](./FEATURES.md).

---

## Purpose

M09 provides structured logbook tooling for two roles in the cadre hierarchy:

- **KP (Kakak Pendamping)**: daily stand-up log of group mood + red flags; weekly reflective debrief visible to cohort peers.
- **KASUH (Kakak Asuh)**: biweekly meeting log per adik asuh pair, with cycle tracking and urgent-flag escalation.

The module also exposes aggregate read APIs for SC oversight and wires into M10 (Safeguard) via an async cascade on severe red flags.

Scope boundary: M09 owns write and read for `KPLogDaily`, `KPLogWeekly`, `KasuhLog`. It reads (but does not own) M04 `PulseCheck` data and M03 `KPGroup`/`KasuhPair` membership.

---

## Architecture Decisions

### Suggested Mood — Real-Time Query, No Cache

When a KP opens the Daily form, `computeSuggestedMood()` (`src/lib/m09-aggregate/suggested-mood.ts`) runs a live Postgres aggregate against today's M04 `PulseCheck` rows for the KP's group. The result is only surfaced if `responderCount >= 3` (privacy floor).

A cache was deliberately avoided: the KP typically opens the form close to the 17:00 reminder, when fresh pulse data matters. Query cost is negligible (single cohort, one day, ~15 rows, indexed on `(cohortId, localDate)`).

### Weekly Aggregate — Pre-Compute Cron + Redis + Fallback

KP Weekly Debrief is opened on Monday mornings by all KPs simultaneously. The context snapshot (avg mood, red flag breakdown, anecdote list for the previous week) is pre-computed on Saturday at 22:00 by the cron at `src/app/api/cron/m09-precompute-weekly-aggregate/route.ts` and stored in Redis with TTL 7 days.

Cache key pattern: `m09:weekly-agg:{kpUserId}:{weekNumber}`.

If the cache is missing (cron failed, first run, cache evicted), `computeWeeklyContext()` (`src/lib/m09-aggregate/weekly-context.ts`) runs a live query as fallback. Editing a KPLogDaily within the 48-hour window triggers cache invalidation via `invalidateWeeklyCache()` in `kp-daily.service.ts`.

### Red Flag Cascade to M10 — Async Queue, Feature-Flagged

When a KP submits a Daily log with `INJURY` or `SHUTDOWN` in `redFlagsObserved`, the handler writes `KPLogDaily` synchronously (fast path for KP), then enqueues a cascade job via `enqueueCascadeJob()` (`src/lib/m09-cascade/job-queue.ts`) with a Redis SET NX dedupe key `m09-cascade:{kpLogDailyId}`.

The cascade processor cron (`src/app/api/cron/m09-cascade-processor/route.ts`, every 10 min) picks up jobs and calls M10's `POST /api/safeguard/incidents/draft`. Retry policy: 3 attempts with exponential backoff (500ms → 1s → 2s). On final failure, `RED_FLAG_CASCADE_FAILED` is audited and a CRITICAL M15 notification fires.

The feature is controlled by `M09_M10_CASCADE_ENABLED` env var (default `false` until M10 production-ready). When disabled, severe red flags still fire M15 HIGH notifications; cascade to M10 is skipped silently.

If a KP edits a log within 48h to remove a severe flag, `m10-cascade.ts` calls M10 to mark the draft `SUPERSEDED` and records `RED_FLAG_REVOKED` in the audit log.

### Peer Debrief Scope — App-Layer Resolver

RLS on `KPLogWeekly` is self-only + SC/SUPERADMIN bypass. Peer visibility (KPs in the same cohort reading each other's weekly debriefs) is enforced app-layer by `peer-cohort-resolver.ts` (`src/lib/m09-access/peer-cohort-resolver.ts`):

1. Resolve requesting KP's `cohortId` from `KPGroupMember`.
2. Fetch all active KP users in the same cohort.
3. If `debriefKpId` is not in that set, throw `ForbiddenError`.
4. Perform read with RLS bypass (short transaction scope), audit `PEER_DEBRIEF_READ`.

This pattern mirrors M04's `kp-group-resolver` and keeps the bypass auditable.

### Kasuh Adik Asuh Pulse Read — Bypass RLS Wrapper Audited

`KasuhPair` gating is enforced in `kasuh-adik-resolver.ts` (`src/lib/m09-access/kasuh-adik-resolver.ts`):

1. Query `KasuhPair` WHERE `kasuhUserId = currentUser AND mabaUserId = requestedMaba AND status = ACTIVE`.
2. If not found or inactive, throw `ForbiddenError` (fail-closed).
3. Set `app.bypass_rls = 'true'` in a scoped transaction, read the Maba's pulse trend, then reset.
4. Audit `KASUH_PULSE_READ` unconditionally in the same transaction or rollback.

No audit emission = no bypass proceeds. This invariant is enforced in code but not yet tested (deferred to Phase H).

### Kasuh Cycle Computation — Per-Pair `createdAt` Anchor

Cycle number and due date are derived from `KasuhPair.createdAt` + 14-day intervals via pure functions in `src/lib/m09-logbook/cycle.ts` (`computeCycleNumber`, `computeCycleDueDate`, `isOverdue`). Each pair has an independent cycle timeline rather than a cohort-wide counter.

Rationale: SC commits pairs in batches over several days; a cohort-wide anchor would make pairs formed later always "late." Per-pair anchors reflect real formation dates.

Migration path to cohort-wide anchor: add `KasuhPair.cycleAnchor` nullable field; existing rows default to `createdAt`. Additive, non-breaking.

### KP Daily Edit Window — Soft Lock at Service Layer

`kp-daily.service.ts` enforces the 48-hour edit window at the service layer via a `recordedAt` timestamp check. After 48 hours, `submitKPLogDaily` throws `ForbiddenError('EDIT_WINDOW_EXPIRED')`. No database-level constraint exists. The audit log records `KP_LOG_DAILY_EDIT` with `oldValue`/`newValue` for every successful edit.

---

## Patterns & Conventions

### Three-Layer Access for Cross-Role Reads

All cross-role data reads (Kasuh reading Maba pulse, KP reading peer debrief) follow the same pattern:

```
1. App-layer resolver: verify relationship exists (KasuhPair ACTIVE / same cohort KP)
2. RLS bypass in narrow transaction scope
3. Audit log emitted unconditionally (no audit = transaction rolled back)
```

This pattern is in `src/lib/m09-access/`.

### Cascade Job Queue Key Pattern

Redis dedup key for cascade jobs: `m09-cascade:{kpLogDailyId}`. SET NX prevents double-enqueue on concurrent requests or retries. The key is deleted after a job completes successfully or after max retries (to allow re-enqueue on KP edit).

### SC Aggregate Endpoints — Three Focused Routes

SC oversight is served by three narrow endpoints under `src/app/api/sc/m09/`:

| Route | Cache TTL | Description |
|---|---|---|
| `weekly-rollup` | 5 min | Per-cohort per-week mood + red flag summary |
| `red-flag-feed` | None (live) | Paginated red flag events, severity-tiered |
| `kasuh-overdue` | None (live) | Kasuh pairs overdue > 3 days |

Auth: `roles: ['SC', 'SUPERADMIN', 'PEMBINA', 'DOSEN_WALI']`. PEMBINA/DOSEN_WALI see aggregates without personal names.

### AuditAction Values (M09)

14 values added to the shared `AuditAction` enum in `nawasena_audit.prisma`:

```
KP_LOG_DAILY_SUBMIT      KP_LOG_DAILY_EDIT
KP_LOG_WEEKLY_SUBMIT     KP_LOG_WEEKLY_EDIT
KASUH_LOG_SUBMIT         KASUH_LOG_EDIT
KASUH_PULSE_READ         PEER_DEBRIEF_READ
M09_LOGBOOK_ACCESS_BYPASS
RED_FLAG_CASCADE_TRIGGERED  RED_FLAG_CASCADE_FAILED  RED_FLAG_REVOKED
M09_RETENTION_PURGE      M09_PRECOMPUTE_WEEKLY
```

(Planning doc listed 13; `M09_PRECOMPUTE_WEEKLY` was added during implementation.)

---

## Gotchas

- **KasuhLog Maba exclusion is RLS-only, not enforced by FK.** The `kasuh_log_access` RLS policy explicitly omits `mabaUserId` from the self-read condition. If the policy is ever dropped or bypassed without a corresponding audit, Maba can read their own log. The E2E test for this is deferred to Phase H.

- **Weekly cache invalidation on Daily edit.** When a KP edits a Daily log (within 48h), `invalidateWeeklyCache(kpUserId, weekNumber)` is called in the same request handler. If the handler throws after the DB write but before the invalidation, the cache will serve stale data until TTL expiry (7 days). The fallback live query mitigates this for correctness; the cache hit is merely performance.

- **Cascade job Redis key never expires on permanent failure.** After 3 failed retries, the job is marked failed in the audit log but the Redis dedup key is left intact. This prevents re-enqueue on subsequent KP edits. Clear with `DEL m09-cascade:{kpLogDailyId}` manually if re-trigger is needed.

- **`Button variant="outline"` on colored KP dashboard backgrounds.** Per the theme guide, `variant="outline"` includes `bg-background` (white). Any colored background section must override with `bg-transparent` to avoid invisible white text.

- **localhost Weekly Weekly Weekly form draft uses `localStorage`.** There is no server-side draft table for `KPLogWeekly`. If the user clears browser storage between sessions, the draft is lost. The UI shows a warning. A `KPLogWeeklyDraft` table is planned for V2.

---

## Dependencies

### Depends On

- `M01 Foundation` — `createApiHandler`, `auditLog`, RLS policy pattern, `Organization`/`Cohort`/`User` models, tenant context injection
- `M03 Struktur Angkatan` — `KPGroup`, `KPGroupMember`, `KasuhPair` (membership + status)
- `M04 Pulse Journal` — `PulseCheck` aggregate for suggested mood; `PulseTrendChart` component reused in Kasuh dashboard
- `M10 Safeguarding` — `POST /api/safeguard/incidents/draft` consumer (feature-flagged off by default)
- `M15 Notifications` — `sendNotification` for all M09 reminders and red flag alerts; 6 M15 notification rules seeded; 5 email templates

### Depended By

- `M10 Safeguarding` — receives cascade draft incidents from M09 red flag INJURY/SHUTDOWN
- `M13 Dashboard Multi-Role` — consumes `GET /api/sc/m09/weekly-rollup` and `red-flag-feed` for SC overview widgets

---

## Security Considerations

- **RLS on all three tables.** `kp_log_daily`, `kp_log_weekly`, `kasuh_log` all have `ENABLE ROW LEVEL SECURITY`. The `kasuh_log_access` policy explicitly does not include a Maba self-read clause, making `KasuhLog` invisible to the Maba whose ID appears in `mabaUserId`.
- **Bypass RLS is always paired with audit.** All app-layer RLS bypass calls (`kasuh-adik-resolver.ts`, `peer-cohort-resolver.ts`) emit an audit log in the same transaction. Missing audit = transaction rollback. This invariant must be preserved if these resolvers are modified.
- **Retention purge at 2 years.** `m09-retention-purge` cron runs daily at 03:30. It audits `M09_RETENTION_PURGE` with counts. No PII is emitted to logs; only counts and cutoff dates appear.
- **Cascade payload to M10.** The cascade payload includes `kpGroupId`, `redFlagTypes`, a truncated anecdote, and `kpUserId` as reporter. It does not include raw journal text. The `subjectUserId` field is null at cascade time; SC assigns it in M10.

---

## Performance Notes

- **Weekly pre-compute cron** runs Saturdays at 22:00 and processes all active KPs in parallel batches of 50. Expected duration for 15,000 KPs: ~10 minutes. Monitor via M15 telemetry.
- **Kasuh dashboard cache** uses TTL 10 minutes (`src/lib/m09-aggregate/kasuh-dashboard-cache.ts`). The cache wraps the combined `KasuhPair` + `KasuhLog` + pulse trend query for the Kasuh's dashboard.
- **SC rollup cache** uses TTL 5 minutes. `red-flag-feed` and `kasuh-overdue` are not cached (live for SC operational accuracy).
