# Attendance Scanner — PWA Offline-First (M08)

## Tujuan

Halaman scan kehadiran berbasis PWA yang memungkinkan peserta (MABA) atau petugas menandai kehadiran melalui QR code, dengan dukungan penuh mode offline menggunakan IndexedDB sebagai antrian lokal.

## Struktur Rute

```
/dashboard/attendance/scan    Halaman utama scanner QR
```

## Arsitektur Offline-First

```
Camera / Manual Input
       |
  QRScanner component
       |
    Online? ──── Yes ──► POST /api/attendance/stamp
       |                        |
      No                    success / idempotent duplicate
       |
  IndexedDB Queue
  (attendance-queue store di 'nawasena-m08')
       |
  Force Sync / Auto-sync saat online
       |
  POST /api/attendance/stamp per item
  max 5 attempts → hapus dari queue
```

### IndexedDB Queue

Dikelola oleh `src/lib/event-execution/idb/attendance-queue.ts` (menggunakan `idb-keyval`). Setiap item antrian menyimpan:

- `id` / `clientScanId` — UUID untuk idempotency
- `qrPayload` — URL QR lengkap yang sudah di-sign HMAC
- `scannedAt` — timestamp ISO saat scan
- `attempts` — jumlah percobaan sync (batas 5)
- `lastError` — pesan error terakhir

Antrian dibaca ulang setiap 10 detik untuk memperbarui badge pending count.

## HMAC QR Verification

QR code yang ditampilkan oleh `QRDisplay` di halaman OC berisi URL dengan HMAC signature yang dihasilkan oleh `qr.service.ts`. Proses validasi di server (`validateScan`):

1. Verifikasi HMAC dengan secret dari env (`PASSPORT_QR_SECRET` / `QR_SIGNING_SECRET`)
2. Cek masa berlaku sesi QR (`expiresAt`)
3. Cek status sesi (`ACTIVE` / `REVOKED` / `EXPIRED`)
4. Upsert record `Attendance` — idempotent jika `clientScanId` sudah ada
5. Deteksi walkin: peserta yang scan tanpa RSVP confirmed

## Idempotency

Setiap scan membawa `clientScanId` (UUID yang di-generate di client). Server menolak duplikat berdasarkan kombinasi `(instanceId, userId, clientScanId)`, sehingga retry dari antrian offline tidak menghasilkan entri ganda.

## Deteksi Walkin

Jika user yang scan tidak memiliki RSVP dengan status `CONFIRMED` untuk instance tersebut, kehadiran tetap dicatat dengan flag `isWalkin: true`.

## Scanner QR

`QRScanner` di `src/components/event-execution/QRScanner.tsx` menggunakan:
- `BarcodeDetector` API (native, tersedia di Chrome/Edge modern)
- `@zxing/library` sebagai fallback untuk browser yang tidak mendukung

## Komponen Utama

| Komponen | Lokasi |
|---|---|
| `QRScanner` | `src/components/event-execution/QRScanner.tsx` |

## Dependensi Lib Inti

- `src/lib/event-execution/idb/attendance-queue.ts` — antrian IndexedDB
- `src/lib/event-execution/services/qr.service.ts` — validasi HMAC + upsert attendance
- `src/lib/toast.ts` — feedback hasil scan
- `src/lib/logger.ts` — logging terstruktur

## API Endpoint

- `POST /api/attendance/stamp` — stamp kehadiran (menerima `qrPayload`, `clientScanId`, `scannedAt`, `scanLocation`)

## Referensi Lanjut

- Service layer lengkap: `src/lib/event-execution/README.md`
- Fitur pengguna: lihat `FEATURES.md` di folder ini
