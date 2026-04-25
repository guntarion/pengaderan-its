# M01 — Foundation: Auth, Cohort, Pakta

Foundation module for Nawasena. Establishes multi-tenant organization/cohort structure, NextAuth authentication with whitelist and SUPERADMIN bootstrap, JWT tenant claims, Pakta digital signing flow, bulk CSV user import, and a Prisma audit extension that auto-captures CRUD events.

## Purpose

Every other module (`M02`–`M14`) builds on top of this one. It defines the canonical `User`, `Organization`, `Cohort`, and `PaktaSignature` models, enforces row-level security at the PostgreSQL layer, and wires up the RBAC middleware that gates all dashboard routes.

## Architecture Decisions

### Multi-File Prisma Schema with Raw-SQL RLS

Schema is split across `prisma/schema/` (one file per domain: `nawasena_auth.prisma`, `nawasena_pakta.prisma`, `nawasena_audit.prisma`, `nawasena_base.prisma`). Prisma ≥ 5.15 multi-file support is required.

Row-level security is defined as raw SQL appended to the migration file (`20260424000000_nawasena_foundation/migration.sql`) rather than in Prisma schema DSL, because Prisma has no native RLS primitives. Policies use a `set_config('app.current_org_id', ...)` pattern via `src/lib/tenant/rls-session.ts` before each query.

A `DO $$ BEGIN CREATE ROLE app_user NOLOGIN; ... END $$` block in the same migration grants `SELECT/INSERT/UPDATE/DELETE` only to `app_user`, ensuring RLS is enforced for all application queries.

Partial unique indexes (not expressible in Prisma) are also raw SQL: `WHERE "isActive" = true` on `Cohort`, `WHERE status = 'PUBLISHED'` on `PaktaVersion`, `WHERE status = 'ACTIVE'` on `PaktaSignature`.

### NextAuth with Whitelist + SUPERADMIN Bootstrap

Authentication supports Google OAuth and credentials. Email allowance is determined by two paths:

1. Domain allowlist (`@its.ac.id`) — auto-allowed as `MABA` unless preassigned role exists in `WhitelistEmail`.
2. `WhitelistEmail` table — arbitrary email with optional `preassignedRole` and `cohortId`.

SUPERADMIN bootstrap: emails listed in `SUPERADMIN_EMAILS` (`src/lib/auth/callbacks.ts`) bypass the whitelist gate entirely and are force-assigned `UserRole.SUPERADMIN` on every `signIn` callback, which self-heals downgraded rows.

### JWT Tenant Claims

The `jwt` callback (not the `session` callback) is the canonical location for tenant resolution. On first sign-in, it upserts the `User` row and injects: `userId`, `organizationId`, `role`, `cohortId`, `sessionEpoch`, `paktaDigitalStatus`, `paktaEtikStatus`. Subsequent requests re-use cached JWT claims; `iat`-based refresh triggers a DB re-read every 5 minutes.

`sessionEpoch` (an integer on `User`) enables forced re-login: incrementing it in the DB (e.g., on role change) causes `src/lib/auth/session-revoke.ts` to reject the next JWT check and redirect to sign-in.

### AsyncLocalStorage Tenant Context

`src/lib/tenant/context.ts` wraps Node's `AsyncLocalStorage` to propagate `{ orgId, userId, role }` through the request call tree without prop-drilling. API handlers call `runWithTenant(claims, fn)`. Downstream services read via `getTenantContext()`. The Prisma `$executeRaw` RLS setter (`setRlsContext`) is called here before each transactional block.

The `withCrossOrgAccess` helper in `src/lib/tenant/superadmin-bypass.ts` is the only sanctioned escape hatch: requires `SUPERADMIN` role, a `reason` string ≥ 20 characters, and writes a `SUPERADMIN_CROSS_ORG_ACCESS` audit entry before executing the callback.

### Pakta Digital Flow

Four-step flow enforced client-side (middleware redirects users with `PENDING_PAKTA` status):

1. **Reader + scroll gate** — `PaktaReader.tsx` uses `IntersectionObserver` on a sentinel at the bottom of the markdown content. Checkbox form is disabled until sentinel is visible.
2. **3-checkbox confirm** — `PaktaCheckboxConfirm.tsx`. All three must be checked before the "Lanjut" button activates.
3. **5-question quiz** — `PaktaQuiz.tsx`. Passing score is configurable per `PaktaVersion` (default 80%). On failure, correct answers are shown and the user is directed back to re-read.
4. **Sign / Reject** — `sign` API creates a `PaktaSignature` record with captured IP + UA and updates `User.paktaDigitalStatus = SIGNED` in a single transaction. `reject` API creates a `PaktaRejection` and escalates to SC.

