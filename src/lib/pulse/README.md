# M04 — Pulse Harian & Weekly Journal

Mengelola check-in mood harian Maba (PulseCheck) dan refleksi mingguan tertulis (Journal), lengkap dengan rubric scoring KP, deteksi mood rendah beruntun (red-flag), dan agregasi mood per KP-Group.

See [FEATURES.md](./FEATURES.md) for the full feature catalogue.

---

## Purpose

M04 menyediakan dua mekanisme pemantauan wellbeing Maba secara berkelanjutan: (1) pulse harian 1-5 emoji yang dapat diisi offline, dan (2) jurnal refleksi tiga-pertanyaan mingguan (What Happened / So What / Now What) dengan minimum 300 kata. Data ini dikonsumsi oleh KP untuk scoring rubric AAC&U, oleh mesin red-flag untuk eskalasi otomatis, dan oleh M09 KP Logbook sebagai sumber suggested-mood.

---

## Architecture Decisions

### Dual-Persistence Draft (localStorage + Server)

JournalEditor menyimpan draft ke localStorage (instant, zero-latency) dan ke server setiap 30 detik via `PUT /api/journal/draft`. Keduanya ditulis secara independen. Saat halaman dibuka, konten server dipakai bila `serverUpdatedAt > localUpdatedAt` (conflict resolution berbasis timestamp klien).

Alternatif yang ditolak: hanya server-side auto-save — terlalu rentan putus jaringan. Hanya localStorage — draft hilang saat ganti device.

### Offline-First Pulse dengan IndexedDB Queue

Pulse submit menambah entri ke IndexedDB queue via `idb-keyval`. Service Worker mencoba sync ke `/api/pulse/sync` saat online. Dedupe dilakukan di server dengan `clientTempId` (UUID yang di-generate klien). Bila `clientTempId` sudah ada di DB, upsert di-skip tanpa error.

Alasan: Maba sering ada di area dengan sinyal lemah (mis. saat kegiatan outdoor). Offline-first memastikan tidak ada hari yang terlewat dalam streak.

### RLS Hybrid: DB-level Org Isolation + App-layer KP Visibility

PulseCheck, JournalDraft, Journal, RubrikScore, RedFlagEvent, FollowUpRecord semuanya punya RLS policy untuk org-isolation (`organization_id = current_org_id`). Self-read Maba diizinkan via `user_id = current_user_id`.

Khusus akses KP ke Journal milik Maba lain: **tidak** di-encode di RLS (cross-table check KPGroupMember → User → Journal terlalu kompleks). Alih-alih, `src/lib/journal/kp-accessor.ts` memverifikasi scope KP-Group di app-layer, lalu query Journal dengan `bypass_rls = true`, dan wajib emit audit log `JOURNAL_KP_ACCESS`.

### Red-Flag Engine Dijalankan Non-Blocking

`checkAndTrigger()` dipanggil dengan `void` dari `createPulse()` — tidak mem-block HTTP response. Jika Redis down, cooldown dilewati (graceful degradation) tapi red-flag tetap dibuat. Threshold: 3 pulse berurutan semua mood ≤ 2.

Pilihan ini sadar: latency submit pulse harus < 3 detik di HP mid-range; mesin red-flag bisa sedikit terlambat tanpa dampak nyata.

### Not-Checked-In Digabung ke mood-aggregate/service.ts

Rencana awal menyebut file `not-checked-in.ts` terpisah. Dalam implementasi, `listNotCheckedIn()` digabung langsung ke `src/lib/mood-aggregate/service.ts` karena query tidak jauh berbeda dari `computeAggregate` (sama-sama butuh list member KP-Group dan localDate). File terpisah tidak ada nilai arsitektur lebih.

### Auto-Escalate di Cron, Bukan di Dedicated Library

Rencana awal ada `src/lib/follow-up/auto-escalate.ts`. Implementasi menaruh logika ini langsung di `src/app/api/cron/m04-red-flag-escalate/route.ts`. Ini lebih sederhana karena logikanya trivial (query `WHERE status=ACTIVE AND triggeredAt < now-48h`) dan tidak perlu di-reuse oleh caller lain.

### RubrikScore Sebagai Tabel General (Bukan Hanya Journal)

`RubrikScore` tidak FK ke `Journal`. Relasi disimpan di kolom `context` (JSON) dan `contextKey` (denormalized: `"JOURNAL_REFLECTION:<journalId>"`). Desain ini memungkinkan modul lain (M14, dll.) memakai tabel yang sama dengan `rubrikKey` berbeda tanpa schema migration.

---

## Patterns & Conventions

### Timezone-Aware localDate

`PulseCheck.localDate` adalah DATE (bukan DateTime). Diturunkan dari `recordedAt` menggunakan `date-fns-tz` dengan default timezone `Asia/Jakarta`. Ini memastikan unique constraint per hari lokal benar — submit jam 23:59 WIB tidak tabrakan dengan submit jam 00:01 WIB hari berikutnya di UTC.

