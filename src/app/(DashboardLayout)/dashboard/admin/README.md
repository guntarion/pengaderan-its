# M11 + M13 — Admin Dashboard

## Ringkasan

Seksi `/dashboard/admin/` adalah area khusus Administrator dalam layout
DashboardLayout. Berbeda dengan `/admin/` (top-level foundation untuk manajemen
sistem), seksi ini hanya menyajikan widget analitik berbasis data kaderisasi yang
memerlukan akses administrator — terutama tampilan agregat Mental Health dari
modul M11.

## Struktur Route

```
/dashboard/admin/mental-health/aggregate            → Agregat hasil screening MH per cohort & fase
/dashboard/admin/mental-health/aggregate/transition → Matriks transisi risk-level antar fase
```

## Halaman Agregat Mental Health

### Tujuan
Memungkinkan Administrator melihat distribusi tingkat risiko mental health (low /
moderate / high / very-high) di seluruh angkatan tanpa mengekspos data individual.
Proteksi privasi diterapkan dengan **cell-floor server-side**: sel dengan nilai < 5
ditampilkan sebagai `"<5"` sehingga tidak memungkinkan identifikasi peserta.

### Komponen Utama

| Komponen | Sumber | Fungsi |
|---|---|---|
| `AggregateChart` | `@/components/mental-health/AggregateChart` | Bar chart distribusi risk-level per phase |
| `DynamicBreadcrumb` | `@/components/shared/DynamicBreadcrumb` | Navigasi kontekstual |
| `SkeletonCard` | `@/components/shared/skeletons` | Loading state |

### Filter
Pengguna memilih `cohortId` (angkatan) dan `phase` (`F1` / `F2` / dst.) lalu
memicu fetch. Data tidak di-auto-load saat halaman dibuka.

### Ekspor CSV
Tombol "Export CSV" memicu `GET /api/mental-health/aggregate/export` dengan
parameter yang sama, mengunduh file langsung dari browser.

## Halaman Transisi Risk-Level

### Tujuan
Menampilkan matriks transisi: berapa peserta yang berpindah risk-level antar
dua fase pemeriksaan berturut-turut. Berguna untuk evaluasi efektivitas intervensi.

### Komponen Utama

| Komponen | Sumber | Fungsi |
|---|---|---|
| `TransitionChart` | `@/components/mental-health/TransitionChart` | Matriks transisi risk-level |

## API Endpoints

- `GET /api/mental-health/aggregate?cohortId=&phase=` — data agregat (cell-floor diterapkan server-side)
- `GET /api/mental-health/aggregate/export?cohortId=&phase=` — unduh CSV
- `GET /api/mental-health/transition?cohortId=` — matriks transisi

## Dependensi Library

- `@/lib/toast` — notifikasi error fetch
- `@/components/mental-health/AggregateChart` — tipe `AggregateRow`
- `@/components/mental-health/TransitionChart` — tipe `TransitionRow`

Catatan: Akses ke `/dashboard/admin/` dijaga oleh `createApiHandler({ roles: ['admin'] })`
pada setiap endpoint. Ini bukan `/admin/` (foundation) yang mengelola seed & konfigurasi sistem.
