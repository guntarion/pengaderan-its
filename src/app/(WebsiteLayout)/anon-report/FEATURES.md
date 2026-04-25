# Fitur Laporan Anonim — Pengiriman (Publik)

Saluran pelaporan anonim untuk insiden selama pengaderan ITS. Tidak memerlukan akun. Identitas pelapor tidak tersimpan.

## Kemampuan Pengguna

### Halaman Pengantar (`/anon-report`)
- Memahami jaminan anonimitas sistem sebelum mengisi laporan.
- Membaca tiga langkah cara kerja saluran laporan:
  1. Isi formulir dengan kohort, kategori, dan narasi.
  2. Simpan kode unik `NW-XXXXXXXX` yang diterima.
  3. Pantau status laporan menggunakan kode tersebut.
- Navigasi ke formulir laporan atau ke halaman cek status.

### Pengiriman Laporan (`/anon-report/form`)
- Mengisi laporan insiden tanpa login dan tanpa mencantumkan identitas.
- Memilih kohort/angkatan yang relevan.
- Memilih kategori laporan (perundungan, pelecehan, ketidakadilan, dll.).
- Memilih tingkat keparahan (severity).
- Menuliskan narasi kejadian secara bebas.
- Mengirimkan laporan dan mendapatkan kode penelusuran unik.

### Konfirmasi Pengiriman (`/anon-report/success`)
- Melihat konfirmasi bahwa laporan telah berhasil dikirim.
- Menerima kode penelusuran format `NW-XXXXXXXX`.
- Mendapat instruksi cara menyimpan kode untuk pelacakan di kemudian hari.
- Diarahkan kembali ke halaman pengantar apabila kode tidak valid.

## Jaminan Privasi

- Tidak ada nama, alamat email, atau alamat IP yang disimpan bersama laporan.
- Halaman formulir dan halaman sukses tidak diindeks mesin pencari.
- Kode penelusuran bersifat acak dan tidak mengandung informasi pribadi.

## Cross-reference

Lihat [README.md](./README.md) untuk dokumentasi teknis modul ini.
Untuk pelacakan status, lihat `/src/app/(WebsiteLayout)/anon-status/` [FEATURES](../anon-status/FEATURES.md).
