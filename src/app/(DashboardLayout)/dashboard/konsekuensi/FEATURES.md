# Fitur — Konsekuensi Saya (M10, tampilan MABA)

Halaman ini memungkinkan MABA melihat dan merespons konsekuensi pedagogis yang
diberikan oleh staf Safeguard. Seluruh data yang ditampilkan hanya milik
pengguna yang sedang login.

## Fitur Utama

### 1. Daftar Konsekuensi (`/dashboard/konsekuensi`)
- Menampilkan konsekuensi aktif (perlu ditindaklanjuti) secara terpisah dari
  yang sudah selesai.
- Setiap kartu menampilkan: jenis konsekuensi, status, alasan, tanggal
  pemberian, tenggat waktu, dan poin passport yang dikurangi (jika ada).
- Deteksi otomatis status Terlambat berdasarkan tanggal saat ini vs. tenggat.
- Ikon status berwarna untuk memudahkan identifikasi cepat.

### 2. Detail dan Pengiriman Tugas (`/dashboard/konsekuensi/[id]`)

#### Refleksi 500 Kata
- Area teks dengan penghitung kata secara langsung (real-time).
- Bilah progres lima segmen yang berubah hijau saat mencapai 500 kata.
- Tombol kirim dinonaktifkan hingga syarat minimum terpenuhi.

#### Presentasi Ulang
- Formulir unggah berkas disertai kolom catatan.

#### Tugas Pengabdian
- Kolom deskripsi/catatan untuk melaporkan penyelesaian tugas.

#### Pengurangan Poin Passport
- Tampilan hanya-baca; pengurangan poin diterapkan otomatis ke data passport.

#### Peringatan Tertulis
- Tampilan hanya-baca sebagai konfirmasi penerimaan peringatan.

### 3. Banner Pendidikan (Permanen)
- Banner Permen 55/2024 ditampilkan di seluruh halaman detail dan tidak
  dapat ditutup, sebagai pengingat bahwa konsekuensi bersifat pedagogis.

### 4. Status dan Alur Kerja
- MABA mengirim tugas → status berubah ke Menunggu Review.
- Staf menyetujui atau meminta revisi → MABA menerima notifikasi status baru.
- Konsekuensi yang sudah disetujui atau ditolak ditampilkan di bagian Selesai.

## Batasan
- MABA tidak dapat membatalkan konsekuensi sendiri.
- MABA tidak dapat mengedit kiriman yang sudah dalam status Menunggu Review
  tanpa perubahan status dari staf terlebih dahulu.

---

Lihat juga: [README arsitektur](./README.md)
