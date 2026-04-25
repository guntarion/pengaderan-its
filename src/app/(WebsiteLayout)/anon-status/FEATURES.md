# Fitur Pelacak Status Laporan Anonim (Publik)

Halaman publik untuk memantau perkembangan laporan anonim menggunakan kode penelusuran unik, tanpa memerlukan akun.

## Kemampuan Pengguna

### Input Kode Penelusuran (`/anon-status`)
- Memasukkan kode laporan format `NW-XXXXXXXX` (8 karakter huruf kapital dan angka).
- Menerima validasi format secara langsung (inline) sebelum halaman berpindah.
- Input otomatis dikonversi ke huruf kapital saat mengetik.
- Mendapat pesan kesalahan yang jelas jika format kode salah.

### Melihat Status Laporan (`/anon-status/[code]`)
- Melihat status terkini laporan (misalnya: diterima, sedang ditinjau, selesai).
- Mengetahui kategori dan tingkat keparahan laporan yang pernah dikirim.
- Melihat tanggal laporan diterima (`recordedAt`) dan diakui (`acknowledgedAt`).
- Membaca catatan publik (`publicNote`) yang dituliskan oleh tim pengelola, jika ada.
- Mengetahui tanggal laporan ditutup (`closedAt`), jika sudah selesai.
- Kembali ke halaman input untuk mencari kode lain.

## Batasan Informasi yang Ditampilkan

Untuk melindungi integritas investigasi dan anonimitas, halaman ini hanya menampilkan bidang yang diizinkan secara eksplisit:
- Tidak menampilkan narasi/isi laporan.
- Tidak menampilkan catatan internal tim.
- Tidak menampilkan informasi pengguna yang terkait.

## Privasi

- Halaman status detail tidak diindeks mesin pencari (`robots: noindex`).
- Data selalu diambil segar dari server (`no-store`) sehingga status yang ditampilkan selalu terkini.
- Kode `NW-XXXXXXXX` bersifat acak; tidak mengandung informasi pelapor.

## Cross-reference

Lihat [README.md](./README.md) untuk dokumentasi teknis modul ini.
Untuk pengiriman laporan, lihat `/src/app/(WebsiteLayout)/anon-report/` [FEATURES](../anon-report/FEATURES.md).
