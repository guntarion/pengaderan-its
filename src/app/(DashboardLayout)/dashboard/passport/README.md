# Passport Digital — Module Architecture

**Module:** M05 — Passport Digital
**Route Group:** `(DashboardLayout)/dashboard/passport`
**Status:** Phase A-G Complete

---

## Overview

The Passport Digital module is a multi-dimensional achievement tracking system for MABA (new students) during the onboarding program. It allows MABA to submit evidence for 57 passport items across 11 dimensions, with a verifier queue, admin oversight, QR-based auto-verification, and SKEM export integration.

---

## Directory Structure

```
src/
├── app/
│   ├── (DashboardLayout)/
│   │   ├── dashboard/passport/
│   │   │   ├── page.tsx                   — Passport dashboard (progress + dimension grid)
│   │   │   └── [itemId]/
│   │   │       ├── page.tsx               — Item detail + entry status + CTA
│   │   │       └── submit/
│   │   │           └── page.tsx           — Evidence submission (dispatches to type form)
│   │   ├── dashboard/verifier/
│   │   │   ├── queue/page.tsx             — Verifier review queue
│   │   │   └── [entryId]/review/
│   │   │       └── page.tsx              — Per-entry review panel
│   │   └── admin/passport/
│   │       ├── page.tsx                   — SC cohort dashboard
│   │       ├── qr-generator/page.tsx      — QR session management
│   │       ├── skem-export/page.tsx       — CSV export for SIM SKEM ITS
│   │       └── overrides/page.tsx         — SC override entries
│   └── api/
│       ├── passport/
│       │   ├── submit/route.ts            — POST: create entry
│       │   ├── progress/route.ts          — GET: cached progress
│       │   ├── qr-validate/route.ts       — POST: validate QR scan
│       │   ├── upload-url/route.ts        — POST: get presigned S3 PUT URL
│       │   ├── items/route.ts             — GET: list items + entry status
│       │   ├── items/[itemId]/route.ts    — GET: item detail + current entry
│       │   └── [entryId]/
│       │       ├── route.ts               — GET: entry detail + signed URLs
│       │       └── cancel/route.ts        — POST: self-cancel
│       ├── verifier/
│       │   ├── queue/route.ts             — GET: pending queue (cached 15s)
│       │   ├── [entryId]/approve/route.ts — POST: approve
│       │   └── [entryId]/reject/route.ts  — POST: reject with reason
│       ├── admin/passport/
│       │   ├── aggregate/route.ts         — GET: cohort aggregate + stuck/silent
│       │   ├── qr-session/route.ts        — POST/GET: create/list QR sessions
│       │   ├── qr-session/[id]/route.ts   — DELETE: revoke QR session
│       │   ├── skem-export/route.ts       — GET: preview/stream SKEM CSV
│       │   └── override/[entryId]/route.ts — POST: force status change
│       └── cron/
│           ├── m05-escalation/route.ts    — POST: nightly escalation
│           └── m05-retention-purge/route.ts — POST: monthly purge stub
├── components/
│   ├── passport/
│   │   ├── StatusBadge.tsx               — Color-coded status pill
│   │   ├── ProgressOverviewCard.tsx      — SVG progress ring + stats
│   │   ├── StackedBarPerDimension.tsx    — Recharts stacked bar
│   │   ├── DimensionCardGrid.tsx         — 11-card grid with progress bars
│   │   ├── DimensionDetailList.tsx       — Item list for a single dimension
│   │   ├── SubmitFormDispatcher.tsx      — Routes to type-specific form
│   │   ├── PhotoEvidenceSubmit.tsx       — Camera + compress + S3 upload
│   │   ├── SignatureEvidenceSubmit.tsx   — Verifier selector + notes
│   │   ├── FileEvidenceSubmit.tsx        — PDF/JPG/PNG file upload
│   │   ├── QrEvidenceSubmit.tsx          — BarcodeDetector + @zxing fallback
│   │   ├── LogbookEvidenceSubmit.tsx     — M04 stub (coming soon)
│   │   ├── EvidenceViewer.tsx            — Image/PDF viewer with URL refresh
│   │   └── ResubmitHistoryChain.tsx      — Previous attempt history
│   ├── verifier/
│   │   ├── QueueTable.tsx                — DataTable for verifier queue
│   │   ├── QueueBadgeCount.tsx           — Polling badge (30s interval)
│   │   ├── ReviewPanel.tsx               — Evidence viewer + approve/reject
│   │   └── RejectReasonModal.tsx         — Rejection reason (min 10 chars)
│   ├── admin-passport/
│   │   ├── QrGeneratorForm.tsx           — QR session create + print/download
│   │   ├── CohortAggregateCard.tsx       — Stacked bar + stats
│   │   ├── StuckMabaList.tsx             — MABA with no activity
│   │   ├── SilentVerifierList.tsx        — Verifiers with large queues
│   │   ├── SkemExportPreview.tsx         — Preview table + CSV download
│   │   └── OverrideForm.tsx              — SC forced status change
│   └── shared/
│       └── EvidenceTypeBadge.tsx         — Styled badge for evidence type
└── lib/
    └── passport/
        ├── progress.service.ts           — computeProgress + getProgress + aggregateForCohort
        ├── progress-cache.ts             — Redis helpers (TTL 60s progress, 5min aggregate)
        ├── submit.service.ts             — submitPassportEntry + cancelPassportEntry
        ├── qr-hmac.ts                    — HMAC-SHA256 wrapper (module: 'passport')
        ├── qr-session.service.ts         — createQrSession + revokeQrSession + validateQrSession
        ├── verifier.service.ts           — listQueue + approve + reject + override
        ├── skem-config.ts                — SKEM CSV column mapping
        ├── skem-export.service.ts        — generatePreview + generateSkemCsv (stream)
        └── escalation.service.ts         — runEscalationCron + resolveEscalationTarget
```

