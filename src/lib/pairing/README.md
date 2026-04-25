# M03 Struktur Angkatan

Manages the three pairing structures of a NAWASENA cohort: KP Groups (kelompok pendampingan), Buddy Pairs, and Kasuh-Maba pairs. Provides admin tools for SC/OC to generate and maintain assignments, and role-specific dashboards for participants to view their relations.

See [FEATURES.md](./FEATURES.md) for the full feature catalogue.

## Purpose

Cohort participants must be assigned to three overlapping structures before the programme begins. Each structure has different matching criteria, capacity constraints, and re-assignment rules. M03 isolates all pairing logic, its associated admin workflows, and the consent flow for requesting a re-assignment — keeping pairing concerns out of M04 (journal), M09 (logbook), and M10 (safeguard) which consume the resulting pair IDs.

## Architecture Decisions

### Pure Algorithm Library (`src/lib/pairing/`)

All three algorithms are pure, synchronous TypeScript functions with no database or network calls. This choice was deliberate:

- Enables exhaustive unit testing without mocking (`npm test` runs 205 tests deterministically)
- Preview/commit pattern: the algorithm runs during preview, the result is cached in Redis, then committed atomically via a separate request — the algorithm does not need to touch the DB
- The same functions can be called from integration scripts or a seed file without importing Next.js infrastructure

Each algorithm has its own module; `index.ts` re-exports everything. Do not import from the individual files directly — always go through the barrel.

### Greedy Bipartite + Single-Pass Swap (Buddy)

A full Hungarian algorithm would guarantee the global optimum but is O(n^3). For cohorts of up to 200 MABA the greedy + single-pass swap consistently achieves ≥80% cross-demographic ratio, which is the target. The swap pass runs in O(n × m) where m is the number of intra-group pairs — negligible at this scale.

Seeded PRNG (Mulberry32 inline, no `Math.random()`) ensures the same seed and sorted input always produce identical output. The `inputHash` (FNV-1a of sorted userIds) lets the commit endpoint verify that no users were added or removed between preview and commit.

### Jaccard Similarity + Bonus Weights (Kasuh Matchmaking)

Jaccard was chosen over cosine or TF-IDF because:
- Interests are treated as unordered sets (no frequency, no order)
- Jaccard handles empty sets gracefully (returns 0, no NaN)
- Score is bounded [0, 1] which makes the bonus weights (+0.2 province, +0.1 prodi) easy to reason about

Capacity enforcement (max 2 adik asuh per KASUH) is applied as a pre-filter, not post-filter, to avoid suggesting ineligible kasuhs and wasting the caller's time.

### Preview/Commit Two-Phase Flow

All bulk operations (buddy generate, kasuh suggest, KP group assign) use a preview → cache → commit pattern:
1. Preview endpoint runs the algorithm, stores result in Redis (`src/lib/preview-cache/`) with a signed token (10-min TTL), and returns a summary
2. SC/OC reviews the preview in the UI
3. Commit endpoint reads the token, verifies the HMAC signature and input hash, then writes to the DB inside a serializable transaction with `pg_advisory_xact_lock`

This prevents partial writes from double-submits and ensures the committed result matches exactly what was previewed. The preview cache gracefully degrades to an in-memory `Map` when Redis is not configured (development).

### Denormalized `organizationId` + `cohortId` on Every Table

All seven tables carry `organizationId` and `cohortId` even though they can be derived via join. This is the same pattern as M01:
- RLS policies filter on `organizationId` as the primary isolation key
- Partial unique indexes use `cohortId` as the scope (one ACTIVE pair per maba per cohort)
- Avoids multi-hop joins in hot-path queries like `my-relations`

### Partial Unique Indexes (not Prisma `@@unique`)

Constraints like "a maba can have at most one ACTIVE KasuhPair per cohort" cannot be expressed as a Prisma unique index because Prisma does not support partial indexes natively. They are created via raw SQL in the migration file:
- `kpgroup_member_active_unique` — `(cohort_id, user_id) WHERE status = 'ACTIVE'`
- `buddy_pair_member_active_unique` — `(cohort_id, user_id) WHERE status = 'ACTIVE'`
- `kasuh_pair_active_per_maba` — `(cohort_id, maba_user_id) WHERE status = 'ACTIVE'`

When archiving a pair, always set `status = 'ARCHIVED'` before inserting the replacement — otherwise Postgres will reject the insert.

### Copy-Locked Re-pair Consent Text (`src/i18n/struktur-copy.ts`)

