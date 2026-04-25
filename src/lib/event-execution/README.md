# M08 — Eksekusi Kegiatan (OC Dashboard)

Modul ini menangani siklus hidup penuh pelaksanaan kegiatan kaderisasi: dari pembuatan sesi oleh OC, QR attendance scan oleh MABA, manajemen kehadiran, unggah output dokumentasi, hingga formulir evaluasi pasca-acara. Bergantung pada M06 (RSVP & NPS) sebagai baseline dan M15 (Notifikasi) untuk cascade komunikasi.

## Purpose

M08 menjawab kebutuhan OC untuk mengorkestrasi satu sesi kegiatan dari A–Z tanpa meninggalkan sistem. Batasannya adalah: M08 hanya mengelola *pelaksanaan* (instance) dari kegiatan yang sudah terdaftar di katalog master M02. Tidak menambah/mengubah kegiatan master — itu domain M02.

## Architecture Decisions

### Schema: Extend M06 + File Baru untuk Artefak Baru

`nawasena_event_instance.prisma` (M06) di-extend *additive* untuk menambah field `version`, `cancelledAt`, `cancelledById`, `cancellationReason`, `rescheduleCount`, dan field attendance (`scanMethod`, `scannedAt`, `clientScanId`, `qrSessionId`, `isWalkin`, `notes`).

File baru `nawasena_event_execution.prisma` menampung tiga model yang konseptual berbeda dari "penjadwalan":

| Model | Tujuan |
|---|---|
| `OutputUpload` | File/link/video/repo per instance; scan mime (CLEAN/SUSPICIOUS) |
| `KegiatanEvaluation` | 1 evaluasi per instance; pre-fill otomatis attendance% + NPS |
| `KegiatanQRSession` | Sesi QR aktif/expired/revoked untuk scan kehadiran |

Pendekatan ini menjaga M06 tidak membengkak dan memisahkan concern "post-event documentation" dari "event scheduling".

### Lifecycle State Machine dengan Optimistic Lock

Transisi status dikelola eksklusif oleh `lifecycle.service.ts` via `ALLOWED_TRANSITIONS` map:

```
PLANNED → RUNNING (manual OC atau auto cron tiap 15 menit)
PLANNED → CANCELLED
RUNNING → DONE
RUNNING → CANCELLED
```

Setiap update menyertakan `WHERE version = expectedVersion` — mismatch mengembalikan 409 agar dua OC yang menekan tombol bersamaan tidak menghasilkan double-trigger. SC dapat membalik status via endpoint terpisah `/api/admin/event-execution/instances/[id]/lifecycle-revert` dengan alasan wajib.

After-commit hooks (tidak rollback transisi bila gagal):
- **DONE**: `autoSetAlpaOnDone` + `triggerNPSForInstance` (M06) + log evaluasi overdue
- **CANCELLED**: `cancelNPSTrigger` (M06) + batch notif `EVENT_CANCELLED` chunked 50/chunk

### QR HMAC — Shared Helper `src/lib/qr/signing.ts`

Helper di-promote dari M05 (`src/lib/passport/qr-signing.ts`) menjadi modul lintas-domain. Payload format:

```
attendance|{instanceId}|{sessionId}|{expiresAt}
```

Module discriminator mencegah QR Passport M05 dipakai sebagai QR Attendance M08 (replay lintas-modul). Secret dari `QR_SIGNING_SECRET` (fallback ke `PASSPORT_QR_SECRET` untuk kompatibilitas). Verifikasi timing-safe via `crypto.timingSafeEqual`.

### Offline-First Attendance Scan — IndexedDB + Inline Sync

MABA menggunakan halaman PWA `/dashboard/attendance/scan/`. Scan yang berhasil di-POST langsung ke `/api/attendance/stamp`. Bila offline, hasil scan disimpan ke IndexedDB store `nawasena-m08/attendance-queue` via `idb-keyval`. Sinkronisasi terjadi:

- Otomatis ketika event `online` terdeteksi
- Otomatis polling setiap 10 detik bila ada antrean
- Manual via tombol "Sinkron Sekarang"

Idempotency dijamin oleh `clientScanId` (UUID v4 generate sisi klien) yang disimpan sebagai partial unique index di tabel `attendances`. Server mengembalikan `{ ok: true, isDuplicate: true }` untuk scan yang sudah pernah masuk.

Catatan: attendance sync tidak menggunakan Service Worker terpisah. `public/sw.js` adalah M15 Web Push SW. Sync logic dijalankan dari halaman React langsung — pilihan pragmatis mengingat dukungan Background Sync API yang terbatas di iOS Safari.

### Output Upload — Reuse Pola M05 Presigned URL

Alur empat-langkah:
1. POST `/init` → server buat `OutputUpload` row (status `PENDING`) + kembalikan S3 presigned PUT URL
2. Klien PUT file langsung ke S3
3. POST `/finalize` → server verifikasi upload + `file-type` mime sniff → set `CLEAN` atau `SUSPICIOUS`
4. Untuk tipe LINK/VIDEO/REPO: lewati presigned, langsung POST `/url-create`

File > 50 MB ditolak via CHECK constraint di database. Uploader atau SC yang boleh menghapus.

### Evaluation Pre-Fill dengan Override Audit

`GET /evaluation` mengagregasi tiga nilai secara otomatis:
- `attendancePct` — hitung HADIR / CONFIRMED RSVP, cache Redis 60 detik
- `npsScore` — dari M06 EventNPS, null bila n < 5 (privasi threshold)
- `redFlagsCount` — dari M10 SafeguardIncident bila sudah live, null + disclaimer bila belum

OC dapat override tiap nilai pre-fill dengan alasan wajib; setiap override dicatat ke audit log `EVALUATION_PREFILL_OVERRIDDEN`. Evaluasi hanya bisa submit sekali per instance (unique constraint `instanceId`).

