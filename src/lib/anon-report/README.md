# M12 — Anonymous Channel

Saluran pelaporan anonim untuk Maba/publik yang ingin melaporkan insiden bullying, harassment, atau ketidakadilan dalam lingkungan kaderisasi ITS tanpa mengekspos identitas pelapor sama sekali.

See [FEATURES.md](./FEATURES.md) for the full feature catalogue.

## Purpose

Menyediakan jalur pelaporan terlindungi di mana pelapor tidak pernah teridentifikasi — bahkan oleh operator sistem — sementara BLM/Satgas/SUPERADMIN tetap dapat menindaklanjuti, meng-eskalasi, dan menutup laporan dengan audit trail penuh. Modul ini adalah privacy-critical: pelanggaran anonimitas = rollback immediate + 72-jam incident response per UU PDP.

## Architecture Decisions

### Zero-Identity Schema

`AnonReport` tidak memiliki kolom `userId`, `email`, `phone`, `reporterName`, `ip`, `userAgent`, atau `fingerprint`. Ini bukan konvensi — ini CI invariant yang di-enforce oleh `anonymity-assertions.test.ts` menggunakan Prisma DMMF. Setiap PR yang menambahkan kolom tersebut akan gagal CI.

Alternatif yang ditolak: soft-link ke user session (walaupun opsional) — risiko correlation attack terlalu tinggi.

### `createPublicAnonHandler` Terpisah dari `createApiHandler`

Endpoint publik (submit, presign, status lookup) menggunakan wrapper khusus `createPublicAnonHandler` yang secara eksplisit **tidak** membaca session cookie, **tidak** memeriksa CSRF, dan **tidak** mengekstrak identitas pengguna. Ini dipisah dari `createApiHandler` untuk mencegah penambahan "kemudahan" yang secara tidak sengaja membocorkan sesi ke handler anonim.

`createApiHandler` tetap digunakan untuk endpoint terproteksi BLM/Satgas/SUPERADMIN.

### Fingerprint SHA-256 Hanya untuk Rate Limit

`computeFingerprint(req)` menghasilkan hash SHA-256 dari `IP | UA | YYYY-MM-DD | salt`. Hash ini **hanya** digunakan untuk memeriksa Redis rate limit — tidak pernah disimpan ke database, tidak pernah di-log. Rotasi harian memastikan window tracking maksimal 24 jam. Salt dirotasi tahunan (`ANON_FINGERPRINT_SALT`).

### RLS dengan `setBypassRls` untuk Path Sempit

Semua query `AnonReport` yang terproteksi wajib memanggil `setAnonSessionVars(tx, user)` di dalam transaksi untuk mengaktifkan RLS berbasis peran. Dua path pengecualian yang sempit menggunakan `setBypassRls(tx)`:
1. Public submit (INSERT tanpa sesi)
2. Public status tracker (SELECT narrowly oleh `trackingCode`)

SC role secara eksplisit **diblokir** dari endpoint detail (hanya summary aggregate yang diizinkan).

### Audit Log Mandatory via `recordAnonAccess`

Setiap operasi protected (READ, UPDATE, STATUS_CHANGE, ESCALATE, DOWNLOAD_ATTACHMENT, BULK_DELETE) wajib memanggil `recordAnonAccess(tx, actor, reportId, action)` **di dalam transaksi yang sama**. Jika INSERT audit log gagal, transaksi seluruhnya rollback — operasi tidak terjadi tanpa audit trail.

Enforcement berlapis: ESLint custom rule (masa depan) + komentar MANDATORY di setiap file route.

### Escalation dengan 10s Timeout + Nodemailer Fallback

`escalateToSatgas()` mencoba mengirim notifikasi CRITICAL ke Satgas via M15 `sendNotification` dengan timeout 10 detik. Jika timeout atau error, `directDispatchSatgas()` mengirim langsung via nodemailer SMTP. Ini mencegah single point of failure pada M15. Counter `getFallbackDispatchCount()` tersedia untuk monitoring.

Payload notifikasi hanya berisi: `trackingCode`, `category`, `severity`, `cohortName`, `severityReason` — tidak ada body text atau lampiran.

### Aggregate dengan Cell Floor 3

`aggregateAnonReports()` menyembunyikan sel dengan count < 3 (masked: true, count: null) untuk mencegah de-identifikasi pada kohort kecil. SC hanya dapat melihat aggregate ini — tidak ada drill-down ke laporan individual.

Cache TTL 300 detik via `withCache` (Redis/in-memory graceful degradation).

### Severity Classifier Pure TypeScript

`classifySeverity()` adalah pure function (no I/O) yang mengklasifikasikan severity berdasarkan:
1. Keyword matching terhadap `DEFAULT_SEVERE_KEYWORDS` (atau daftar custom dari DB)
2. Category floor: HARASSMENT minimum YELLOW
3. Auto-escalate flag: RED atau HARASSMENT → true

Tidak ada ML/AI — klasifikasi deterministik yang mudah di-audit. BLM dapat override severity post-submission (dicatat di access log).

### Tracking Code Entropy Murni

`generateTrackingCode()` menggunakan `crypto.randomBytes` dengan rejection sampling unbiased. Format `NW-[A-Z0-9]{8}` memberikan ruang 2.8 triliun. Kode **tidak derivable** dari timestamp, userId, atau metadata request apapun. Uniqueness di-enforce via DB unique constraint + retry.

