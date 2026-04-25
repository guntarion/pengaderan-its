# Fitur — Relasi Saya (M03)

Halaman ini hanya dapat diakses oleh MABA dan menampilkan tiga relasi
pendampingan yang ditetapkan kepada mereka. Seluruh data bersifat hanya-baca.

## Fitur Utama

### 1. Kartu KP Group
- Menampilkan nama dan kode KP Group yang ditugaskan.
- Menampilkan jumlah anggota dan koordinator KP.
- Daftar anggota KP beserta asal provinsi dan minat (maksimal 3 tag minat).

### 2. Kartu Buddy
- Menampilkan pasangan Buddy beserta informasi profil singkat.
- Tombol langsung ke WhatsApp Buddy (ikon pesan).

### 3. Kartu Kakak Asuh (Kasuh)
- Menampilkan Kasuh yang ditugaskan beserta kohort asal.
- Tombol langsung ke WhatsApp Kasuh.
- Navigasi ke halaman pengajuan pergantian Kasuh di `/dashboard/kakak-c/request`.

## Status Loading dan Kosong
- Skeleton loading untuk ketiga kartu saat data sedang diambil.
- Pesan ramah apabila salah satu atau semua relasi belum ditetapkan.

## Aksesibilitas
- Tag minat menggunakan chip berwarna agar mudah dibaca.
- WhatsApp link membuka tab baru dengan `rel="noopener noreferrer"`.

## Catatan Privasi
- Nomor telepon hanya ditampilkan sebagai tautan WhatsApp (tidak ditampilkan
  sebagai teks mentah) sesuai pengaturan privasi data.

---

Lihat juga: [README arsitektur](./README.md)
