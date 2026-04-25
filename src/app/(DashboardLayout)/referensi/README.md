# Referensi — Katalog Acuan NAWASENA (M02)

Hub halaman referensi read-only yang menyajikan data master dan dokumen acuan pengaderan.
Semua halaman bersifat server component async; tidak ada operasi tulis.

See feature catalog: `/src/app/(DashboardLayout)/referensi/FEATURES.md`

---

## Subroutes

| Path | Judul | Sumber Data |
|---|---|---|
| `referensi/` | Hub — daftar tautan semua katalog | — |
| `referensi/taksonomi/` | Taksonomi | `GET /api/referensi/taksonomi` |
| `referensi/rubrik/` | Rubrik AAC&U | `getRubrikList()` (service) |
| `referensi/safeguard/` | Safeguard Protocol | `GET /api/referensi/safeguard` |
| `referensi/forbidden-acts/` | Forbidden Acts | `GET /api/referensi/forbidden-acts` |
| `referensi/form-inventory/` | Inventori Form | `GET /api/referensi/form-inventory` |

## Halaman Hub (`page.tsx`)

Menampilkan kartu navigasi ke setiap katalog dan bagian referensi lainnya.
Menggunakan metadata `title: 'Referensi — NAWASENA'`.

## Taksonomi (`taksonomi/page.tsx`)

Daftar dimensi taksonomi yang digunakan sebagai kerangka penilaian dalam program kaderisasi.
Data berasal dari tabel master yang dikelola di `admin/master/taksonomi/`.

## Rubrik AAC&U (`rubrik/page.tsx`)

Rubrik penilaian berbasis AAC&U (Association of American Colleges & Universities).
Data dikelompokkan per `rubrikKey` → `rubrikLabel`, masing-masing menampilkan 4 level kecakapan.
Komponen: `RubrikCard` (internal).

## Safeguard Protocol (`safeguard/page.tsx`)

Dokumen protokol safeguard pengaderan — ketentuan perlindungan peserta.
Read-only; konten diambil dari master data yang dikelola admin.

## Forbidden Acts (`forbidden-acts/page.tsx`)

Daftar tindakan yang dilarang selama proses pengaderan, dikelompokkan per kategori.
Digunakan sebagai acuan oleh semua peran.

## Form Inventory (`form-inventory/page.tsx`)

Inventori seluruh formulir resmi yang digunakan dalam program, beserta tautan atau deskripsi.

## Key Components & Dependencies

- `DynamicBreadcrumb` dari `@/components/shared/DynamicBreadcrumb` (setiap halaman)
- `createLogger` dari `@/lib/logger` jika ada data fetching
- Schema: `nawasena_master.prisma` (taksonomi, rubrik, safeguard, forbidden acts)

## Roles

Dapat diakses oleh semua pengguna yang sudah terautentikasi. Tidak ada pembatasan peran.
Tidak ada operasi tulis di seluruh subroute referensi.
