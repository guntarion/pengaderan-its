# Fitur Dashboard Satgas

**Peran pengguna**: Satuan Tugas Perlindungan (Satgas PPKPT)  
**Modul terkait**: M10 (Safeguard & Insiden), M12 (Kanal Anonim — kasus yang dieskalasi)

Panduan teknis: [README.md](./README.md)

---

## 1. Ringkasan Dashboard

Halaman utama (`/dashboard/satgas`) menampilkan:
- Widget KPI untuk insiden berat (severity tinggi) yang sedang aktif
- Tautan langsung ke antrean laporan yang dieskalasi
- Ringkasan status penanganan Satgas

---

## 2. Antrean Laporan yang Dieskalasi

Tampil di `/dashboard/satgas/escalated-reports`.

- Menampilkan semua laporan anonim dengan status `ESCALATED_TO_SATGAS` yang diteruskan oleh BLM.
- Tabel memuat kolom: tingkat keparahan (severity), kategori, tanggal eskalasi, dan status terkini.
- Data disaring secara otomatis agar hanya laporan dengan status eskalasi yang tampil, mencegah duplikasi tampilan dengan antrean BLM.

---

## 3. Detail Laporan dan Penanganan Satgas

Tampil di `/dashboard/satgas/escalated-reports/[reportId]`.

### Informasi yang ditampilkan:
- Detail laporan lengkap: kategori, deskripsi, tingkat keparahan, tanggal, status terkini
- Catatan resolusi dari BLM (jika ada)
- Status `RESOLVED` beserta waktu penutupan

### Tindakan yang tersedia:

**Tambah Catatan Satgas**
- Catatan bersifat privat dan hanya terlihat oleh Satgas, tidak terlihat oleh BLM maupun pelapor.
- Dinonaktifkan setelah laporan berstatus `RESOLVED`.

**Selesaikan Laporan**
- Dialog konfirmasi ditampilkan sebelum laporan ditandai selesai.
- Setelah diselesaikan, status berubah menjadi `RESOLVED` dan timestamp penutupan dicatat.
- Tindakan ini tidak dapat dibatalkan.

---

## 4. Jejak Audit Akses

Setiap akses ke halaman detail dan setiap tindakan (baca, tambah catatan, selesaikan) dicatat secara otomatis dalam log akses anonim oleh sistem backend. Log ini tidak dapat dilihat oleh Satgas sendiri — hanya SUPERADMIN yang memiliki akses ke log tersebut melalui `/dashboard/superadmin/anon-audit`.

---

## 5. Integrasi dengan Modul Lain

- Laporan masuk ke antrean Satgas setelah BLM melakukan eskalasi dari modul M12.
- Untuk insiden safeguard yang dilaporkan secara langsung (bukan anonim), Satgas menggunakan modul terpisah di `/dashboard/safeguard/`.
