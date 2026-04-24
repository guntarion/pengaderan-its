# M14 — Triwulan Review, Sign-off & Audit

## Ringkasan Arsitektur

Modul M14 mengimplementasikan siklus akuntabilitas kaderisasi triwulanan penuh: dari *generate* snapshot data, pengeditan narasi SC, tanda tangan Pembina, audit substansi BLM, ekspor PDF, hingga pengarsipan. Modul ini menutup loop governance NAWASENA.

## Alur Status Review (State Machine)

```
DRAFT
  └─ SC edit narasi + submit
       ↓ SUBMIT_TO_PEMBINA
SUBMITTED_FOR_PEMBINA
  ├─ Pembina tanda tangan → PEMBINA_SIGNED
  └─ Pembina minta revisi → [superseded] + DRAFT baru
PEMBINA_SIGNED
  ├─ BLM audit substansi (10 muatan wajib) → BLM_ACKNOWLEDGED
  └─ BLM minta revisi   → [superseded] + DRAFT baru
BLM_ACKNOWLEDGED
  └─ (otomatis/cron) FINALIZE → FINALIZED
```

Transisi diatur di `src/lib/triwulan/state-machine/transitions.ts` — fungsi murni tanpa efek samping.

## Struktur File

```
src/
├── app/
│   ├── (DashboardLayout)/dashboard/
│   │   ├── sc/triwulan/           # SC: list, generate, detail+edit
│   │   ├── pembina/triwulan/      # Pembina: list, detail+sign
│   │   ├── blm/triwulan/          # BLM: list, audit substansi
│   │   └── triwulan/archive/      # Semua peran: arsip read-only
│   └── api/
│       ├── triwulan/
│       │   ├── generate/          # POST — SC/SUPERADMIN generate review
│       │   ├── list/              # GET  — role-filtered list
│       │   ├── archive/           # GET  — finalized reviews
│       │   └── [id]/
│       │       ├── route.ts       # GET detail
│       │       ├── edit-draft/    # PATCH narasi SC
│       │       ├── submit/        # POST submit ke Pembina
│       │       ├── pembina-sign/  # POST tanda tangan
│       │       ├── pembina-request-revision/
│       │       ├── blm-audit-item/ # GET+PATCH muatan wajib
│       │       ├── blm-acknowledge/
│       │       ├── blm-request-revision/
│       │       └── pdf/           # GET presigned URL + POST regenerate
│       └── cron/
│           ├── triwulan-overdue-reminder/  # Harian 09:00 WIB
│           └── triwulan-retention-purge/   # Bulanan 1 tiap bulan
├── lib/triwulan/
│   ├── generator/                 # 10 sub-generator + orchestrator
│   │   ├── index.ts               # Orchestrator + idempotency
│   │   ├── kpi-snapshot.ts
│   │   ├── kirkpatrick-snapshot.ts
│   │   ├── redflag-snapshot.ts
│   │   ├── incident-snapshot.ts
│   │   ├── anon-snapshot.ts
│   │   ├── pakta-snapshot.ts
│   │   ├── compliance-snapshot.ts
│   │   ├── cohort-health-snapshot.ts
│   │   ├── forbidden-acts-snapshot.ts
│   │   └── cohort-comparison.ts
│   ├── state-machine/
│   │   └── transitions.ts         # Transisi + guard functions (pure)
│   ├── audit-substansi/
│   │   ├── service.ts             # upsertAuditItem, acknowledgeByBLM, etc.
│   │   └── muatan-wajib.ts        # 10-item MUATAN_WAJIB_CATALOG
│   ├── escalation/
│   │   ├── rules.ts               # 6 aturan eskalasi + parseThresholds
│   │   ├── detector.ts            # detectEscalations(snapshot, orgSettings)
│   │   └── notifier.ts            # Trigger M15 pada URGENT/WARNING
│   ├── pdf/
│   │   ├── renderer.tsx           # @react-pdf/renderer — 7 halaman
│   │   ├── chart-generator.ts     # SVG path generator (no browser deps)
│   │   ├── upload.ts              # S3/DO Spaces upload + presigned URL
│   │   └── job-queue.ts           # Fire-and-forget + retry 3x backoff
│   ├── archive/
│   │   └── service.ts             # listArchivedReviews (withCache LONG TTL)
│   ├── signature/
│   │   └── ip-hasher.ts
│   ├── sc-service.ts              # list, updateDraftNarrative, submitToPembina
│   └── pembina-service.ts         # pembinaSign, requestRevision
└── components/triwulan/
    ├── ReviewSummaryCard.tsx
    ├── ReviewStatusBadge.tsx
    ├── EscalationFlagBanner.tsx
    ├── NarrativeEditor.tsx        # Auto-save 3s debounce, min 200 chars
    ├── SnapshotKPITable.tsx
    ├── SnapshotKirkpatrickSection.tsx
    ├── SnapshotIncidentSummary.tsx
    ├── SignatureChainTimeline.tsx
    ├── SignConfirmDialog.tsx       # URGENT flow: checkbox + notes >= 200
    ├── RevisionReasonDialog.tsx
    ├── AuditSubstansiChecklist.tsx
    ├── AuditSubstansiCard.tsx     # Auto-save 10s debounce per item
    ├── AuditProgressBar.tsx
    └── PDFDownloadButton.tsx      # Polling pdfStatus setiap 5s
```

