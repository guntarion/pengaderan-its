# SUPERADMIN Dashboard Module

**Role**: `SUPERADMIN`  
**Modules**: M11 (Mental Health Screening audit), M12 (Anonymous Channel audit + keyword config)  
**Base path**: `/dashboard/superadmin`

## Purpose

Provides SUPERADMIN with cross-cutting audit and configuration tools that are intentionally
unavailable to other roles. Covers two sensitive areas:
1. **M12 access-log auditor** — who viewed which anon report, when, and what action was taken.
2. **M12 keyword dictionary editor** — configure `severe_keywords` (auto-escalation triggers) and
   `filtered_keywords` (low-quality rejection).
3. **M11 MH audit viewer** — view the mental health referral audit trail with self-auditing
   (the act of viewing the audit log is itself logged as `AUDIT_REVIEW`).

## Route Map

| Route | File | Description |
|---|---|---|
| `/dashboard/superadmin/anon-audit` | `anon-audit/page.tsx` | M12 access log viewer |
| `/dashboard/superadmin/anon-keywords` | `anon-keywords/page.tsx` | M12 keyword dictionary editor |
| `/dashboard/superadmin/mh-audit` | `mh-audit/page.tsx` | M11 mental health audit log viewer |

## Key Components

### anon-audit
- `DataTable` (`@/components/shared/DataTable`) — paginated access log with columns for
  actor, report ID, action type, IP, user agent, and timestamp

### anon-keywords
- Inline textarea editor per keyword group (`severe_keywords`, `filtered_keywords`)
- Parses JSON `{ keywords: string[] }` stored in system config
- `Save` per group; each save calls `POST /api/anon-reports/superadmin/keyword-config`
  and is recorded via `auditLog`

### mh-audit
- `AuditLogViewer` (`@/components/mental-health/AuditLogViewer`) — filterable table
  with action filter including `AUDIT_REVIEW` option
- Backed by `GET /api/mental-health/superadmin/audit-log`

## AUDIT_REVIEW Pattern (Self-Auditing)

When SUPERADMIN queries the MH audit log, the API handler writes a new audit entry with
`action: 'AUDIT_REVIEW'` alongside returning the results. This means:
- The audit log contains records of audits being reviewed.
- `AuditLogViewer` exposes `AUDIT_REVIEW` as a filterable action type.
- The `mh-audit` page displays a notice informing the user that their access is recorded.

This pattern is defined in `src/app/api/mental-health/superadmin/audit-log/route.ts`.

## Keyword Configuration

Two system config keys managed here:

| Key | Effect |
|---|---|
| `severe_keywords` | If a report body contains any of these words, it is auto-escalated to `CRITICAL` severity |
| `filtered_keywords` | Reports matching these words are flagged for low-quality/spam rejection |

All saves are audited via `auditLog.record()` (M01 audit trail).

See also:
- [src/lib/anon-report/README.md](../../../../lib/anon-report/README.md)
- [src/lib/mh-screening/README.md](../../../../lib/mh-screening/README.md)

## Dependencies

| Library | Purpose |
|---|---|
| `@/lib/logger` (`createLogger`) | Structured logging |
| `@/lib/toast` | Toast notifications |
| `@/services/audit-log.service` | `auditLog.record()` for keyword saves |
| `@/components/mental-health/AuditLogViewer` | Reusable audit table with filter |

## Related Modules

- BLM triage generates access logs viewable here: [blm/README.md](../blm/README.md)
- Satgas actions generate access logs viewable here: [satgas/README.md](../satgas/README.md)
- SAC decrypt events generate MH audit entries viewable here: [sac/README.md](../sac/README.md)
