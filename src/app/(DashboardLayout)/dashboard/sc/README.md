# M13 + M14 — SC (Steering Committee) Dashboard

## Ringkasan

Halaman landing utama untuk role `SC` di sistem NAWASENA. Menggabungkan agregat
lintas angkatan dari modul M03 (struktur), M05 (passport & event), M11 (mental
health), M13 (dashboard multi-role), dan M14 (triwulan sign-off).

## Struktur Route

```
/dashboard/sc                      → SC landing (agregat cohort-wide)
/dashboard/sc/triwulan             → Daftar review triwulan aktif
/dashboard/sc/triwulan/new         → Buat review triwulan baru (generate snapshot)
/dashboard/sc/triwulan/[reviewId]  → Detail review: narasi, KPI, sign-off
```

Dokumentasi penuh sub-route triwulan ada di
`src/app/(DashboardLayout)/dashboard/sc/triwulan/README.md`.

## Komponen Utama (`page.tsx`)

| Komponen | Sumber | Fungsi |
|---|---|---|
| `KirkpatrickSnapshot` | `@/components/dashboard/widgets/KirkpatrickSnapshot` | Ringkasan evaluasi pelatihan (4 level Kirkpatrick) |
| `MoodCard` | `@/components/dashboard/widgets/MoodCard` | Indikator mood live angkatan |
| `AlertsPanel` | `@/components/dashboard/widgets/AlertsPanel` | Peringatan eskalasi & threshold |
| `ComplianceIndicator` | `@/components/dashboard/widgets/ComplianceIndicator` | Tingkat kepatuhan (pakta, passport, jurnal) |
| `WidgetErrorBoundary` | `@/components/dashboard/widgets/WidgetErrorBoundary` | Isolasi error per widget |
| `DynamicBreadcrumb` | `@/components/shared/DynamicBreadcrumb` | Navigasi kontekstual |
| `SkeletonCard` | `@/components/shared/skeletons` | Loading state |

## API Endpoints

- `GET /api/dashboard/sc` — payload utama (`SCDashboardPayload`)
- `GET /api/dashboard/sc/mood-live` — polling mood real-time (interval ~30 s)

## Dependensi Library

- `@/lib/logger` — `createLogger('m13/dashboard/sc')`, logger kontekstual
- `@/lib/toast` — notifikasi error fetch
- `@/types/dashboard` — tipe `SCDashboardPayload`

Lihat juga: `src/app/(DashboardLayout)/dashboard/sc/triwulan/README.md`
