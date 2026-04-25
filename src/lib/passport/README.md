# M05 — Passport Digital

Modul pengelolaan bukti kegiatan (passport) MABA selama program Nawasena. MABA mengumpulkan evidence untuk 57 item passport yang terorganisir dalam beberapa dimensi; verifier (KP/KASUH) mereview dan mengapprove; SC memantau progress kohort dan mengekspor data ke SKEM ITS.

## Purpose

Menggantikan passport fisik dengan sistem digital. Memastikan setiap MABA memenuhi syarat kehadiran dan partisipasi kegiatan melalui alur submit–verify–escalate yang tercatat dengan baik. Menyediakan pipeline ekspor ke Sistem SKEM ITS (borang poin kegiatan).

## Architecture Decisions

### Multi-Evidence-Type Submit Dispatcher

Lima tipe bukti ditangani oleh `SubmitFormDispatcher` yang mendelegasikan ke komponen khusus:

| Tipe | Komponen | Mekanisme |
|------|----------|-----------|
| PHOTO | PhotoEvidenceSubmit | Kompres client-side (browser-image-compression) → presigned PUT S3 → confirm API |
| FILE | FileEvidenceSubmit | MIME validation server-side (file-type lib) → presigned PUT → confirm |
| SIGNATURE | SignatureEvidenceSubmit | Verifier picker autocomplete → evidenceUrl = null (QR route) |
| LOGBOOK | LogbookEvidenceSubmit | Link ke entri M04 journal; stub jika M04 belum live |
| QR | QrEvidenceSubmit | BarcodeDetector native + @zxing fallback → `POST /api/passport/qr-validate` → auto-VERIFIED |

Tipe QR adalah satu-satunya yang langsung menghasilkan status VERIFIED tanpa antrian verifier.

### Shared QR HMAC Signing (`src/lib/qr/signing.ts`)

Didesain reusable lintas modul. Payload format: `{module}|{itemId}|{sessionId}|{expiresAt}`, ditandatangani HMAC-SHA256 dengan `PASSPORT_QR_SECRET`. Field `module` (enum `QrModule`: `passport` | `attendance`) mencegah forgery lintas modul — scan QR M08 tidak bisa dipakai untuk M05 dan sebaliknya. M08 mengimpor dan mereuse `signing.ts` tanpa duplikasi kode.

### Verifier Idempotency via Redis

`POST /api/verifier/[entryId]/approve` dan `reject` menggunakan Redis key `passport:verify-idempo:{verifierId}:{entryId}` dengan TTL 1 jam. Jika dua verifier mengklik approve secara bersamaan, hanya satu yang berhasil di-commit; yang kedua mendapat 409. Pattern ini mencegah double-approval tanpa memerlukan database-level locking.

### Progress Cache (Two-Tier TTL)

- Per-MABA: `withCache(CACHE_KEYS.all('passport-progress-{userId}'), 60s, fetchFn)` — cukup cepat untuk UI responsif
- Cohort aggregate (SC dashboard): TTL 5 menit — query berat, tidak perlu real-time
- Invalidasi setelah submit/verify/cancel dilakukan via `invalidateCache(CACHE_KEYS.pattern('passport-progress-{userId}'))`

### SC Cohort Aggregate + Escalation Cron

`GET /api/admin/passport/aggregate` mengembalikan stacked-bar per dimensi + daftar "stuck MABA" (belum submit dimensi X > 14 hari) + "silent verifier" (queue > 5 items). Escalation cron (`POST /api/cron/m05-escalation`, nightly 03:00 WIB via `vercel.json`) menggunakan `verifyCronAuth` dari M15 dan Redis lock `passport:escalating:{entryId}` TTL 5 menit untuk idempotency.

### SKEM CSV Export with SHA256 Checksum

`skem-export.service.ts` menghasilkan CSV streaming (Node.js stream) dengan kolom mapping dari `skem-config.ts`. Setiap generate dicatat di `PassportSkemExportLog` dengan field `csvChecksumSha256` (SHA256 dari bytes CSV) dan `filterJson` (parameter query saat export). Ini memungkinkan verifikasi integritas saat trial upload ke SIM SKEM ITS.

## Patterns & Conventions

### Resubmit Chain

`PassportEntry.previousEntryId` membentuk linked-list riwayat submit. Komponen `ResubmitHistoryChain` merender timeline dari entry pertama ke entry terkini. Saat MABA resubmit setelah REJECTED, entry baru dibuat dengan `previousEntryId` = ID entry yang di-reject.

### Partial Unique Index

```sql
CREATE UNIQUE INDEX passport_entry_unique_pending
ON passport_entries (user_id, item_id)
WHERE status = 'PENDING';
```

