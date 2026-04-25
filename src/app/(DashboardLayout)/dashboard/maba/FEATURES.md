# Fitur Dashboard Mahasiswa Baru — M13

## Deskripsi

Halaman dashboard khusus MABA yang menampilkan sinyal kesehatan,
kemajuan program, dan pintasan menuju fitur-fitur utama NAWASENA.

## Fitur Pengguna

### Gerbang Pakta Digital
Sebelum dapat melihat dashboard, MABA wajib menandatangani pakta digital.
Jika belum ditandatangani, sistem mengalihkan ke halaman penandatanganan
pakta secara otomatis.

### Streak Pulse Check
Menampilkan jumlah hari berturut-turut MABA telah mengisi Pulse Harian.
Streak yang tinggi mencerminkan konsistensi pemantauan diri. Tautan
langsung ke `/dashboard/pulse` tersedia.

### Progress Ring Passport
Menampilkan persentase aktivitas passport yang telah diselesaikan dalam
bentuk cincin progres visual. MABA dapat langsung mengakses detail
passport melalui tautan di bawah cincin.

### Mood Hari Ini
Menampilkan mood yang sudah diisi hari ini (emoji + label) melalui widget
MoodCard. Jika belum diisi, widget menampilkan status kosong sebagai
pengingat.

### Agenda Mendatang
Daftar kegiatan yang dijadwalkan dalam waktu dekat, diambil dari data
event cohort. MABA dapat melihat nama kegiatan dan tanggal pelaksanaan.

### Alat dan Bantuan
Menu pintasan ke fitur pendukung:
- Skrining Kesehatan Mental
- Konsultasi Kakak Konselor
- Pulse Harian
- Jurnal Mingguan
- Passport Digital

## Catatan

- Semua widget terisolasi; kegagalan satu widget tidak memengaruhi widget
  lain.
- Halaman menampilkan skeleton loading selama data diambil dari server.