## Komponen Kunci

### Generator Orchestrator (`generator/index.ts`)
- Menjalankan 10 sub-generator secara paralel dengan timeout 5s masing-masing
- Sumber data yang gagal masuk ke `missingSources[]` → `dataPartial: true`
- Idempotent: jika review non-superseded sudah ada untuk cohort+quarter yang sama, kembalikan yang sudah ada
- Setelah snapshot terkumpul, memanggil `detectEscalations()` untuk menentukan level eskalasi
- Membuat row `TriwulanReview` + `TriwulanSignatureEvent` GENERATE dalam satu transaksi

### State Machine (`state-machine/transitions.ts`)
- Fungsi murni: `transition(status, action)`, `canSubmit()`, `canPembinaSign()`, `canBLMAcknowledge()`
- URGENT validation: `escalationLevel === 'URGENT'` memerlukan `inPersonReviewed = true` + notes ≥ 200 chars
- Revision actions (PEMBINA_REQUEST_REVISION, BLM_REQUEST_REVISION) tidak mengubah status review lama — membuat review baru dengan `previousReviewId` dan menandai yang lama dengan `supersededByReviewId`

### Escalation Engine (`escalation/`)
- 6 aturan: RETENTION_LOW, FORBIDDEN_ACTS_VIOLATION, INCIDENTS_RED_UNRESOLVED, ANON_HARASSMENT_PRESENT, PAKTA_SIGNING_LOW, NPS_NEGATIVE
- Threshold dapat di-override per org via `Organization.settings.triwulanEscalationThresholds`
- Level URGENT (jika ada satu rule URGENT yang terpicu) > WARNING > NONE

### PDF Render Pipeline (`pdf/`)
- `acknowledgeByBLM()` → `enqueuePDFRender(reviewId)` (fire-and-forget)
- Job queue: in-memory `processingSet` untuk mencegah duplikasi per process
- Retry 3x dengan backoff eksponensial (5s, 10s, 20s)
- Pada kegagalan final: update `pdfStatus = FAILED` + kirim notifikasi M15 ke SC + SUPERADMIN
- Chart generator menghasilkan SVG path murni (tidak memerlukan canvas/browser API)
- Dependensi circular antara `job-queue.ts` dan `audit-substansi/service.ts` diselesaikan dengan lazy injection: `setPDFQueueFunction(fn)`

### Audit Substansi (`audit-substansi/`)
- 10 muatan wajib hardcoded di `muatan-wajib.ts` (MUATAN_WAJIB_CATALOG)
- `upsertAuditItem`: coverage NOT_COVERED atau PARTIAL wajib menyertakan notes ≥ 50 chars
- `acknowledgeByBLM`: semua 10 item harus memiliki coverage ≠ NOT_ASSESSED
- Auto-save UI dengan debounce 10s per item (bukan optimistic — menunggu server response)

### Caching
- Archive list: `withCache(CACHE_KEYS.all('triwulan-archive-{orgId}'), CACHE_TTL.LONG, fn)`
- Archive detail: `withCache(CACHE_KEYS.byId('triwulan-review', id), CACHE_TTL.LONG, fn)`

### Cron Jobs
| Route | Jadwal | Fungsi |
|-------|--------|--------|
| `/api/cron/triwulan-overdue-reminder` | Harian 09:00 WIB | 3-hari: OPS reminder; 14-hari: CRITICAL |
| `/api/cron/triwulan-retention-purge` | Bulanan 1 tiap bulan | Hapus review + S3 PDF ≥ 5 tahun (dry-run default) |

## Database Schema

Model utama di `prisma/schema/nawasena_triwulan.prisma`:
- `TriwulanReview` — baris utama review; `dataSnapshotJsonb` menyimpan seluruh snapshot
- `TriwulanSignatureEvent` — append-only audit trail; REVOKE UPDATE/DELETE di level DB
- `AuditSubstansiResult` — 10 baris per review (upsert); unique constraint `(reviewId, itemKey)`

RLS aktif pada ketiga tabel (row-level security berdasarkan `organizationId`).

## Security

- `TriwulanSignatureEvent` dilindungi `REVOKE UPDATE, DELETE FROM app_role` di level database — tidak dapat diubah bahkan oleh application code
- Partial unique index: `(cohortId, quarterNumber) WHERE supersededByReviewId IS NULL` memastikan satu review aktif per cohort per quarter
- Semua API route menggunakan `createApiHandler` dengan `roles` terbatas

## Panduan Roles

| Halaman | Role yang diizinkan |
|---------|---------------------|
| Generate + edit + submit | SC, SUPERADMIN |
| Tanda tangan + minta revisi | PEMBINA, SUPERADMIN |
| Audit substansi + acknowledge | BLM, SUPERADMIN |
| Arsip (read-only) | SC, PEMBINA, BLM, SUPERADMIN |
