# M14 — Triwulan Review, Sign-off & Audit

Implements the full quarterly accountability cycle for NAWASENA: snapshot generation from all upstream modules, multi-role sign-off workflow (SC → Pembina → BLM), PDF export, archive, and automated escalation/reminder cron jobs. This module is the governance closure of the M01–M15 ecosystem.

See [FEATURES.md](./FEATURES.md) for the full feature catalogue.

## Purpose

Close the governance loop that all prior NAWASENA modules feed into. Each quarter, SC generates a frozen snapshot of cohort health data, writes a narrative, routes it through Pembina signature and BLM audit, then archives a signed PDF. The system enforces that sign-off cannot be circumvented and the audit trail cannot be altered.

## Architecture Decisions

### Frozen JSON Snapshot over Live Queries

`TriwulanReview.dataSnapshotJsonb` stores all metrics at generation time and is never updated after that. Every downstream step (Pembina review, BLM audit, PDF render) reads this same frozen blob.

- Historical accuracy: opening a Q1 review in a later year still shows Q1 data
- Audit immutability: Pembina signs a specific dataset; post-sign mutations would be a governance violation
- Performance: single row fetch replaces 10+ cross-module joins at read time
- Trade-off: JSON blob can reach 50–200 KB per review; normalized child tables were considered and rejected as over-engineering for a read-once historical record

### Forward-only State Machine with Revision Lineage

State transitions are enforced by pure functions in `transitions.ts`. There is no "go back" operation. Revision requests (Pembina or BLM) create a **new** `TriwulanReview` row pointing back via `previousReviewId`; the original row is marked with `supersededByReviewId`. The old row remains readable but is excluded from active queries via a partial unique index `(cohortId, quarterNumber) WHERE supersededByReviewId IS NULL`.

- Commitment is final — prior states cannot be re-entered by any role
- Revision history is fully preserved and queryable
- Race condition mitigation: state-update SQL includes `WHERE status = 'expected_status'` to implement optimistic concurrency; concurrent sign attempts return 409

### Append-only Signature Events with DB-level REVOKE

Every state transition (GENERATE, SUBMIT, PEMBINA_SIGN, BLM_ACKNOWLEDGE, etc.) writes a `TriwulanSignatureEvent` row. The migration also issues `REVOKE UPDATE, DELETE ON "triwulan_signature_events" FROM app_role`, so no application code — not even raw Prisma queries — can modify or delete these rows.

- Defense-in-depth: DB layer enforces immutability even if application layer is bypassed
- IP is stored as `SHA256(ip + TRIWULAN_IP_SALT)` — traceable for forensics without storing raw PII

### Parallel Sub-generators with Per-source Timeout

The generator orchestrator fans out 10 sub-generator calls with `Promise.all`, each wrapped in a 5-second timeout. Timed-out or errored sources add their name to `missingSources[]` and set `dataPartial: true` on the snapshot. Generation succeeds even with partial data rather than blocking the entire review.

- Idempotency: if a non-superseded review already exists for `(cohortId, quarterNumber)`, the orchestrator returns it immediately without re-generating

### Async PDF Pipeline with Retry and Fallback

PDF render is not awaited in the BLM acknowledge request. `acknowledgeByBLM()` enqueues a fire-and-forget job that calls `@react-pdf/renderer` server-side, uploads to S3/DO Spaces, and updates `pdfStatus`. Failure triggers 3 retries with exponential backoff (5s, 10s, 20s). On final failure, `pdfStatus = FAILED` and M15 notifies SC + SUPERADMIN.

- Charts are generated as pure SVG path data (`chart-generator.ts`) to avoid canvas/browser dependencies in the server context
- `PDFDownloadButton.tsx` polls `pdfStatus` every 5 seconds to reflect render progress in real time

## Patterns & Conventions

### Guard Functions in `transitions.ts`

`canSubmit`, `canPembinaSign`, and `canBLMAcknowledge` are pure predicate functions — no database access, easy to unit-test. All API handlers call these guards before performing any mutation.

### URGENT Escalation Extra Requirements

When `escalationLevel === 'URGENT'` (triggered at generate time), the Pembina sign flow requires an additional checkbox confirming in-person review was conducted (`inPersonReviewed: true`) and notes of at least 200 characters. This is validated in `canPembinaSign()` and enforced in `pembina-service.ts`.

