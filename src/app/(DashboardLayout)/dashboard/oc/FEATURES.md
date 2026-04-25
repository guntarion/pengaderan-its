# Fitur OC Dashboard — Pelaksanaan Kegiatan

Katalog fitur yang tersedia bagi pengguna dengan peran OC, SC, dan SUPERADMIN.

## 1. Dashboard Ringkasan OC

- Tampilan kegiatan mendatang yang PIC-nya adalah pengguna yang login
- Widget jumlah kegiatan yang menunggu evaluasi
- Skor NPS terbaru per kegiatan

## 2. Daftar Sesi Kegiatan

- Tabel semua `KegiatanInstance` dengan status berwarna (Akan Datang / Berlangsung / Selesai / Dibatalkan)
- Informasi singkat: tanggal, lokasi, jumlah RSVP, jumlah entri NPS
- Tombol akses cepat ke halaman detail per sesi

## 3. Buat Sesi Kegiatan Baru

- Wizard pembuatan sesi: pilih kegiatan dari katalog, atur tanggal, lokasi, dan kapasitas
- Validasi form sebelum submit

## 4. Manajemen Lifecycle Sesi

- Tombol transisi status: Mulai (PLANNED → RUNNING), Selesaikan (RUNNING → DONE), Batalkan
- Reschedule sesi dengan modal konfirmasi dan alasan
- Revert paksa oleh SC dengan audit trail
- Indikator progres pembatalan

## 5. Manajemen Kehadiran

- Live counter kehadiran (auto-refresh 30 detik)
- Tampilan QR Code untuk scanning oleh peserta (status PLANNED/RUNNING)
- Tabel peserta hadir dengan metode scan, status walkin, dan catatan
- Kontrol manual dan bulk untuk status kehadiran

## 6. Unggah Output Kegiatan

- Upload file (PDF, gambar, video) langsung ke S3/Spaces
- Penambahan tautan eksternal (link, video, repo)
- Daftar output dengan metadata (ukuran, pengunggah, status scan)

## 7. Formulir Evaluasi Pasca-Acara

- Hanya tersedia setelah sesi berstatus DONE
- Data pre-fill otomatis: persentase kehadiran, skor NPS, jumlah red flags
- Override manual per-metrik dengan toggle
- Status read-only jika evaluasi sudah pernah di-submit
- Penanda keterlambatan pengisian (`submittedLate`)

## Referensi Teknis

- Arsitektur: lihat `README.md` di folder ini
- Service layer: `src/lib/event-execution/README.md`
- Fitur service layer: `src/lib/event-execution/FEATURES.md`
