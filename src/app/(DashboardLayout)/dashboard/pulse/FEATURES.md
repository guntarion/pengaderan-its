# Fitur Pulse Harian — M04

## Deskripsi

Modul Pulse Harian memungkinkan MABA merekam kondisi emosional mereka
setiap hari dan memantau perkembangan mood dari waktu ke waktu.

## Fitur Pengguna

### Pengisian Pulse Harian
MABA memilih skala mood 1–5 (Sangat Sedih hingga Sangat Senang) disertai
emoji yang merepresentasikan perasaan mereka. Pengisian dapat disertai
komentar singkat opsional. Setelah dikirim, hasilnya langsung tersimpan
dan terlihat oleh KP yang bersangkutan.

### Pengecekan Status Hari Ini
Saat membuka halaman, sistem secara otomatis memeriksa apakah pulse hari
ini sudah diisi. Jika sudah, emoji dan skor yang dipilih ditampilkan
sebagai konfirmasi. Jika belum, formulir pengisian ditampilkan.

### Dukungan Offline
Jika koneksi jaringan tidak tersedia, pengisian pulse akan masuk antrian
lokal dan otomatis dikirim ulang saat koneksi pulih.

### Tren Mood (sub-halaman /trend)
MABA dapat melihat grafik garis perkembangan mood selama 7, 14, atau 30
hari terakhir. Di bawah grafik ditampilkan riwayat individual setiap pulse
beserta tanggal, emoji, dan komentar.

## Penggunaan oleh KP

KP dapat melihat `suggestedMood` (nilai pulse terbaru) setiap MABA
binaannya saat mengisi logbook harian. Nilai ini berfungsi sebagai input
awal yang dapat diubah sesuai observasi KP.

## Catatan

- Satu pulse per hari per MABA per cohort.
- Jika MABA belum terdaftar di cohort manapun, formulir tidak ditampilkan
  dan MABA diarahkan menghubungi SC.
