# Fitur Skrining Kesehatan Mental — M11

## Deskripsi

Modul Kesehatan Mental menyediakan jalur skrining terstandar bagi MABA
menggunakan instrumen PHQ-9. Seluruh data sensitif dienkripsi dan hanya
dapat diakses oleh konselor SAC yang berwenang dengan jejak audit penuh.

## Fitur Pengguna

### Persetujuan Berbasis Gulir (Scroll-Gate Consent)
Sebelum mengikuti skrining, MABA membaca teks persetujuan lengkap.
Tombol "Setuju" hanya aktif setelah MABA menggulir hingga akhir teks.
MABA dapat menolak dan kembali ke dashboard tanpa mengisi skrining.

### Skrining PHQ-9 Satu Pertanyaan Per Langkah
Formulir menampilkan satu pertanyaan PHQ-9 pada satu waktu disertai
bilah progres. Setiap jawaban menggunakan skala 0–3 (Tidak pernah hingga
Hampir setiap hari). Navigasi maju dan mundur tersedia antar pertanyaan.

### Hasil Langsung Setelah Pengisian
Setelah pertanyaan ke-9 dijawab, hasil skrining ditampilkan di halaman
yang sama. Hasil mencakup tingkat keparahan (Rendah, Sedang, atau Tinggi)
dan interpretasi singkat. Jika tingkat keparahan masuk kategori Tinggi
dan membutuhkan kontak segera, banner darurat ditampilkan.

### Enkripsi Data Sensitif
Skor mentah dan jawaban individual disimpan terenkripsi di basis data
menggunakan pgcrypto. MABA sendiri tidak dapat melihat skor angkanya.

### Riwayat Skrining Pribadi
MABA dapat melihat daftar skrining yang pernah dilakukan, lengkap dengan
fase (Awal Angkatan, Akhir Angkatan, Mandiri), tingkat keparahan, dan
tanggal. Jawaban dan skor tidak ditampilkan.

### Kontrol Privasi dan Penarikan Persetujuan
MABA dapat menarik persetujuan yang diberikan per cohort. Halaman privasi
menampilkan status persetujuan aktif maupun yang sudah ditarik, serta
tautan untuk mengajukan penghapusan data.

## Akses oleh SAC (Konselor)

Konselor SAC yang ditugaskan dapat mendekripsi jawaban seorang MABA
melalui panel SAC. Setiap akses dekripsi dicatat dalam log audit sebelum
data dikembalikan. Konselor lain yang tidak ditugaskan tidak dapat
melakukan dekripsi.

## Catatan

- Skrining dapat dilakukan secara mandiri (SELF_TRIGGERED) atau
  dijadwalkan oleh program (F1 awal angkatan, F4 akhir angkatan).
- Data tidak pernah dikirim ke pihak ketiga.
