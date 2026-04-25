# BLM Dashboard Module

**Role**: `BLM` (Badan Legislatif Mahasiswa)  
**Modules**: M12 (Anonymous Channel triage) + M14 (Triwulan legislative review)  
**Base path**: `/dashboard/blm`

## Purpose

Provides BLM officers with two primary workstreams:
1. Triage and action anonymous incident reports from the M12 anonymous channel.
2. Conduct legislative audit (audit substansi) of cohort triwulan reviews submitted by SC and signed off by Pembina.

## Route Map

| Route | File | Description |
|---|---|---|
| `/dashboard/blm` | `page.tsx` | Overview dashboard with KPI widgets |
| `/dashboard/blm/anon-reports` | `anon-reports/page.tsx` | Triage queue — all anon reports visible to BLM |
| `/dashboard/blm/anon-reports/[reportId]` | `anon-reports/[reportId]/page.tsx` | Report detail with action bar |
| `/dashboard/blm/triwulan` | `triwulan/page.tsx` | Triwulan reviews awaiting BLM audit |
| `/dashboard/blm/triwulan/[reviewId]/audit-substansi` | `triwulan/[reviewId]/audit-substansi/page.tsx` | Audit substansi checklist + narrative |

## Key Components

- `DynamicBreadcrumb` — contextual breadcrumb navigation
- `DataTable` (`@/components/shared/DataTable`) — sortable/filterable report list with `AnonSeverity`/`AnonStatus` columns
- `SeverityBadge` (`@/components/anon-report/SeverityBadge`) — color-coded severity indicator
- `ReviewSummaryCard` (`@/components/triwulan/ReviewSummaryCard`) — card per cohort review
- `ReviewStatusBadge`, `EscalationFlagBanner` (`@/components/triwulan/`) — status + escalation state
- `AuditSubstansiChecklist`, `NarrativeEditor`, `RevisionReasonDialog` (`@/components/triwulan/`) — legislative audit form
- `KPIMini`, `ComplianceIndicator`, `WidgetErrorBoundary` (`@/components/dashboard/widgets/`) — dashboard overview widgets
- `useConfirm` (`@/hooks/useConfirm`) — confirmation dialogs for destructive actions (acknowledge, escalate)
- `SkeletonCard` (`@/components/shared/skeletons`) — loading state

## Action Bar (Report Detail)

Actions gated by current `AnonStatus`:
- **Acknowledge** — marks report `IN_REVIEW`, associates BLM officer's account
- **Escalate to Satgas** — sets `satgasEscalated = true`, transitions to `ESCALATED_TO_SATGAS`
- **Add Note** — appends BLM-scoped note via `/api/anon-reports/[id]/notes`
- **Resolve** — closes report with resolution notes

## RLS & Mandatory Audit

Every API call that reads or mutates an anon report invokes `recordAnonAccess()` from
`src/lib/anon-report/access-log.ts` **inside the same database transaction**.
This is enforced by a code comment: "MANDATORY — do not remove."
The resulting access log is viewable only by SUPERADMIN (`/dashboard/superadmin/anon-audit`).

See also: [src/lib/anon-report/README.md](../../../../../lib/anon-report/README.md)

## Dependencies

| Library | Purpose |
|---|---|
| `@/lib/logger` (`createLogger`) | Structured logging — all pages use child loggers |
| `@/lib/toast` | Toast notifications including `toast.apiError()` |
| `@/lib/anon-report/access-log` | `recordAnonAccess()` — RLS audit trail |
| `@/services/audit-log.service` | General CRUD audit via `auditLog.fromContext()` |
| `@prisma/client` | `AnonSeverity`, `AnonStatus`, `AnonCategory`, `ReviewStatus`, `TriwulanEscalationLevel` enums |

## Related Modules

- Satgas receives reports escalated here: [satgas/README.md](../satgas/README.md)
- SUPERADMIN audits access logs: [superadmin/README.md](../superadmin/README.md)
- SC submits triwulan reviews consumed here: `/dashboard/sc/triwulan/`
