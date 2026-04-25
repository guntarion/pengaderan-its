# Admin — NAWASENA

Administrative control panel for the NAWASENA kaderisasi system.
No top-level `page.tsx` — entry is via direct navigation to subroutes.

See feature catalog: `/src/app/(DashboardLayout)/admin/FEATURES.md`

---

## Subroutes

| Subroute | Purpose | Roles |
|---|---|---|
| `audit-log/` | Immutable event log viewer with pagination and filters | SC, SUPERADMIN |
| `cohorts/` | Angkatan (cohort) CRUD — create, activate, list | SC, SUPERADMIN |
| `cohorts/[id]/` | Edit cohort details | SC, SUPERADMIN |
| `cohorts/new/` | Create new cohort | SC, SUPERADMIN |
| `master/` | Master data hub: taksonomi + kegiatan + seed | SC, SUPERADMIN |
| `master/taksonomi/` | Taksonomi dimension CRUD | SC, SUPERADMIN |
| `master/kegiatan/` | Kegiatan (event type) master CRUD | SC, SUPERADMIN |
| `master/seed/` | Apply or preview master-data seed | SC, SUPERADMIN |
| `notifications/` | Notification system hub | SC, SUPERADMIN |
| `notifications/rules/` | Trigger rules configuration | SC, SUPERADMIN |
| `notifications/templates/` | Message templates per rule/channel | SC, SUPERADMIN |
| `notifications/logs/` | Delivery log viewer | SC, SUPERADMIN |
| `organizations/` | Organisasi CRUD (BEM, unit, faculty) | SC, SUPERADMIN |
| `organizations/new/` | Create organisation | SC, SUPERADMIN |
| `organizations/[id]/` | Edit organisation | SC, SUPERADMIN |
| `pakta/` | Pakta version management | SC, SUPERADMIN, PEMBINA |
| `pakta/new/` | Publish a new pakta version | SC, SUPERADMIN |
| `pakta/[id]/signers/` | View signatory list for a version | SC, SUPERADMIN, PEMBINA |
| `passport/` | Passport digital admin hub | SC, SUPERADMIN, PEMBINA, BLM |
| `passport/overrides/` | Manual item override management | SC, SUPERADMIN |
| `passport/qr-generator/` | Bulk QR code generation | SC, SUPERADMIN, PEMBINA, BLM |
| `passport/skem-export/` | Skem (scheme) data export | SC, SUPERADMIN |
| `struktur/kp-group/` | KP group assignment | SC, SUPERADMIN |
| `struktur/kasuh-pairing/` | KASUH ↔ MABA pairing | SC, SUPERADMIN |
| `struktur/buddy-pairing/` | Buddy pairing | SC, SUPERADMIN |
| `struktur/pairing-requests/` | Pending pairing requests queue | SC, SUPERADMIN |
| `users/` | User list with search, filter, pagination | SC, SUPERADMIN, PEMBINA, BLM, SATGAS, ELDER |
| `users/[id]/` | User detail and role/status editor | SC, SUPERADMIN, PEMBINA |
| `users/bulk-import/` | CSV bulk import for MABA registration | SC, SUPERADMIN |
| `whitelist/` | Email whitelist management | SC, SUPERADMIN |

## Cross-Module Coverage

- **M01** — `pakta/`, `users/` (profile status)
- **M02** — `master/`, `organizations/`
- **M03** — `passport/`
- **M05** — `struktur/`
- **M15** — `notifications/`

## Key Components

- `DynamicBreadcrumb` from `@/components/shared/DynamicBreadcrumb` — all pages
- `DataTable` from `@/components/shared/DataTable` — users, whitelist, audit-log, cohorts
- `FormWrapper` + `FormInput` from `@/components/shared/FormWrapper` — new/edit forms
- `useConfirm` from `@/hooks/useConfirm` — destructive actions
- `toast` from `@/lib/toast` — mutation feedback

## API Dependencies

All mutations call API routes under `src/app/api/admin/` using `createApiHandler` with role
guards matching the table above. Read operations use `withCache` / `invalidateCache` from
`@/lib/cache` where applicable. All mutations are recorded via `auditLog.fromContext()`.