Memastikan MABA tidak bisa punya lebih dari satu entri PENDING per item, tanpa memblokir histori REJECTED/CANCELLED/VERIFIED.

### RLS Organization Isolation

Semua 4 tabel M05 menggunakan `ENABLE ROW LEVEL SECURITY`. Policy menggunakan `current_setting('app.current_org_id', true)` yang di-set oleh session resolver sebelum setiap query. SC hanya bisa melihat data dari kohort dalam organisasinya.

### S3 Object Key Format

`src/lib/storage/object-key.ts` menghasilkan path: `{orgId}/passport/{userId}/{itemId}/{cuid()}.{ext}`. Tidak ada public read — semua akses melalui presigned GET URL TTL 15 menit.

## Gotchas

- **`EvidenceType` enum bukan di `nawasena_passport.prisma`** — didefinisikan di `nawasena_master.prisma` bersama `PassportItem`. Pastikan import Prisma client sudah di-generate setelah perubahan master schema.
- **QR scan di iOS Safari** — `BarcodeDetector` API belum didukung Safari. `QrEvidenceSubmit` mendeteksi ini dan lazy-load `@zxing/library` sebagai fallback. Jangan hapus branch fallback.
- **Presigned URL TTL 15 menit** — jika MABA membuka form tapi tidak langsung submit, URL bisa expired. `PhotoEvidenceSubmit` meminta ulang URL fresh saat submit jika sudah > 10 menit sejak URL diambil.
- **Redis graceful degradation** — `progress-cache.ts` menggunakan `withCache` yang sudah handle Redis unavailable dengan fallback ke direct DB query. Jangan bypass ini dengan implementasi cache manual.
- **`PASSPORT_QR_SECRET` wajib di production** — jika env var tidak di-set, `signing.ts` akan throw saat startup. Pastikan ada di deployment environment sebelum go-live.
- **M15 notification templates belum di-seed** — `PASSPORT_SUBMIT_TO_VERIFIER`, `PASSPORT_VERIFIED_TO_MABA`, `PASSPORT_REJECTED_TO_MABA`, dan `PASSPORT_ESCALATION` perlu di-seed ke tabel M15 template sebelum notifikasi berjalan. Cron escalation tidak akan throw error jika template belum ada, tapi notif tidak terkirim.

## Dependencies

### Depends On

- `M01 Foundation` — User, Organization, Cohort, session resolver, RLS helper, audit log
- `M02 Master Data` — `PassportItem` (57 entries + SKEM fields), `EvidenceType` enum
- `M03 Struktur Angkatan` — KPGroup + KPGroupMember untuk resolusi target escalation
- `M04 Pulse Journal` — LogbookEvidenceSubmit link ke entri jurnal (stub OK jika M04 belum live)
- `M15 Notifications` — `sendNotification` helper + `verifyCronAuth` untuk cron authentication
- `src/lib/storage/` — S3/Spaces presigned URLs (dikembangkan di Phase B, dipakai oleh M07 juga)
- `src/lib/qr/signing.ts` — shared dengan M08

### Depended By

- `M07 Time Capsule` — mengimpor `src/lib/storage/` untuk attachment service
- `M08 OC Execution` — mengimpor `src/lib/qr/signing.ts` untuk attendance QR
- `M10 Safeguard` — passport cascade feature-flagged (konsekuensi pedagogis bisa memblokir progress)

## Security Considerations

- Semua S3 object private (no public ACL); akses hanya via presigned GET URL
- MIME validation server-side menggunakan `file-type` (magic bytes), bukan hanya extension
- HMAC signature QR mengandung `expiresAt` sehingga replay attack dibatasi waktu
- SC tidak bisa mengakses foto evidence MABA lain organisasi karena RLS
- Override oleh SC dicatat di `PassportEntry.overriddenByUserId` + `overriddenReason` + audit log `PASSPORT_OVERRIDE`
- `EvidenceScanStatus` pada `PassportEvidenceUpload` untuk antrian scan malware/mime-mismatch asinkhron

## Performance Notes

- Verifier queue polling setiap 30 detik via SWR (bukan WebSocket) dengan Redis cache 15s — mengurangi load DB
- SKEM CSV export menggunakan Node.js stream — tidak buffer seluruh CSV di memory, aman untuk 200+ MABA
- Cohort aggregate cache 5 menit cukup untuk SC dashboard; acceptable staleness

## Testing Notes

Phase H (E2E + unit tests) di-defer ke post-MVP. Item yang sudah terimplementasi:
- `npm run check` PASS (zero TS errors) setelah setiap phase
- Logic kritis yang perlu di-cover saat Phase H dilakukan: `qr-hmac.test.ts` (crypto boundary), `submit.service.test.ts` (idempotency key), `progress.service.test.ts` (cache invalidation), `escalation.service.test.ts` (idempotency Redis lock)