Helper: `src/lib/pulse/local-date.ts`.

### Rubric Scoring Lock (Optimistic, Redis-backed)

KP mengunci jurnal sebelum scoring via `POST /api/rubric-score/lock/[journalId]`. Lock disimpan di Redis dengan TTL 5 menit dan di-renew via heartbeat setiap 60 detik. Dua KP yang membuka jurnal yang sama secara bersamaan mendapat 409 dari yang kedua.

### Mood Aggregate Cache Key

Format: `mood:aggregate:<kpGroupId>:<localDateStr>` (mis. `mood:aggregate:clxxx:2026-04-25`). Cache TTL 1 jam. Di-invalidate setiap kali `createPulse()` berhasil.

---

## Gotchas

- **Jangan pakai `Journal.updatedAt` untuk cek immutability** — field ini tetap di-update oleh Prisma pada setiap `update()`. Immutability dijaga di app-layer: `submitJournal()` tidak pernah update Journal setelah create. Gunakan `submittedAt` sebagai timestamp canonical.

- **KP hanya bisa scoring jurnal anggota KP-Groupnya sendiri** — cross-group forbidden diverifikasi di `kp-accessor.ts` sebelum query bypass. Jangan akses Journal via endpoint biasa dari context KP tanpa melalui `kp-accessor`.

- **`clientTempId` dedupe di server bersifat soft** — bila `clientTempId = null`, dedupe dilakukan oleh unique constraint `(userId, localDate)`. Bila klien kirim dua request berbeda di hari yang sama tanpa `clientTempId`, request kedua mendapat 409 (upsert gagal).

- **Cron `m04-red-flag-escalate` berjalan setiap 6 jam** — bukan real-time. Red-flag yang tidak di-follow-up dalam 48 jam akan di-eskalasi pada run cron berikutnya setelah 48 jam lewat (worst case +6 jam delay).

- **Email template nama berbeda dari rencana** — Rencana menyebut `RedFlagMaba.tsx`. Implementasi memakai `RedFlagSevereKpLog.tsx` (mood ≤ 2) dan `RedFlagNormalKpLog.tsx`. Bila menambah rule M15, gunakan nama template yang ada di `src/emails/`.

---

## Dependencies

### Depends On

- **M01 Foundation** — User, Organization, Cohort, AuditAction enum, RLS session variables (`app.current_org_id`, `app.current_user_id`, `app.bypass_rls`), audit log service.
- **M03 Struktur Angkatan** — `KPGroup` + `KPGroupMember` untuk resolver KP-Group (siapa KP-nya Maba, siapa Maba-nya KP).
- **M15 Notifications** — `sendNotification()` untuk notifikasi `RED_FLAG_MABA` (CRITICAL + PUSH/EMAIL ke KP) dan `RED_FLAG_ESCALATED` (ke SC). Juga `verifyCronAuth()` untuk autentikasi cron routes.
- **Redis (Upstash)** — cooldown red-flag (SETNX 7 hari), rubric lock, mood aggregate cache.

### Depended By

- **M09 KP & Kasuh Logbook** — KP daily log form mengambil `suggestedMood` dari `listNotCheckedIn()` dan `computeAggregate()` M04 sebagai input awal. `resolveMabaForKP()` dari M04 juga di-reuse M09.
- **M11 Mental Health Screening** — Red-flag event (`RedFlagEvent` tabel) dapat menjadi referral trigger di masa depan (belum diimplementasikan tapi dirancang sebagai pathway).
- **M14 Triwulan Sign-off** — `RubrikScore` tabel di M04 adalah shared scoring table; M14 akan menambah rubrikKey baru ke tabel yang sama.

---

## Security Considerations

- **RLS aktif di 6 tabel M04**. Semua query production harus melewati Prisma client dengan session variable yang di-set via `prisma.$executeRaw` wrapper M01.
- **Bypass RLS hanya untuk KP access Journal** via `kp-accessor.ts`. Setiap bypass wajib emit `JOURNAL_KP_ACCESS` audit log dalam transaksi yang sama.
- **JournalDraft tidak dapat dibaca KP** — RLS `journal_draft_self_only` hanya izinkan self + bypass. KP tidak perlu baca draft (hanya Journal yang sudah submitted).

## Testing Notes

- Unit test tersedia: `word-count.test.ts`, `red-flag-engine.test.ts`.
- Unit test yang direncanakan namun belum ada: `service.test.ts` (pulse), `service.test.ts` (journal), `offline-queue-client.test.ts`, `rubric/service.test.ts`, `kp-accessor.test.ts`.
- E2E specs tersedia di `e2e/pulse-journal/` (6 specs: pulse-submit, journal-editor, journal-submit-lock, rubric-scoring, kp-mood-dashboard, kp-cross-group-forbidden).
