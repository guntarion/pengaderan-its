# M06 — Event RSVP & NPS

Manages the full participant lifecycle for scheduled Kegiatan instances: public catalog surfacing, authenticated RSVP with waitlist promotion, post-event NPS collection, and OC aggregate dashboards. Provides a stable contract barrel consumed by M08 (Eksekusi Kegiatan).

See [FEATURES.md](./FEATURES.md) for the full feature catalogue.

---

## Purpose

M06 sits between M02 (Kegiatan master data) and M08 (OC execution). It owns everything a Maba or OC actor does *around* a scheduled event — before it starts (RSVP) and after it ends (NPS). M08 owns what happens *during* the event (attendance scanning, outputs, lifecycle transitions).

---

## Architecture Decisions

### Shared Schema File with M08

`nawasena_event_instance.prisma` hosts both M06-core models (`KegiatanInstance`, `RSVP`, `EventNPS`) and the M08-extended `Attendance` model. The file header documents which fields belong to which module. This avoids a cross-schema foreign-key problem while keeping M06 and M08 independently deployable at the service layer.

### Contract Barrel for Inter-Module Integration

All exports consumed by M08 and M05 are gated through `src/lib/event/index.ts`. Internal service paths (`services/nps-trigger`, `services/attendance.service`, etc.) are not imported directly by other modules. This keeps the public API surface explicit and prevents accidental coupling to internal restructuring.

### Advisory Lock + Serializable Isolation for RSVP Decline

RSVP decline + waitlist promotion runs inside a `Serializable` transaction with `pg_advisory_xact_lock(hashtext(instanceId))`. This prevents the classic "two declines promote the same waitlist user" race condition without requiring an application-level queue. The lock is instance-scoped so concurrent declines on different instances do not block each other.

### NPS Deduplication via `npsRequestedAt`

Rather than a separate dedupe table, `KegiatanInstance.npsRequestedAt` is used as a single-field idempotency marker. `triggerNPSForInstance` checks and sets this atomically. If M08 calls the trigger multiple times (e.g. lifecycle retry), the second call returns immediately without sending duplicate notifications.

### Privacy Minimum for NPS Aggregate

`getNPSAggregate` returns `{ insufficientData: true }` when `n < 5`. Individual NPS rows (especially free-text comments) are never returned from the aggregate endpoint. The histogram and net-promoter calculation are only exposed at the aggregate level to OC/SC roles.

### Fail-Open Rate Limiting

The Upstash Redis RSVP rate limiter (`rate-limit.ts`) uses fail-open semantics: if Redis is unavailable, the RSVP is allowed with a warning log. This prevents Redis downtime from blocking a time-sensitive RSVP window.

---

## Patterns & Conventions

### Three-Bucket Maba Listing

`getListingForMaba` returns three RSVP buckets — Upcoming (PLANNED), Ongoing (RUNNING), Past (DONE/CANCELLED) — pre-sorted so the UI tabs can render without client-side filtering. This avoids a status enum string comparison in React.

### Role-Shaped Responses

`getInstanceDetail` and `getRSVPListScoped` return different field sets depending on whether the caller is OC/SC or Maba. OC gets `notesPanitia`, email, NRP; Maba gets name-only for the confirmed list. Role checking happens in the service layer, not in the API route handler.

### Cache Key Namespaces

```
kegiatan:instances:upcoming:{orgCode}:{kegiatanId}   — public catalog (TTL 3600s)
event:instance:{instanceId}:*                         — per-instance data (TTL 60s)
event:instance:{instanceId}:nps-aggregate:{orgId}     — NPS aggregate (TTL 60s)
```

`invalidateInstanceCache` uses a wildcard pattern to flush all per-instance keys after any mutation.

### Dynamic Import for M15

`broadcast.ts` and `nps-trigger.ts` import `sendNotification` via `await import('@/lib/notifications/send')` rather than a top-level import. This avoids circular dependency initialization order issues and ensures the module graph loads correctly even if M15 is initialized after M06.

---

## Gotchas

- **`nps-window-expired.spec.ts` is deferred** — requires an authenticated session with a seeded instance that has `executedAt` set more than 7 days ago. Cannot be run without a live DB + seeded state.

- **`rsvp-cancelled-notification.spec.ts` is deferred** — requires M15 live + seeded notification templates. The broadcast code path is tested at the unit level via mock.

- **DB migration was prepared but not applied** — the migration SQL (`m06_event_instance_init`) includes `ALTER TYPE "AuditAction" ADD VALUE`, RLS `CREATE POLICY` statements, and CHECK constraints. It cannot be applied while the dev DB is unreachable. The schema Prisma file is correct and matches the SQL.

- **`organizationId` is denormalized on all 4 models** — this is intentional for RLS performance. Always pass `organizationId` explicitly when creating RSVP, EventNPS, or Attendance records. Do not rely on joins to resolve it at query time.

- **`purgeOldEventData` is an alias** — `src/lib/event/index.ts` exports `purgeExpiredInstances as purgeOldEventData` for M08 naming consistency. Both names refer to the same function.

---

## Security Considerations

- **Row-Level Security**: All 4 tables have `ENABLE ROW LEVEL SECURITY` + scoped policies in the migration SQL. Maba cannot read other organizations' RSVP or NPS data at the DB layer.
- **NPS comment privacy**: Comments are stored but never returned to OC via the aggregate endpoint. The `getNPSAggregate` service intentionally omits the `comment` field from its query.
- **RSVP rate limit**: 10 RSVP actions per user per hour via Upstash Redis. Fail-open with warning log.
- **Audit trail**: Every RSVP create, decline, promote, NPS submit, and NPS trigger event is recorded in `nawasena_audit_logs` with `actorUserId`, `entityType`, and before/after values.

---

## Dependencies

### Depends On

- `M02 Master Data` — `Kegiatan` model; `kegiatanId` FK on `KegiatanInstance`
- `M03 Struktur Angkatan` — `Cohort.id` FK on `KegiatanInstance`; `cohortId` used for listing scope
- `M15 Notifications` — `sendNotification` (dynamic import) for `RSVP_WAITLIST_PROMOTED`, `EVENT_CANCELLED`, `NPS_REQUEST` templates
- `src/lib/cache` — `withCache`, `invalidateCache`, `CACHE_TTL`
- `src/lib/redis` — Upstash Redis for RSVP rate limiting (fail-open)
- `src/lib/api` — `createApiHandler`, `ApiResponse`, `validateBody`

### Depended By

- **M08 Eksekusi Kegiatan** — imports `triggerNPSForInstance`, `cancelNPSTrigger`, `invalidatePublicInstancesCache`, `purgeOldEventData`, `broadcastCancellation` from `src/lib/event/index.ts`
- **M05 Passport Digital** — imports `getAttendanceSummary`, `wasHadir` for the `ATTENDANCE` evidence type
- **M01 Foundation cron** — imports `purgeExpiredInstances` for the monthly retention purge

### Related

- `docs/modul/06-event-rsvp-nps/` — PRD (`01`–`04`), architecture (`05`), data model (`06`), implementation plan (`07`), this checklist (`08`)
- `prisma/schema/nawasena_event_instance.prisma` — canonical schema for all 4 models + 3 enums
- `e2e/tests/event/` — 8 E2E specs (2 deferred)
