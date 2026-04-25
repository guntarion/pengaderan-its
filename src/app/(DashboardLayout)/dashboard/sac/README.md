# SAC Dashboard Module

**Role**: `SC` with `isSACCounselor = true` (Student Affairs Counselor)  
**Module**: M11 (Mental Health Screening)  
**Base path**: `/dashboard/sac`

## Purpose

Provides SAC counselors with a case management interface for mental health screening referrals.
Cases are automatically assigned via round-robin at referral creation time. The queue surfaces
RED-priority (high-urgency) cases prominently.

## Route Map

| Route | File | Description |
|---|---|---|
| `/dashboard/sac/screening-queue` | `screening-queue/page.tsx` | Assigned case queue |
| `/dashboard/sac/screening-queue/[id]` | `screening-queue/[id]/page.tsx` | Case detail with decrypt-on-demand |
| `/dashboard/sac/screening-queue/[id]/follow-up` | `screening-queue/[id]/follow-up/page.tsx` | Add follow-up note + update status |

## Key Components

- `SACQueueTable` (`@/components/mental-health/SACQueueTable`) — full queue table with priority
  color-coding; accepts `SACReferralItem[]`
- `SACCaseDetail` (`@/components/mental-health/SACCaseDetail`) — case detail view with
  decrypt-on-demand flow; accepts `SACReferralDetail`
- `SACFollowUpForm` (`@/components/mental-health/SACFollowUpForm`) — follow-up note form
  with status update
- `DynamicBreadcrumb`, `SkeletonCard` — shared layout components

## Round-Robin Assignment

New referrals are assigned via `assignSACRoundRobin()` in `src/lib/mh-screening/referral.ts`.
The function selects the SAC counselor with the fewest `PENDING`/`IN_PROGRESS` referrals
using `SELECT FOR UPDATE SKIP LOCKED` to prevent race conditions under concurrent submissions.

## Decrypt-on-Demand Pattern

Screening answers are stored encrypted. In `SACCaseDetail`:
1. The page loads the referral metadata without decrypted answers.
2. "Decrypt & View Answers" button triggers `useConfirm` with an audit warning dialog.
3. On confirmation, `POST /api/mental-health/referrals/[id]/decrypt` is called.
4. The API writes an audit entry **before** returning the decrypted payload.
5. Decrypted answers are rendered client-side only for the current session.

## Hourly Escalation Cron

`/api/cron/m11-escalation` (external trigger) — escalates unacknowledged RED-priority referrals
to the Poli Psikologi coordinator (`isPoliPsikologiCoord = true`) when they exceed the SLA
threshold. The coordinator can then reassign via `/api/mental-health/referrals/[id]/reassign`.

## Reassign

Both the assigned SAC counselor and the Poli Psikologi coordinator may call
`POST /api/mental-health/referrals/[id]/reassign` to transfer a case.

## M10 Cross-Reference

From the case detail page, SAC can note a connection to a safeguard incident (M10) by
referencing the incident ID. The cross-reference is stored as metadata in the referral record.

## RLS Helpers

`src/lib/mh-screening/rls-helpers.ts` sets PostgreSQL session-level RLS variables per
request:
- `app.is_poli_psikologi_coordinator = 'true'` — grants coordinator-level visibility
- Default scope: SAC counselor sees only their own assigned referrals

See also: [src/lib/mh-screening/README.md](../../../../../lib/mh-screening/README.md)

## Dependencies

| Library | Purpose |
|---|---|
| `@/lib/logger` | Structured logging |
| `@/lib/toast` | Toast notifications |
| `@/lib/mh-screening/referral` | `assignSACRoundRobin()`, referral creation |
| `@/lib/mh-screening/rls-helpers` | PostgreSQL RLS session variables |
| `@/services/audit-log.service` | Audit before decrypt |

## Related Modules

- SUPERADMIN audits SAC access logs: [superadmin/README.md](../superadmin/README.md)
- M10 safeguard cross-refer: `/dashboard/safeguard/`