**Versioning**: when SC publishes a new `PaktaVersion`, `src/lib/pakta/versioning.ts:triggerResignForAllSigners` sets all active signatures for the old version to `SUPERSEDED` and updates every affected user's pakta status back to `PENDING_PAKTA`, forcing them through the flow again on next login.

### Bulk CSV Import (Preview → Redis → Commit)

Three-phase import to avoid partial writes and give operators a safe preview:

1. **Preview** (`POST /api/admin/users/bulk-import/preview`) — parses CSV with `papaparse`, validates with Zod per row plus cross-row dedup on email and NRP. Stores validated payload in Redis with a SHA-256 file hash as the key (TTL 10 minutes). Returns a summary + up to 10 sample rows. Falls back to in-memory cache when Redis is unavailable.
2. **Operator review** — `BulkImportPreviewTable.tsx` shows per-row decision dropdowns (CREATE / UPDATE / SKIP) with error highlighting.
3. **Commit** (`POST /api/admin/users/bulk-import/commit`) — fetches payload from Redis (one-time consume, prevents replay). Runs `prisma.$transaction` chunked at 50 rows. Writes a single `USER_BULK_IMPORT` audit log entry with counts. Suspend flag `ctx.suspendAudit` disables the per-row Prisma audit extension during the transaction to avoid N audit entries.

### Prisma Audit Extension

`src/lib/audit/prisma-audit-extension.ts` uses `$extends.query` to intercept `create` operations on audited models and writes a corresponding `NawasenaAuditLog` row. `update` and `delete` interception is deferred (best-effort approach). The extension is imported selectively; bulk import suspends it via a request-scoped flag.

## Patterns & Conventions

### Role Change Must Increment sessionEpoch

Any handler that changes `User.role` must also call `incrementSessionEpoch(userId)` (or include it in the same transaction). This is the contract that ensures the existing JWT is invalidated within one request cycle.

### RLS Context Must Be Set Before Queries

All service functions that touch RLS-protected tables must call `setRlsContext(prisma, { orgId, userId })` before the first query. Failure to do so will cause the query to return zero rows silently (not throw), because the default policy denies access.

### Pakta Type Routing

The `[type]` path segment in `/pakta/sign/[type]/` maps to `PaktaType` enum values: `DIGITAL` (MABA) and `ETIK` (staff/panitia). Each type has its own `PaktaVersion` lineage and its own status field on `User` (`paktaDigitalStatus`, `paktaEtikStatus`).

## Gotchas

- **`Button variant="outline"` on colored backgrounds** — shadcn/ui applies `bg-background` (white) by default. On gradient hero sections, white text becomes invisible. Always add `bg-transparent` to the className.
- **RLS silent empty result** — If `set_config('app.current_org_id', ...)` is not called before a query on an RLS-protected table, the policy evaluates to `false` and the query returns empty rather than throwing. Debugging becomes difficult; always verify `setRlsContext` is in the call path.
- **`sessionEpoch` mismatch window** — There is a brief window (up to JWT expiry, typically 5 minutes) during which a demoted user still has a valid JWT. `session-revoke.ts` checks epoch on every JWT verification, so the window is bounded by the refresh interval configured in `jwt.maxAge`.
- **Whitelist `isConsumed` flag** — `WhitelistEmail.isConsumed` is set to `true` when the user first signs in with that email. It is NOT a hard block; the sign-in callback uses it only for logging. The intent is to track onboarding completion, not prevent re-use.
- **Pakta quiz `passingScore` is per-version** — changing the passing score requires publishing a new `PaktaVersion`, which triggers re-sign for all existing signers.

## Dependencies

### Depends On

- `src/lib/api` — `createApiHandler`, `ApiResponse` patterns used in all API routes
- `src/lib/logger` — `createLogger` used throughout; zero `console.log`
- `src/lib/cache` — Redis preview cache for bulk import, `withCache` for Org/PaktaVersion reads
- `src/services/audit-log.service` — manual audit entries (login, logout, role change, bulk import)

### Depended By

All modules (M02–M14) depend on this module for:
- `User`, `Organization`, `Cohort` models
- `createApiHandler` auth/role checking (which reads JWT claims from this module)
- `NawasenaAuditLog` for their own audit entries
- RBAC middleware routing (their routes are registered in `src/lib/rbac.ts`)

---

See also: [FEATURES.md](./FEATURES.md) for the product-facing feature catalogue.