---

## Data Flow

### Maba Submit Flow
1. Maba opens `/dashboard/passport` → sees progress ring + dimension cards
2. Clicks dimension card → filters to dimension items
3. Clicks "Ajukan" on an item → `/dashboard/passport/{itemId}/submit`
4. `SubmitFormDispatcher` routes to the correct evidence form based on `evidenceType`
5. Evidence form uploads file to S3 (via presigned URL) then POSTs to `/api/passport/submit`
6. Entry created in DB, progress cache invalidated, verifier notified via M15

### Verifier Flow
1. Verifier sees badge count via `QueueBadgeCount` (polling 30s)
2. Opens `/dashboard/verifier/queue` → `QueueTable` renders PENDING entries
3. Clicks "Review" → `/dashboard/verifier/{entryId}/review`
4. `ReviewPanel` shows evidence + approve/reject buttons (keyboard: A/R)
5. On approve: idempotency check → VERIFIED → notify MABA
6. On reject: `RejectReasonModal` (min 10 chars) → REJECTED → notify MABA

### QR Auto-Verification Flow
1. SC creates QR session at `/admin/passport/qr-generator`
2. `QrGeneratorForm` generates HMAC-signed URL + renders QR image for printing
3. MABA scans QR with `QrEvidenceSubmit` → `validateQrSession` → auto-VERIFIED
4. Session tracks scan count, expires by TTL

### Escalation Flow
1. Nightly cron at 03:00 WIB triggers `runEscalationCron`
2. Queries PENDING entries older than 7 days
3. Acquires Redis lock per entry (idempotency)
4. Resolves target: KASUH → KP coordinator, KP/DOSEN_WALI → first SC
5. Updates `escalatedToUserId`, sends M15 notification

---

## Key Dependencies

| Dependency | Purpose |
|---|---|
| `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` | S3/Spaces presigned URLs |
| `browser-image-compression` | Client-side photo compression before upload |
| `@zxing/library` | QR scanner fallback for Safari/Firefox |
| `qrcode` | Server/client-side QR image generation |
| `file-type` | Server-side MIME type validation |
| `recharts` | Stacked bar chart for progress visualization |
| M15 `sendNotification` | All notifications (submit, approve, reject, escalation) |
| M03 `KPGroupMember` | Verifier resolution + escalation target lookup |

---

## Caching Strategy

| Cache Key | TTL | Invalidation Trigger |
|---|---|---|
| `passport:progress:{userId}` | 60s | Submit, cancel, approve, reject, override |
| `passport:aggregate:{cohortId}:{hash}` | 5 min | Timer only |
| `passport:verify-queue:{verifierId}` | 15s | Timer only (polling) |
| `passport:verify-idempo:{key}` | 1h | Never (idempotency guard) |
| `passport:escalating:{entryId}` | 5 min | Auto-expire (lock) |

---

## Security

- **RLS**: All 4 passport tables have Row-Level Security via `current_org_id` context
- **Signed URLs**: Evidence files accessed only via 15-minute presigned S3 URLs
- **HMAC**: QR codes signed with HMAC-SHA256 using `PASSPORT_QR_SECRET`
- **Audit trail**: All mutations recorded in `NawasenaAuditLog` (13 action types)
- **CSRF**: All mutations use session-based auth via `createApiHandler`
- **Idempotency**: Verifier actions protected by Redis TTL key
