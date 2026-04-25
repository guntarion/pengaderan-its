# M14 — Triwulan Archive Viewer

## Ringkasan

Seksi `/dashboard/triwulan/` menyediakan akses baca terhadap arsip review
triwulan yang sudah difinalisasi. Berbeda dari `/dashboard/sc/triwulan/` (SC
dapat membuat & mengedit) atau `/dashboard/pembina/triwulan/` (Pembina dapat
menandatangani), halaman ini hanya untuk menelusuri dokumen historis.

## Struktur Route

```
/dashboard/triwulan/archive              → Daftar semua review terarsip
/dashboard/triwulan/archive/[reviewId]   → Detail lengkap review terarsip
```

## Siapa yang Mengakses

Halaman arsip dapat diakses oleh berbagai role (sesuai konfigurasi sidebar) yang
perlu melihat rekam jejak program kaderisasi tanpa kemampuan mutasi data.
Contoh: ELDER, BLM (pasca audit), ALUMNI, PEMBINA untuk referensi.

## Komponen Halaman Daftar (`archive/page.tsx`)

| Komponen | Sumber | Fungsi |
|---|---|---|
| `ReviewStatusBadge` | `@/components/triwulan/ReviewStatusBadge` | Badge status review |
| `PDFDownloadButton` | `@/components/triwulan/PDFDownloadButton` | Unduh PDF review |
| `DynamicBreadcrumb` | `@/components/shared/DynamicBreadcrumb` | Navigasi kontekstual |
| `SkeletonCard` | `@/components/shared/skeletons` | Loading state |

Daftar memuat field: angkatan, kuartal, status, level eskalasi, tautan ke detail,
dan tombol unduh PDF.

## Komponen Halaman Detail (`archive/[reviewId]/page.tsx`)

| Komponen | Fungsi |
|---|---|
| `SnapshotKPITable` | Tabel KPI snapshot periode |
| `SnapshotKirkpatrickSection` | Rekapitulasi evaluasi 4-level |
| `SnapshotIncidentSummary` | Insiden yang tercatat dalam kuartal |
| `AuditSubstansiChecklist` | Daftar 10 muatan wajib hasil audit BLM |
| `EscalationFlagBanner` | Banner eskalasi kritis (read-only) |
| `SignatureChainTimeline` | Timeline tanda tangan SC → Pembina → BLM |
| `PDFDownloadButton` | Unduh PDF final |

Tidak ada tombol aksi mutasi data (submit, sign, revisi) pada halaman ini.

## API Endpoints

- `GET /api/triwulan/archive` — daftar semua review terarsip
- `GET /api/triwulan/[reviewId]` — detail review (shared dengan SC & Pembina)
- `GET /api/triwulan/[reviewId]/pdf` — unduh PDF

## Dependensi Library

- `@/lib/logger` — `createLogger('m14/archive/list')`, `createLogger('m14/archive/detail')`
- `@/lib/toast` — notifikasi error fetch
- `@prisma/client` — enum `ReviewStatus`, `PDFStatus`, `TriwulanEscalationLevel`,
  `EscalationRuleKey`, `MuatanCoverageStatus`

Lihat juga: `src/app/(DashboardLayout)/dashboard/sc/triwulan/README.md` untuk
arsitektur state machine dan alur lengkap M14.
