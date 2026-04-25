# M02 — Master Data & Taksonomi

Module master data NAWASENA: 11 tabel referensi, 12 enum taksonomi, seed CSV idempotent, katalog publik `/kegiatan`, dan halaman referensi dashboard untuk pengader + admin.

## Purpose

M02 menyediakan fondasi konten untuk seluruh sistem kaderisasi. Modul lain (M05 Passport, M06 Event, M08 OC, M09 Logbook, M10 Safeguard, M13 Dashboard) bergantung pada tabel `Kegiatan`, `PassportItem`, `KPIDef`, `ForbiddenAct`, dan `TaxonomyMeta` dari modul ini.

Boundary: M02 hanya mengelola data master (referensi, katalog, taksonomi). Tidak ada data transaksional — data operasional seperti absensi, jurnal, dan insiden ada di modul masing-masing.

## Architecture Decisions

### Hybrid Enum + TaxonomyMeta

Taksonomi primer (`NilaiKey`, `DimensiKey`, `FaseKey`, `KategoriKey`) dinyatakan sebagai Prisma enum — memberikan type safety di seluruh TypeScript codebase. Namun label bilingual (ID + EN) serta deskripsi disimpan di tabel `TaxonomyMeta` sehingga SUPERADMIN dapat mengedit teks tanpa migration.

Konsekuensi: menambah atau menghapus nilai taksonomi tetap membutuhkan migration + code change (intentional — perubahan struktur pedagogis adalah keputusan besar). Hanya wording label yang bisa diedit runtime.

Sync dijaga oleh seed script: validasi bahwa setiap enum value punya baris TaxonomyMeta, dan sebaliknya, TaxonomyMeta dengan key yang tidak dikenal di enum dilaporkan sebagai orphan (warning, bukan error).

### CSV-as-Source-of-Truth untuk Konten

11 CSV di `docs/modul/02-master-data-taksonomi/seed-data/` adalah sumber kebenaran untuk konten kegiatan. Admin UI hanya menyediakan toggle flag minor (`isActive`, `displayOrder`) — edit deskripsi, tujuan, dan KPI dilakukan via PR ke CSV.

Flow update konten:
1. Edit CSV di `seed-data/`
2. PR di-review (konten + kompatibilitas teknis)
3. Merge → jalankan `npm run seed:master-data:apply` di staging
4. Smoke test → apply ke production

Peringatan ditampilkan di admin UI: "Perubahan flag ini akan ditiban saat re-seed berikutnya. Untuk permanent, edit CSV + PR."

### Seed Infrastructure: Idempotent Batch-50 + Advisory Lock

Seed script (`prisma/seed/master-data.ts`) dirancang untuk aman dijalankan berulang:

- **Idempotent**: run kedua menghasilkan `added: 0, updated: 0`.
- **Batch 50**: setiap entitas di-upsert dalam transaksi 50 baris untuk menghindari timeout.
- **Advisory lock**: `pg_try_advisory_lock` mencegah dua proses seed berjalan bersamaan.
- **Preview diff**: `--preview` flag menampilkan diff (added/updated/unchanged/orphan) tanpa menulis.
- **Partial seed**: `--only=kegiatan` untuk seed satu entitas saja.

Urutan upsert wajib dipertahankan karena relasi FK: `TaxonomyMeta → Rubrik → ForbiddenAct → SafeguardProtocol → FormInventory → RolePermission → Kegiatan → Tujuan → KPIDef → AnchorRef → PassportItem`.

### Multi-tenant: `isGlobal` + RLS

`Kegiatan` mendukung dua mode:
- `isGlobal = true, organizationId = NULL` — kegiatan global visible untuk semua organisasi (contoh: INS.01 GERIGI).
- `isGlobal = false, organizationId = <id>` — kegiatan spesifik organisasi (contoh: K1.01 Pakta HMTC).

CHECK constraint di DB: `(isGlobal = true AND organizationId IS NULL) OR (isGlobal = false AND organizationId IS NOT NULL)` — tidak ada state invalid.

RLS policy di tabel `kegiatan`: `USING (is_global = true OR organization_id = current_setting('app.current_org_id')::uuid)`. Public catalog handler secara eksplisit set `app.current_org_id` ke org default dari `TENANT_ORG_CODE`.

Tabel non-kegiatan (`TaxonomyMeta`, `ForbiddenAct`, `SafeguardProtocol`, `Rubrik`, `FormInventory`, `RolePermission`) bersifat global — tidak ada RLS, dibatasi edit via role check di app layer (SUPERADMIN only).

### Dual Cache: ISR Next.js + Redis `withCache`

Katalog publik `/kegiatan` menggunakan dua layer cache:

- **Layer 1 — Next.js ISR**: `export const revalidate = 3600` di server component catalog dan detail. Dipicu revalidate via `revalidatePath('/kegiatan')` setelah admin write.
- **Layer 2 — Redis**: Service functions (`getCatalogKegiatan`, `getKegiatanDetail`, `getTaxonomyMeta`, dll.) di-wrap `withCache(key, TTL, fetcher)` dari `@/lib/cache`.

