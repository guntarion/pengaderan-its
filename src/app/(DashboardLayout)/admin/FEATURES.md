# Fitur Admin — NAWASENA

Katalog fitur yang tersedia di panel administrasi NAWASENA.
Dokumentasi teknis: `/src/app/(DashboardLayout)/admin/README.md`

---

## Manajemen Pengguna

- Melihat daftar seluruh pengguna dengan pencarian, filter peran, dan paginasi.
- Mengedit peran, status, dan data profil pengguna secara individual.
- Impor massal pengguna MABA melalui unggahan file CSV.
- Mengaktifkan atau menonaktifkan akun pengguna.

## Whitelist Email

- Menambahkan alamat email yang diizinkan mendaftar ke sistem.
- Menghapus email dari daftar putih.
- Melihat log kapan entri whitelist dibuat dan oleh siapa.

## Manajemen Kohort (Angkatan)

- Membuat angkatan baru dengan kode dan tahun.
- Mengaktifkan angkatan sebagai kohort aktif sistem.
- Mengedit detail angkatan yang sudah ada.

## Master Data

- Mengelola dimensi taksonomi yang digunakan di rubrik dan penilaian.
- Mengelola jenis kegiatan (event type) sebagai referensi modul lain.
- Menjalankan atau mempratinjau seed master data standar.

## Organisasi

- Membuat dan mengedit organisasi (BEM, unit kegiatan, fakultas).
- Melihat daftar seluruh organisasi beserta detailnya.

## Manajemen Pakta Digital

- Mempublikasikan versi baru dokumen pakta dengan nomor versi dan konten Markdown.
- Melihat daftar penanda tangan per versi pakta.
- Versi baru secara otomatis memicu alur tanda tangan ulang bagi MABA yang sudah menandatangani.

## Passport Digital — Admin

- Melihat status passport seluruh MABA.
- Membuat override manual untuk item passport tertentu.
- Menghasilkan QR code massal untuk pemindaian di lapangan.
- Mengekspor data skem passport.

## Struktur Organisasi Pengaderan

- Mengatur pengelompokan MABA ke dalam KP group.
- Memasangkan KASUH dengan MABA (KASUH pairing).
- Memasangkan buddy antar MABA.
- Menyetujui atau menolak permintaan pairing yang masuk.

## Sistem Notifikasi — Admin

- Mengonfigurasi trigger rule (kapan notifikasi dikirim).
- Mengelola template pesan per rule dan per saluran (email, in-app, push).
- Melihat log pengiriman notifikasi beserta status berhasil/gagal.

## Audit Log

- Melihat log seluruh peristiwa penting sistem (buat, ubah, hapus, login).
- Filter berdasarkan resource, aksi, pengguna, dan rentang waktu.
- Tidak ada operasi tulis — log bersifat immutable.
