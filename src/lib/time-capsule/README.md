# M07 — Time Capsule & Personal Life Map

Memungkinkan MABA mencatat refleksi pribadi (Time Capsule) dan menetapkan tujuan hidup SMART (Life Map) selama fase kaderisasi F2, dengan fitur berbagi terkontrol ke Kakak Kasuh dan portfolio terintegrasi.

## Purpose

Modul ini menyediakan ruang digital pribadi bagi setiap MABA untuk mendokumentasikan perjalanan pengembangan diri. Batasannya: hanya data milik MABA sendiri yang dapat diedit; Kasuh hanya dapat membaca bila MABA mengizinkan; SC/Pembina tidak memiliki akses langsung ke konten (hanya aggregate).

Lihat [FEATURES.md](./FEATURES.md) untuk katalog fitur lengkap.

## Architecture Decisions

### Dual-Layer RLS bukan Application-Level Guard

RLS Postgres aktif pada 4 tabel M07 (`time_capsule_entries`, `time_capsule_attachments`, `life_maps`, `life_map_updates`) dengan dua layer:

1. **Org isolation** — `current_setting('app.org_id') = organization_id` memblokir akses lintas organisasi di level database.
2. **KasuhPair EXISTS subquery** — Kasuh hanya dapat SELECT baris dengan `shared_with_kasuh = true` dan ada `KasuhPair` aktif antara Kasuh dan MABA tersebut.

Alasan: Application-level guard saja tidak cukup karena presigned URL dan `prisma.$queryRaw` dapat melewati guard jika tidak teliti. RLS sebagai lapisan kedua adalah safety net deterministik.

### Generic `useAutoSave<T>` bukan Hook Spesifik per Form

`src/lib/auto-save/index.ts` mengekspos satu hook generik yang dapat dipakai di Time Capsule editor maupun form Life Map. Conflict resolution disederhanakan ke last-write-wins (localStorage timestamp vs backend). Draft-conflict-resolver penuh ditunda ke V2.

Alasan: Menghindari duplikasi kode auto-save yang sudah ada di M04. Trade-off: tidak ada three-way merge, tapi cukup untuk use case refleksi pribadi.

### Milestone Timing Tanpa `date-fns-tz` Import Langsung

`src/lib/life-map/milestone-timing.ts` menggunakan `date-fns` biasa (bukan `date-fns-tz`) karena server Next.js berjalan di UTC dan konversi ke Asia/Jakarta hanya relevan untuk display di UI. Window M1/M2/M3 dihitung dari `f2StartDate`/`f2EndDate` yang disimpan sebagai UTC midnight oleh admin.

Alasan: Mengurangi kompleksitas timezone di server. Konsekuensi: bila admin input tanggal tanpa mempertimbangkan UTC offset, window bisa bergeser 7 jam.

### Portfolio Composer dengan 5-Menit Cache dan Promise.all

`getPortfolio()` menjalankan 4 query Prisma secara paralel (`Promise.all`) dan hasilnya di-cache 300 detik. Cache diinvalidasi secara eksplisit dari mutation handlers (share toggle, create entry, goal update).

Alasan: Portfolio adalah aggregasi dari 3 domain data berbeda (TC, LM, Passport). Tanpa cache, setiap render halaman portfolio membutuhkan 3+ round-trip database. Passport section saat ini `null` — placeholder untuk integrasi M05 di versi mendatang.

### Attachment Service Reuse M05 Storage Layer

`src/lib/time-capsule/attachment-service.ts` mengimpor helpers dari `src/lib/storage/` (modul M05) untuk presigned PUT/GET URL. Tidak ada layer storage baru yang ditulis.

Alasan: M05 sudah menyelesaikan MIME validation, object key builder, dan S3 client singleton. Duplikasi tidak perlu.

### Share Gate Dual-Layer: assertCanReadEntry + RLS

Fungsi `assertCanReadEntry()` (application gate) memverifikasi ownership atau Kasuh-pair sebelum query dilakukan. RLS Postgres kemudian memverifikasi ulang pada eksekusi query. Dua pengecekan ini sengaja redundant.

