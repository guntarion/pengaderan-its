# Fitur Attendance Scanner

Katalog fitur yang tersedia pada halaman scan kehadiran.

## 1. Scan QR Kehadiran

- Membuka kamera perangkat untuk mendeteksi QR code kegiatan
- Menggunakan `BarcodeDetector` API (native) dengan fallback `@zxing/library`
- Mendukung input kode pendek manual sebagai alternatif kamera

## 2. Mode Offline (Offline-First)

- Scan yang dilakukan saat tidak ada koneksi internet disimpan ke antrian lokal (IndexedDB)
- Antrian disinkronkan otomatis ketika koneksi kembali tersedia
- Tombol "Force Sync" tersedia untuk memaksa sinkronisasi segera

## 3. Badge Antrian Pending

- Menampilkan jumlah scan yang belum tersinkronisasi
- Diperbarui otomatis setiap 10 detik
- Indikator status koneksi (online/offline) terlihat di header

## 4. Validasi dan Idempotency

- QR code diverifikasi dengan HMAC signature di server — menolak QR palsu atau kedaluwarsa
- Setiap scan membawa UUID unik (`clientScanId`); scan ulang dari antrian tidak menghasilkan entri ganda
- Sesi QR yang sudah dicabut (`REVOKED`) atau kedaluwarsa (`EXPIRED`) ditolak dengan pesan jelas

## 5. Deteksi Walkin

- Peserta yang melakukan scan tanpa RSVP confirmed tetap bisa masuk dan dicatat sebagai walkin
- Flag `isWalkin` terlihat di tabel kehadiran OC

## 6. Retry Otomatis dengan Batas Maksimum

- Item di antrian dicoba ulang hingga 5 kali
- Setelah 5 kali gagal, item dihapus dari antrian untuk mencegah penumpukan

## Referensi Teknis

- Arsitektur: lihat `README.md` di folder ini
- Service layer: `src/lib/event-execution/README.md`
- Fitur service layer: `src/lib/event-execution/FEATURES.md`