### Circular Dependency Resolution in PDF Queue

`audit-substansi/service.ts` (which calls `acknowledgeByBLM`) and `pdf/job-queue.ts` (which is called after acknowledge) would form a circular import. Resolved via lazy injection: `job-queue.ts` exports `setPDFQueueFunction(fn)`, and `audit-substansi/service.ts` calls the injected function rather than importing directly.

### Escalation Threshold Override

Six escalation rules are hardcoded in `escalation/rules.ts` with default thresholds. Any rule can be overridden per-organization via `Organization.settings.triwulanEscalationThresholds` (JSONB). No UI to set these in V1 — only direct DB or SUPERADMIN tooling. Unknown threshold keys are silently ignored; missing keys fall back to defaults.

## Gotchas

- **`pdfStatus` starts as `NOT_GENERATED`, not `PENDING`** — PDF render is only enqueued after BLM acknowledge, not after FINALIZE. `PDFDownloadButton` must handle all four non-ready states.
- **Revision flow creates a new row, it does not clone snapshot data** — the new DRAFT row calls the generator again, producing a fresh snapshot for the revised quarter. The previous review's snapshot is not copied.
- **`supersededByReviewId` is the active-review filter** — list queries for SC/Pembina/BLM must always include `supersededByReviewId: null` to exclude superseded reviews from action queues. Forgetting this causes ghost entries.
- **Retention cron defaults to dry-run** — `DRY_RUN_DEFAULT = true` in `triwulan-retention-purge/route.ts`. Passing `?dryRun=false` is required to perform actual deletions. This is intentional.
- **Partial unique index is enforced in raw SQL** — Prisma's `@@unique` does not support `WHERE` clauses, so the `(cohortId, quarterNumber) WHERE supersededByReviewId IS NULL` constraint lives only in the migration file and is invisible to Prisma Client schema introspection.

## Dependencies

### Depends On

- `prisma/schema/nawasena_auth.prisma` — User, Organization, Cohort (M01)
- `prisma/schema/nawasena_master.prisma` — KPISignal (M13) consumed by kpi-snapshot
- `prisma/schema/nawasena_safeguard.prisma` — SafeguardIncident (M10) for incident-snapshot
- `prisma/schema/nawasena_anon_report.prisma` — AnonReport aggregate counts (M12)
- `prisma/schema/nawasena_pakta.prisma` — PaktaSignature for compliance-snapshot (M01/M02)
- `prisma/schema/nawasena_notifications.prisma` — NotificationLog + NotificationTemplate (M15)
- `src/lib/cache.ts` — `withCache` / `invalidateCache` for archive queries
- `src/lib/api` — `createApiHandler`, `ApiResponse`, `validateBody`
- `src/services/audit-log.service.ts` — `auditLog.fromContext` on every mutation
- AWS S3 / DigitalOcean Spaces — PDF storage (pattern from M05)

### Depended By

- No downstream NAWASENA modules consume M14 data in V1
- Dirmawa handoff (external): PDF documents exported from archive

## Security Considerations

- `TriwulanSignatureEvent` is insert-only at the database layer — `REVOKE UPDATE, DELETE FROM app_role` applied in migration
- All API routes use `createApiHandler` with explicit `roles` — no manual `getServerSession` checks
- IP stored as `SHA256(IP + TRIWULAN_IP_SALT)` — rotate salt annually via env var; existing hashes remain valid for within-review correlation only
- `PDF_DOWNLOAD` action is recorded as a `TriwulanSignatureEvent` for forensic traceability
- Presigned URL TTL is 1 hour — short window to limit inadvertent sharing; V1.1 upgrade path to session-gated streaming endpoint documented in `05-arsitektur.md` §R-A6

## Testing Notes

Unit tests exist for:
- State machine transitions (valid + invalid) — `triwulan-state-machine.test.ts`
- Escalation rules (all 6 rules) — `triwulan-escalation-rules.test.ts`
- Audit substansi validation (upsert + acknowledge rejection) — `triwulan-audit-substansi.test.ts`

E2E specs are planned but not yet written (see `08-master-checklist.md` Phase I.2). The full lifecycle (generate → edit → submit → sign → audit → PDF) requires Playwright fixtures for SC, Pembina, and BLM roles in the same test.