### Caching Strategy

| Data | Key Pattern | TTL |
|---|---|---|
| OC instance listing | `event-execution:instance:listing:{userId}:{cohortId}` | 60 detik |
| Instance detail | `event-execution:instance:{id}:detail` | 30 detik |
| Attendance list + stats | `event-execution:instance:{id}:attendance:*` | 30 detik |
| Output list | `event-execution:instance:{id}:outputs` | 60 detik |
| Evaluation prefill | `event-execution:instance:{id}:evaluation:prefill` | 60 detik |

Invalidasi dipicu oleh setiap mutasi relevan via helper di `cache/invalidate.ts`.

## Patterns & Conventions

### 8 Service Files — Satu Tanggung Jawab Per File

```
src/lib/event-execution/services/
  instance.service.ts    — create + listing
  lifecycle.service.ts   — state machine + side effects
  attendance.service.ts  — bulk/manual mark + autoSetAlpa
  qr.service.ts          — session create/revoke/generatePng/validateScan/expireStale
  output.service.ts      — presigned init/finalize/urlCreate/delete
  evaluation.service.ts  — prefill aggregate + submit + SC delete
  reschedule.service.ts  — reschedule + cascade notif (max 3x)
  capacity.service.ts    — raise capacity + waitlistPromote (M06)
```

Semua service menggunakan `createLogger('event-execution:{name}-service')` dan melempar error dengan prefix `NOT_FOUND:`, `CONFLICT:`, `INVALID_STATE:`, dll. yang ditangkap oleh `createApiHandler` middleware.

### Audit Log — Semua Mutasi Tercatat

25 nilai `AuditAction` baru di-extend ke enum `nawasena_audit.prisma`. Setiap transisi, scan, upload, dan evaluasi menghasilkan satu baris audit.

### Multi-Tenant via Denormalized `organizationId`

Ketiga tabel baru menyertakan `organizationId` sebagai FK denormalisasi, konsisten dengan pola M06. RLS policy pada tiap tabel memastikan org-isolation tanpa JOIN.

## Gotchas

- **`QR_SIGNING_SECRET` vs `PASSPORT_QR_SECRET`** — `qr.service.ts` fallback ke `PASSPORT_QR_SECRET` bila `QR_SIGNING_SECRET` tidak ada. Di production sebaiknya set keduanya eksplisit agar rotasi bisa independen.
- **Evaluasi hanya bisa submit bila status = DONE** — form UI disabled bila belum. SC bisa hapus evaluasi via `/api/admin/event-execution/evaluations/[id]` untuk memungkinkan resubmit.
- **Auto-ALPA hanya pada transisi DONE** — bila OC cancel, attendance tetap pada status sebelumnya (tidak otomatis ALPA). Logika ini disengaja karena cancel bukan pelaksanaan selesai.
- **Reschedule maks 3x** — attempt ke-4 akan ditolak oleh `reschedule.service.ts`. Perlu SC override atau buat instance baru.
- **Batch notif cancellation tidak rollback status** — bila M15 down, status instance tetap CANCELLED dan `notificationFailedCount` di-increment. SC dapat resend manual.
- **Service Worker di `public/sw.js` adalah M15 Web Push SW** — bukan attendance sync. Jangan tambahkan fetch event handler di sana tanpa koordinasi M15.

## Dependencies

### Depends On

- `M01` — `createApiHandler`, tenant extension, audit extension, `logAudit`, RLS patterns
- `M02` — Katalog Kegiatan master (picker + autoprefill tujuan/KPI)
- `M03` — Cohort + membership (OC assignment, MABA membership)
- `M05` — `src/lib/qr/signing.ts` shared (dipromote dari M05), S3 helpers, `file-type` mime sniff
- `M06` — `KegiatanInstance`, `RSVP`, `Attendance` base schema; `triggerNPSForInstance`, `cancelNPSTrigger`, `waitlistPromote`
- `M10` — `SafeguardIncident` untuk `redFlagsCount` evaluation prefill (feature-flagged, graceful degradation bila M10 belum live)
- `M15` — `sendNotification`, `scheduleAt` untuk cancellation/reschedule/evaluation reminder

### Depended By

- `M09` — membaca `KegiatanInstance.status` untuk konteks logbook KP/KASUH
- `M13` (Dashboard Multi-Role) — mengonsumsi agregat instance OC untuk SC dashboard

## State Management

Data mengalir: M02 Kegiatan catalog → OC create instance (PLANNED) → QR session dibuat → MABA scan/OC manual mark attendance → OC transition ke RUNNING lalu DONE → M06 NPS trigger → OC submit evaluation → SC review.

## Security Considerations

- HMAC-SHA256 pada setiap QR URL, constant-time comparison untuk prevent timing attack
- `clientScanId` partial unique index mencegah replay scan dari IndexedDB yang terlambat sync
- RLS pada 3 tabel baru: OC hanya baca instance organisasinya sendiri; MABA hanya baca attendance dirinya sendiri
- Audit log wajib untuk semua mutasi termasuk lifecycle transition, scan, output upload, dan evaluasi override

## Testing Notes

Phase I (E2E + unit tests) belum diimplementasikan. Lihat `08-master-checklist.md` Phase I untuk daftar file test yang direncanakan. Prioritas: `lifecycle.service.test.ts` (state machine boundaries) dan `qr.service.test.ts` (HMAC path valid/invalid/expired).

## Related

- [FEATURES.md](./FEATURES.md) — katalog fitur product-facing per peran
- [05-arsitektur.md](./05-arsitektur.md) — keputusan arsitektur lengkap + risiko + mitigasi
- [08-master-checklist.md](./08-master-checklist.md) — status implementasi per phase
