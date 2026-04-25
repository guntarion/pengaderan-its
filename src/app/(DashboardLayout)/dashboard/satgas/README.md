# Satgas Dashboard Module

**Role**: `SATGAS` (Satuan Tugas Perlindungan / Safeguarding Officer)  
**Modules**: M10 (Safeguard & Insiden), M12 (Anonymous Channel — escalated cases)  
**Base path**: `/dashboard/satgas`

## Purpose

Satgas officers handle two parallel workstreams:
1. **Safeguard incidents** (M10) — managed from `/dashboard/safeguard/` (separate module with incident creation, consequences, and status management).
2. **Escalated anonymous reports** (M12) — received here after BLM escalates a report via `ESCALATED_TO_SATGAS` status.

This module covers workstream 2 only.

## Route Map

| Route | File | Description |
|---|---|---|
| `/dashboard/satgas` | `page.tsx` | Overview dashboard with KPI widgets and quick links |
| `/dashboard/satgas/escalated-reports` | `escalated-reports/page.tsx` | Queue of reports escalated from BLM |
| `/dashboard/satgas/escalated-reports/[reportId]` | `escalated-reports/[reportId]/page.tsx` | Report detail with Satgas-specific action bar |

## Key Components

- `DataTable` (`@/components/shared/DataTable`) — sortable escalated report list
- `SeverityBadge` (`@/components/anon-report/SeverityBadge`) — severity indicator
- `KPIMini`, `WidgetErrorBoundary` (`@/components/dashboard/widgets/`) — dashboard KPI strip
- `useConfirm` (`@/hooks/useConfirm`) — confirmation before resolve
- `DynamicBreadcrumb` (`@/components/shared/DynamicBreadcrumb`)
- `SkeletonCard` (`@/components/shared/skeletons`)

## Escalation Receipt Flow

1. BLM triggers `/api/anon-reports/[id]/escalate` — sets `satgasEscalated = true`, status → `ESCALATED_TO_SATGAS`.
2. Satgas list page fetches all anon reports and client-filters to `status === ESCALATED_TO_SATGAS`.
3. Satgas officer opens the detail page — a `recordAnonAccess(READ)` entry is written inside the fetch transaction.
4. Satgas can add private notes (Satgas-scoped, not visible to BLM or reporter) and resolve the report.

## Deduplication

Client-side: the list page explicitly filters the API response to `ESCALATED_TO_SATGAS` status only, preventing double-display of reports that may also appear in BLM's own queue at different statuses.

## Actions Available (Report Detail)

| Action | API endpoint | Guard |
|---|---|---|
| Add Satgas note | `POST /api/anon-reports/[id]/notes` | Note must be non-empty |
| Resolve | `POST /api/anon-reports/[id]/resolve` | `useConfirm` dialog; disabled after `RESOLVED` |

## Audit Trail

Every read and mutation calls `recordAnonAccess()` from `src/lib/anon-report/access-log.ts`
within the same DB transaction. The access log is surfaced only in SUPERADMIN's
`/dashboard/superadmin/anon-audit` view.

See also: [src/lib/anon-report/README.md](../../../../../lib/anon-report/README.md)

## Dependencies

| Library | Purpose |
|---|---|
| `@/lib/logger` (`createLogger`) | Structured logging |
| `@/lib/toast` | `toast.apiError()` and success toasts |
| `@/lib/anon-report/access-log` | Mandatory `recordAnonAccess()` on every access |
| `@prisma/client` | `AnonSeverity`, `AnonStatus`, `AnonCategory` enums |

## Related Modules

- BLM performs initial triage before escalating: [blm/README.md](../blm/README.md)
- SUPERADMIN audits access logs: [superadmin/README.md](../superadmin/README.md)
- M10 safeguard incidents: `/dashboard/safeguard/`