TTL:
- Catalog list: 3600s (1 jam)
- Detail kegiatan: 3600s
- TaxonomyMeta: 7200s (2 jam)
- Reference tables: 7200s

Invalidation triggers:
- Admin toggle `isActive` → `invalidateDetail(id)` + `invalidateCatalog(orgId)`
- Admin edit TaxonomyMeta → `invalidateTaxonomy()` + `invalidateCatalog()`
- Seed apply → `invalidateAll()`

## Patterns & Conventions

### Cache Keys

```typescript
// src/lib/master-data/cache/keys.ts
MASTER_CACHE_KEYS.kegiatanCatalog(orgCode, filters)  // kegiatan:catalog:{orgCode}:{filterHash}
MASTER_CACHE_KEYS.kegiatanDetail(id)                 // kegiatan:detail:{id}
MASTER_CACHE_KEYS.taxonomyMeta()                     // taxonomy:meta
MASTER_CACHE_KEYS.forbiddenActs()                    // reference:forbidden-acts
```

### Natural IDs

Semua model master menggunakan natural ID (bukan cuid/uuid):
- `Kegiatan.id`: format `K{kategori}.{nomor}` atau `INS.{nomor}`, contoh `K4.05`
- `Tujuan.id`: `T-K4.05-1`
- `KPIDef.id`: `KPI-K4.05-1`
- `PassportItem.id`: `PI-D1-01`
- `ForbiddenAct.id`: `FA-01`
- `SafeguardProtocol.id`: `SG-01`

Natural ID memudahkan debugging dan audit log — nilai bermakna tanpa harus JOIN ke tabel lain.

### Audit Log Entries M02

Selain auto-audit via Prisma extension untuk CRUD model, tiga entry manual:
- `MASTER_DATA_SEED` — seed apply berhasil (actor, counts per entitas, durasi)
- `MASTER_DATA_SEED_FAILED` — seed gagal (error detail)
- Audit action `UPDATE` pada `TaxonomyMeta` dan `Kegiatan.isActive` via Prisma extension

## Gotchas

- **Re-seed meniban manual edit flag**: Admin toggle `isActive = false` akan ditiban saat re-seed bila CSV masih memiliki `is_active=true`. Solusi: edit CSV + PR untuk perubahan permanen. Banner peringatan ada di admin UI.
- **Public catalog butuh explicit org context**: Handler publik (`/api/kegiatan`) wajib set `app.current_org_id` ke org default sebelum query — RLS tidak memberi fallback otomatis. Bila lupa, hanya kegiatan global yang terbaca.
- **Enum tidak bisa diedit runtime**: Tambah/hapus nilai `NilaiKey`, `DimensiKey`, dst. membutuhkan Prisma migration + code change + re-seed TaxonomyMeta. Ini disengaja.
- **Seed urutan upsert**: Urutan entitas saat seed tidak boleh dibalik — `Kegiatan` harus ada sebelum `Tujuan`, `KPIDef`, `AnchorRef`, `PassportItem` karena FK constraint.
- **Advisory lock scope**: Lock di-acquire sebelum upsert dan di-release setelah commit. Bila proses seed crash tanpa release, lock otomatis release saat koneksi DB ditutup (advisory lock non-session).

## Dependencies

### Depends On

- `M01` — Auth, Organization, Cohort, Prisma multi-file schema setup, RLS pattern, audit extension
- `@/lib/cache` — `withCache`, `invalidateCache` untuk Redis layer
- `@/lib/api` — `createApiHandler`, `ApiResponse` untuk semua route
- `csv-parse` — stream CSV parser di seed script

### Depended By

- `M05 Passport` — `PassportItem` model, SKEM fields (`skemPoints`, `skemCategory`)
- `M06 Event Instance` — `Kegiatan` model via `KegiatanInstance` back-relation
- `M08 OC Dashboard` — `Kegiatan` instances + evaluasi
- `M09 KP Logbook` — `KPIDef` via `KPISignal` (M13)
- `M10 Safeguard` — `SafeguardProtocol` sebagai referensi
- `M13 Dashboard` — `KPIDef` via `KPISignal` back-relation

## Security Considerations

- SC hanya boleh toggle kegiatan milik organisasinya sendiri. Kegiatan global (`isGlobal = true`) hanya bisa diubah SUPERADMIN — guard di PATCH route (`403` bila `isGlobal = true` dan bukan SUPERADMIN).
- Seed apply API (`/api/admin/seed/apply`) dibatasi SUPERADMIN + rate limit 1 kali per 5 menit.
- Seed script CLI memanggil audit log `MASTER_DATA_SEED` — operasi ini tercatat untuk keperluan compliance.

## Performance Notes

- 593 rows di-seed dalam < 30 detik pada dev DB (batch-50 + single transaction per batch).
- Katalog publik dengan Redis warm: P95 < 50ms (hanya serialize JSON dari cache).
- Detail page: `generateStaticParams` men-pre-render semua kegiatan aktif saat build — request pertama sudah serve HTML statis.