All user-visible strings for the re-pair consent flow are kept in a single locked file with a `DO NOT CHANGE` comment. This is a deliberate contract: BLM and the UX team review this file before go-live, and no developer should edit it unilaterally. The component reads strings via the `STRUKTUR_COPY` constant — never hardcodes inline strings.

### Field-Level Access Control (`src/lib/user/sanitize.ts`)

User data returned by pairing APIs is sanitized through purpose-specific views (`buddy_view`, `kp_group_view`, `kasuh_adik_view`) rather than returning raw User rows. KP cannot see `isKIP` or `emergencyContact` for their group members; KASUH cannot see mental health screening data. The sanitizer is a pure function — it does not make additional DB queries.

## Patterns & Conventions

### Route Naming

Admin pairing routes live at `/api/admin/struktur/` (SC/OC/SUPERADMIN only). User-facing pairing queries live at `/api/pairing/` (role-gated per endpoint). This split makes RBAC auditing straightforward.

### `BulkPairingBatch` as Audit Trail

Every committed bulk operation creates a `BulkPairingBatch` row with the algorithm version, seed, input hash, and summary. This gives SC/OC a permanent record of how each generation was performed and what the inputs were.

### Self-Relation on `KasuhPair`

`KasuhPair.previousPairId` forms a linked list of historical pairs for a given maba. The fulfill flow archives the current pair and links the new pair to it via `previousPairId`. The pairing history timeline page follows this chain.

## Gotchas

- **Never delete pairs — only archive them.** The partial unique index allows a new ACTIVE pair only after the old one is ARCHIVED. Hard-deleting an old pair would break `previousPairId` chain references.

- **`pg_advisory_xact_lock` must use a stable integer per operation type.** KP-group commit uses `lock(1001)`, Buddy uses `lock(1002)`, Kasuh uses `lock(1003)`. If two commits of the same type race, the second blocks until the first commits. Using different lock IDs allows concurrent Buddy and Kasuh commits which is correct.

- **Preview tokens are one-time use.** The commit endpoint calls `invalidatePreview(token)` after successfully writing to the DB. A second commit attempt with the same token returns 404 (token not found). This is intentional — re-run the preview flow to try again.

- **`pair-health.ts` is a V1 stub** — it always returns `[]`. The real implementation depends on M07 (TimeCapsule) and M09 (KasuhLog) data, which were not available when M03 was built. Do not write logic that depends on `computeUnhealthyPairs()` returning meaningful data yet.

- **`canRequestRePair` counts from `cohort.startDate`**, not from the first request date. If the cohort start date is misconfigured in the DB, the 21-day window will be wrong. Verify `Cohort.startDate` is set correctly before enabling the re-pair flow.

## Security Considerations

RLS policies on all seven tables enforce org-level isolation using the `current_setting('app.current_organization_id')` pattern inherited from M01. Ensure `SET LOCAL app.current_organization_id` is called inside every transaction before reading pairing data (handled automatically by the Prisma tenant extension from M01).

Pairing APIs that return user data (e.g., `my-relations`, `my-group`) must always call the sanitizer. Never return a raw Prisma `User` record from a pairing route.

## Testing Notes

Unit tests for all three algorithms live alongside the source files in `src/lib/pairing/`. Run them with `npx vitest run src/lib/pairing/` — they are fast (no DB, no network) and should be kept green.

E2E specs in `e2e/tests/struktur/` cover the full browser flows including RBAC restrictions and RLS cross-org checks. They require a seeded staging DB — do not run them against production.

## Dependencies

### Depends On

- **M01 Foundation** — `User` model (with `shareContact`, `interests`), `Organization`, `Cohort`, `createApiHandler`, Prisma tenant extension, audit extension, RLS pattern
- **`src/lib/preview-cache/`** — generalised from M01 bulk-import preview cache; used for the two-phase bulk operations
- **`src/lib/user/sanitize.ts`** — field-level access control for user data returned by pairing APIs
- **Upstash Redis** (optional) — preview token storage; gracefully degrades to in-memory Map

### Depended By

- **M04 Pulse Journal** — `PulseTrendChart` reused on the Kasuh AdikAsuhCard (`dashboard/kasuh/adik-asuh/[mabaId]`)
- **M09 KP & Kasuh Logbook** — `KPGroup.id` used as foreign key on `KPLogDaily`/`KPLogWeekly`; `KasuhPair.id` used on `KasuhLog`
- **M10 Safeguard** — `KPGroup.id` referenced by `SafeguardIncident` for group-level reporting context
- **M13 Dashboard Multi-Role** — pairing structure used to build role-specific dashboard aggregate widgets