Alasan: `assertCanReadEntry` memberi error message yang dapat dibaca (`ForbiddenError`) sebelum query. RLS mencegah data leak bila ada bug di application layer.

## Patterns & Conventions

### Invalidasi Cache Portfolio

Setiap mutation yang mempengaruhi konten portfolio (create entry, share toggle, goal status change, milestone submit) memanggil `invalidatePortfolio(userId, cohortId)` dari `src/lib/portfolio/cache.ts`. Pattern ini konsisten di semua handler.

### Error Code Custom di API

Selain HTTP status, setiap error domain-specific dikembalikan dengan kode string:

- `EDIT_WINDOW_EXPIRED` — 24h window Time Capsule atau 7d window Milestone terlewat
- `ATTACHMENT_LIMIT_EXCEEDED` — lebih dari 3 lampiran per entry
- `MILESTONE_UPDATE_DUPLICATE` — P2002 Prisma dikonversi ke 409 dengan kode ini
- `MIME_NOT_ALLOWED`, `ATTACHMENT_TOO_LARGE`

### Cron Authentication

Semua cron route (`m07-milestone-reminder`, `m07-orphan-attachment`) menggunakan `verifyCronAuth` dari M15. Tidak ada cron yang dapat dipanggil tanpa header auth yang valid.

## Gotchas

- **F.5 Global Privacy Settings UI belum ada** — API `/api/user/share-settings` (PATCH) tersedia, tetapi halaman `settings/privacy/page.tsx` belum dibuat. Per-entry share toggle berjalan normal.

- **Portfolio Passport section selalu null** — `PortfolioPassportSection` dirender tapi data selalu kosong sampai integrasi M05 selesai. UI sudah ada placeholder.

- **Milestone timing bergantung pada UTC midnight** — `f2StartDate` di database harus diinput sebagai UTC midnight (bukan WIB midnight). Jika admin menginput via UI form yang tidak normalize timezone, window M1/M2/M3 bergeser 7 jam.

- **`useAutoSave` tidak melakukan three-way merge** — Jika pengguna membuka editor di dua tab bersamaan, tab kedua yang save terakhir yang menang. Tidak ada conflict notification antar-tab.

- **Orphan attachment cleanup butuh 7 hari** — Attachment yang di-upload tapi tidak di-confirm (gagal di tengah jalan) baru dihapus oleh cron `m07-orphan-attachment` setelah 7 hari. Selama periode itu, S3 storage dipakai tapi tidak terhubung ke entry manapun.

- **`extendedRetention` field di User belum digunakan** — Field ada di schema dan divalidasi (0–3), tapi retention purge cron (`m07-retention-purge`) belum diimplementasi (Phase H deferred).

## Security Considerations

- **Presigned URL tidak di-log** — `issueDownloadUrl` hanya log metadata (entryId, attachmentId), bukan URL itu sendiri.
- **Share toggle mencatat oldValue/newValue** di audit log — setiap perubahan `sharedWithKasuh` dapat di-trace.
- **Kasuh cross-pair dan cross-org** sama-sama diblokir oleh dua layer: `assertCanReadEntry`/`resolveKasuhForMaba` (application) dan RLS Postgres (database).
- **Markdown render** menggunakan `react-markdown` dengan `remark-gfm`. Raw HTML tidak diizinkan secara default.

## Dependencies

### Depends On

- **M01 Foundation** — `User`, `Organization`, `Cohort`, audit log service, RLS session resolver
- **M03 Struktur Angkatan** — `KasuhPair.status = ACTIVE` untuk share gate dan Kasuh read view
- **M05 Passport Digital** — `src/lib/storage/` untuk presigned S3 URL (reused)
- **M15 Notifications** — `sendNotification()` + 6 template (`LIFE_MAP_MILESTONE_*`, `TIME_CAPSULE_NEW_SHARED`, `LIFE_MAP_UPDATE_SHARED`)

### Depended By

- **M13/M14 Dashboard & Triwulan** — Portfolio data diakses via `getPortfolio()` untuk review triwulan
- Sidebar navigation — Time Capsule, Life Map, Portfolio terdaftar untuk role MABA dan KASUH
