# Fitur Halaman Utama (Landing Page)

Halaman publik pertama yang dilihat pengunjung sebelum masuk ke sistem NAWASENA.

## Kemampuan Pengguna

### Navigasi Tanpa Akun
- Mengakses halaman utama tanpa perlu login.
- Melihat gambaran singkat platform pengaderan ITS.
- Menavigasi langsung ke empat modul publik utama dari satu halaman.

### Tombol Aksi Utama
- **Masuk Dashboard** — mengarahkan pengguna yang sudah terdaftar ke `/dashboard`.
- **Lihat Katalog Kegiatan** — membuka katalog kegiatan pengaderan di `/kegiatan`.
- **Login Sekarang** — CTA bagi MABA 2026 untuk masuk via `/auth/login`.

### Pengenalan Modul
- Penjelasan singkat empat fitur utama yang tersedia secara publik:
  - Katalog Kegiatan: eksplorasi kegiatan pengaderan beserta jadwal.
  - Kesehatan Mental: skrining, sumber daya self-care, dan kontak dukungan.
  - Laporan Anonim: pelaporan insiden tanpa login.
  - Cek Status Laporan: pelacakan laporan anonim via kode unik.

## Batasan

- Modul yang memerlukan autentikasi (Passport Digital, Logbook KP, Pulse Journal, Triwulan Review) tidak ditampilkan sebagai kartu — hanya disebutkan dalam teks hero.
- Tidak ada penghitungan statistik real-time (jumlah kegiatan, jumlah laporan, dsb.).

## Cross-reference

Lihat [README.md](./README.md) untuk dokumentasi teknis halaman ini.
