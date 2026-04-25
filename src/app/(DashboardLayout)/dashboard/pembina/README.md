# M13 + M14 — Pembina Dashboard

## Ringkasan

Halaman landing untuk role `PEMBINA`. Menyediakan gambaran kondisi program
kaderisasi dari sudut pandang pembina/dosen serta akses ke antrian review
triwulan yang membutuhkan tanda tangan.

## Struktur Route

```
/dashboard/pembina                         → Pembina landing (widget agregat)
/dashboard/pembina/triwulan                → Daftar review menunggu tanda tangan
/dashboard/pembina/triwulan/[reviewId]/sign → Halaman tanda tangan / minta revisi
```

## Alur Sign-off Triwulan (M14)

SC membuat dan men-submit review → status berubah ke `SUBMITTED_FOR_PEMBINA` →
Pembina menerima notifikasi → membuka halaman `/sign` → memilih:

- **Tanda Tangan** (`SignConfirmDialog`) → status menjadi `PEMBINA_SIGNED`, review
  diteruskan ke BLM untuk audit substansi.
- **Minta Revisi** (`RevisionReasonDialog`) → review lama di-supersede, SC
  menerima draft baru untuk diperbaiki.

## Komponen Utama

### Landing Page (`page.tsx`)

| Komponen | Sumber | Fungsi |
|---|---|---|
| `KirkpatrickSnapshot` | `@/components/dashboard/widgets/KirkpatrickSnapshot` | Ringkasan evaluasi pelatihan |
| `ComplianceIndicator` | `@/components/dashboard/widgets/ComplianceIndicator` | Tingkat kepatuhan angkatan |
| `AlertsPanel` | `@/components/dashboard/widgets/AlertsPanel` | Peringatan & escalation flag |
| `WidgetErrorBoundary` | `@/components/dashboard/widgets/WidgetErrorBoundary` | Isolasi error per widget |

### Halaman Sign (`triwulan/[reviewId]/sign/page.tsx`)

| Komponen | Fungsi |
|---|---|
| `SnapshotKPITable` | Tabel KPI snapshot angkatan |
| `SnapshotKirkpatrickSection` | Data 4-level evaluasi |
| `SnapshotIncidentSummary` | Ringkasan insiden dalam periode |
| `NarrativeEditor` | Tampilan narasi SC (read-only bagi Pembina) |
| `EscalationFlagBanner` | Banner peringatan eskalasi kritis |
| `SignatureChainTimeline` | Urutan tanda tangan yang sudah/belum selesai |
| `SignConfirmDialog` | Dialog konfirmasi tanda tangan |
| `RevisionReasonDialog` | Dialog pengisian alasan permintaan revisi |

## API Endpoints

- `GET /api/dashboard/pembina` — payload landing (`PembinaDashboardPayload`)
- `GET /api/triwulan/list` — daftar review (dibatasi scope Pembina)
- `GET /api/triwulan/[reviewId]` — detail review
- `POST /api/triwulan/[reviewId]/sign` — tanda tangan
- `POST /api/triwulan/[reviewId]/request-revision` — minta revisi

## Dependensi Library

- `@/lib/logger` — `createLogger('m13/dashboard/pembina')`, `createLogger('m14/pembina/triwulan/...')`
- `@/lib/toast` — notifikasi berhasil/gagal
- `@/types/dashboard` — `PembinaDashboardPayload`
- `@prisma/client` — enum `ReviewStatus`, `TriwulanEscalationLevel`, `EscalationRuleKey`
