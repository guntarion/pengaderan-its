# Fitur Dashboard Entry — M13

## Deskripsi

Halaman `/dashboard` adalah gerbang masuk tunggal setelah login.
Pengguna tidak perlu memilih arah secara manual; sistem membaca peran
mereka dari sesi dan mengalihkan secara otomatis ke dashboard yang sesuai.

## Fitur Pengguna

### Pengalihan Otomatis Berbasis Peran
Setelah login, pengguna dialihkan langsung ke dashboard perannya:
- MABA → `/dashboard/maba`
- KP → `/dashboard/kp`
- KASUH → `/dashboard/kasuh`
- OC → `/dashboard/oc`
- SC → `/dashboard/sc`
- BLM → `/dashboard/blm`
- PEMBINA → `/dashboard/pembina`
- SATGAS → `/dashboard/satgas`
- SUPERADMIN / admin → `/dashboard/superadmin`

### Tampilan Skeleton Saat Memuat
Selama sesi belum selesai divalidasi, ditampilkan kartu-kartu skeleton
agar halaman tidak terlihat kosong.

### Panel Pilihan untuk Peran Tanpa Dashboard Khusus
Peran seperti SAC, ELDER, DOSEN_WALI, dan ALUMNI yang belum memiliki
dashboard khusus mendapatkan daftar tautan navigasi manual.

### Halaman Tidak Diizinkan
Jika pengguna mencoba mengakses slug dashboard peran lain (misalnya MABA
mengakses `/dashboard/sc`), mereka diarahkan ke halaman
`/dashboard/unauthorized` yang menjelaskan pembatasan akses.

## Batasan

- Tidak ada data yang di-fetch di halaman ini.
- Otorisasi slug dashboard ditegakkan di middleware, bukan di halaman ini.
- Pengalihan menggunakan `router.replace` (tidak menyimpan history).
