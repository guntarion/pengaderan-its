# Passport Verifier — Antrian dan Review Bukti (M05)

## Tujuan

Antarmuka bagi verifikator (KP, KASUH, SC) untuk meninjau dan memutuskan bukti passport digital yang diajukan MABA — menyetujui atau menolak setiap entri dengan dukungan keyboard shortcut dan mekanisme idempotency berbasis Redis.

## Struktur Rute

```
/dashboard/verifier/queue               Antrian entri PENDING + badge count
/dashboard/verifier/[entryId]/          (redirect ke review)
/dashboard/verifier/[entryId]/review    Panel review satu entri
```

## Arsitektur

```
QueueTable (list PENDING entries, polling badge 30s)
       |
  Klik entri
       |
ReviewPanel ([entryId]/review)
  - EvidenceViewer   (lihat file / foto bukti dari S3)
  - StatusBadge
  - Keyboard: A = approve, R = buka RejectReasonModal
       |
  POST /api/passport/[entryId]/verify   (approve)
  POST /api/passport/[entryId]/reject   (reject + reason)
       |
  verifier.service.ts
  - checkVerifyIdempotency (Redis)
  - recordVerifyIdempotency
  - invalidateProgress (progress-cache)
  - sendNotification ke MABA
```

## Polling Badge Count

`QueueBadgeCount` (`src/components/verifier/QueueBadgeCount.tsx`) melakukan `GET /api/verifier/queue?countOnly=true` setiap 30 detik dan menampilkan jumlah entri PENDING. Komponen bersifat non-kritis — kegagalan fetch diabaikan secara senyap.

## Idempotency Redis

`verifier.service.ts` memanggil `checkVerifyIdempotency` sebelum memproses approve/reject. Kunci Redis menyimpan hasil keputusan per `entryId`, mencegah double-process jika verifikator mengklik berulang atau terjadi retry jaringan.

## Keyboard Shortcuts

Di halaman review (`ReviewPanel`):
- `A` — langsung approve entry yang sedang ditampilkan
- `R` — membuka `RejectReasonModal` untuk mengisi alasan penolakan (minimum 10 karakter)

## Thumb-Zone Design

Tombol aksi (Setujui / Tolak) ditempatkan di bagian bawah layar agar mudah dijangkau pada perangkat mobile.

## SC Override

`verifier.service.ts` menyediakan fungsi `override` yang memungkinkan SC mengubah paksa status entri yang sudah diputuskan, dengan alasan minimum 20 karakter dan audit trail.

## Komponen Utama

| Komponen | Lokasi |
|---|---|
| `QueueTable` | `src/components/verifier/QueueTable.tsx` |
| `QueueBadgeCount` | `src/components/verifier/QueueBadgeCount.tsx` |
| `ReviewPanel` | `src/components/verifier/ReviewPanel.tsx` |
| `RejectReasonModal` | `src/components/verifier/RejectReasonModal.tsx` |
| `EvidenceViewer` | `src/components/passport/EvidenceViewer.tsx` |

## Dependensi Lib Inti

- `src/lib/passport/verifier.service.ts` — listQueue, approve, reject, override
- `src/lib/passport/progress-cache.ts` — idempotency Redis + invalidasi progress
- `src/lib/passport/progress.service.ts` — invalidasi cache progres MABA
- `src/lib/toast.ts` — feedback aksi
- `src/lib/logger.ts` — `createLogger('passport:verifier')`

## API Endpoints

- `GET /api/verifier/queue` — daftar entri PENDING (dengan filter opsional: dimensi, nama)
- `GET /api/verifier/queue?countOnly=true` — hanya jumlah pending (untuk badge)
- `GET /api/passport/[entryId]` — detail satu entri + signed URL bukti
- `POST /api/passport/[entryId]/verify` — approve
- `POST /api/passport/[entryId]/reject` — reject dengan alasan

## Hak Akses

Roles yang diizinkan: `KP`, `KASUH`, `SC`, `SUPERADMIN`.

## Referensi Lanjut

- Service layer passport: `src/lib/passport/README.md`
- Fitur pengguna: lihat `FEATURES.md` di folder ini