## Patterns & Conventions

### Zod Schema `.strict()` untuk Anti-PII

Semua Zod schema yang menerima input dari pelapor publik menggunakan `.strict()` — unknown fields ditolak, bukan di-strip secara diam-diam. Ini mencegah field identifying (email, phone, name) tersimpan jika klien mengirimnya secara tidak sengaja.

### `createAnonRedactingLogger` Wajib di Semua Handler Publik

Handler publik dan lib terkait menggunakan `createAnonRedactingLogger(baseLogger)` yang wrap logger standar dengan denylist redaction. Field sensitif (bodyText, ip, userAgent, trackingCode, fingerprint, captchaToken) di-replace dengan `[REDACTED]` di semua output log, termasuk nested objects.

Jangan gunakan `createLogger` langsung di path kode yang menangani data laporan.

### Status Response Schema Allowlist

`statusResponseSchema` di `schemas.ts` mendefinisikan **hanya** 7 field yang boleh dikembalikan ke public status tracker. Menambah field baru ke respons publik memerlukan review 2 reviewer karena potensi information leakage.

## Gotchas

- **Jangan tambah field ke `AnonReport` tanpa CI review** — `anonymity-assertions.test.ts` akan gagal, tapi lebih penting: setiap field baru berpotensi menjadi correlation vector.

- **`setBypassRls` hanya di path yang sangat sempit** — hanya 2 use case sah: public INSERT dan public status SELECT. Jika ingin tambah use case baru, diskusikan terlebih dahulu.

- **`recordAnonAccess` wajib di dalam transaksi** — jangan panggil di luar `prisma.$transaction`. Jika dipanggil di luar, dan terjadi error setelah operasi tetapi sebelum audit, operasi terjadi tanpa tercatat.

- **Captcha production keys** — `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET`, `HCAPTCHA_SITE_KEY`, `HCAPTCHA_SECRET` harus dikonfigurasi di Vault sebelum go-live. Tanpa ini, captcha verification di-bypass secara diam-diam di dev mode.

- **S3 bucket `anon-reports` bersifat ops task** — bucket harus di-setup secara manual (private ACL, server-side encryption, lifecycle 365 hari). EXIF worker (`scripts/anon-exif-worker.ts`) mengasumsikan bucket sudah ada.

- **`logger-anon-redactor.ts` di `src/lib/` bukan `src/lib/anon-report/`** — ini disengaja agar dapat diimpor oleh modul lain yang berinteraksi dengan laporan anonim tanpa circular dependency.

## Security Considerations

- **RLS di PostgreSQL**: Tiga tabel (`anon_reports`, `anon_report_access_logs`, `anon_report_config`) di-protect dengan Row Level Security. `REVOKE DELETE` pada `anon_reports` dan `REVOKE UPDATE/DELETE` pada `anon_report_access_logs` memastikan immutability.

- **SC Role Denied**: SC (`Student Council`) secara eksplisit diblokir dari endpoint individual report. Mereka hanya mendapat aggregate summary. Ini melindungi reporter dari identifikasi oleh peer authority.

- **Retention 3 tahun**: `scripts/anon-retention-cron.ts` melakukan soft-redact (bukan hard-delete) pada laporan RESOLVED/ESCALATED_TO_SATGAS yang lebih dari 3 tahun. Body text di-replace dengan marker, `attachmentKey` di-null-kan. Metadata laporan tetap ada untuk keperluan audit statistik.

- **CI Anonymity Gates**: `anonymity-assertions.test.ts` adalah mandatory CI gate. Jika test ini gagal, deploy harus diblokir.

## Testing Notes

- **Unit tests**: `anonymity-assertions.test.ts` mencakup DMMF checks, tracking code entropy, logger redaction, dan Zod schema — jalankan setelah setiap perubahan schema atau lib.

- **E2E specs** di `e2e/anon-channel/` membutuhkan `TEST_CAPTCHA_BYPASS=1` untuk melewati Turnstile/hCaptcha di test environment. Page-load dan anonymity assertion tests berjalan tanpa bypass.

- **Beberapa E2E scenarios** (cross-org RLS, race-condition acknowledge) memerlukan seeded data. Saat ini struktural saja — mark deferred hingga ada test seed setup M12.

## Dependencies

### Depends On

- `prisma` — semua operasi database via `@/utils/prisma`
- `@/lib/cache` — `withCache` untuk aggregate TTL 300s
- `@/lib/notifications/send` — `sendNotification` untuk M15 escalation (optional, dengan fallback)
- `nodemailer` — direct SMTP fallback di `escalation-fallback.ts`
- `exifr` — stripping EXIF metadata dari lampiran foto di `scripts/anon-exif-worker.ts`
- `Upstash Redis` — sliding window rate limit via `checkAnonRateLimit`
- `AWS S3 / DigitalOcean Spaces` — presigned upload/download lampiran
- **M15 Notifications** — untuk ANON_REPORT_NEW_BLM dan ANON_REPORT_ESCALATED_SATGAS templates

### Depended By

- **M13 Dashboard SC** — mengonsumsi `/api/anon-reports/summary` untuk aggregate card (rencana)
- **Sidebar navigasi** — semua role mendapat link "Lapor Anonim" ke `(WebsiteLayout)/anon-report`
