# Fitur Profil Pengguna — NAWASENA

Katalog fitur halaman profil dan pengaturan akun.
Dokumentasi teknis: `/src/app/(DashboardLayout)/profile/README.md`

---

## Halaman Profil

- Menampilkan foto profil, nama lengkap, nama tampilan, NRP, dan peran pengguna.
- Menyediakan akses cepat ke pengeditan foto profil.
- Menampilkan tautan ke halaman data diri dan demografi.

## Wizard Pengaturan Profil Pertama Kali

- Ditampilkan secara otomatis kepada pengguna baru dengan status `PENDING_PROFILE_SETUP`.
- Memandu pengguna mengisi nama lengkap, nama tampilan, dan NRP.
- Setelah selesai, status akun diperbarui dan pengguna diarahkan ke tahap berikutnya.

## Data Diri dan Demografi (Opt-in)

- Formulir opsional untuk melengkapi informasi tambahan diri.
- Pengguna dapat mengisi data demografi yang relevan untuk keperluan program.

## Pengaturan Privasi Time Capsule

- Mengatur apakah entri Time Capsule baru dibagikan secara default.
- Pilihan berlaku untuk semua entri baru yang dibuat setelah pengaturan disimpan.

## Pengaturan Privasi Life Map

- Mengatur apakah goal Life Map baru dibagikan secara default.
- Pilihan berlaku untuk semua goal baru yang dibuat setelah pengaturan disimpan.

## Retensi Data Diperpanjang

- Pengguna dapat memilih perpanjangan retensi data pribadi selama 0 hingga 3 tahun.
- Pilihan ini relevan setelah masa kaderisasi berakhir dan berpengaruh pada kebijakan penghapusan data.
