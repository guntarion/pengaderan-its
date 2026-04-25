# Fitur KP Dashboard — Katalog untuk Pengguna (Kakak Pembimbing)

Dokumen ini menjelaskan kapabilitas yang tersedia bagi pengguna dengan peran KP
(Kakak Pembimbing) di modul dashboard KP.

---

## 1. Halaman Utama KP (Beranda)

- Menampilkan tautan cepat ke seluruh alat operasional KP dalam satu tampilan.
- Widget SafeWord — KP dapat mengaktifkan kata aman (M10) langsung dari beranda tanpa
  harus berpindah halaman.
- Counter red flag aktif — jumlah kejadian red flag yang belum ditutup tampil di atas
  beranda sebagai peringatan visual.
- Pengingat debrief — notifikasi inline apabila debrief mingguan belum dikirimkan.
- Queue passport review (M13) — jumlah maba yang memerlukan tinjauan passport.

---

## 2. Mood Kelompok (M04)

- Tampilan agregat mood harian kelompok: rata-rata, distribusi skala 1–5, dan jumlah
  yang sudah/belum check-in.
- Grafik distribusi mood hari ini — memperlihatkan sebaran respon anggota secara visual.
- Daftar anggota yang belum check-in sehingga KP dapat melakukan tindak lanjut.
- Panel red flag — menampilkan kejadian mood sangat rendah yang terpantau otomatis oleh
  sistem, dilengkapi status penanganan.
- Modal tindak lanjut (Follow-Up) — KP dapat mencatat langkah tindak lanjut terhadap
  sebuah red flag langsung dari panel.
- Data diperbarui otomatis setiap 60 detik; label "N menit lalu" menunjukkan waktu
  pembaruan terakhir.

---

## 3. Review Jurnal (M04)

- Antrian jurnal yang belum dinilai — daftar jurnal mingguanmaba di grup KP dengan
  status "Menunggu Penilaian" atau "Terlambat".
- Tampilan dua panel pada halaman detail: teks jurnal (What Happened / So What / Now
  What) di kiri, panel penilaian rubrik di kanan.
- Penilaian dengan rubrik berjenjang (Level) dan kolom komentar opsional.
- Setelah nilai disimpan, status jurnal diperbarui dan halaman menampilkan konfirmasi.

---

## 4. Log Harian KP (M09)

- Formulir stand-up harian: rata-rata mood kelompok hari ini, red flag yang teramati,
  dan catatan anekdot singkat.
- Data mood yang disarankan (suggestedMood) diambil otomatis dari pulse check anggota.
- Riwayat log 7 hari terakhir tersedia langsung di halaman yang sama.
- Jendela edit 48 jam — entri log yang sudah lebih dari 48 jam ditampilkan hanya-baca.

---

## 5. Debrief Mingguan KP (M09)

- Formulir debrief mingguan: apa yang berhasil, apa yang tidak, dan perubahan yang
  diperlukan minggu depan.
- Kartu konteks mingguan (WeeklyContextCard) — merangkum rata-rata mood, jumlah log
  harian, rincian red flag per kategori, dan daftar anekdot dari log harian yang
  sudah diisi sepanjang minggu.
- Data konteks dihitung ulang setiap minggu oleh proses terjadwal (cron).
- Riwayat debrief minggu-minggu sebelumnya dapat dibuka/tutup di bawah formulir.

---

## 6. Daftar Anggota Grup (M03)

- Tampilan kartu seluruh anggota grup KP: nama lengkap, NRP, asal provinsi, dan peran.
- Widget SafeWord tersedia di pojok halaman untuk akses cepat.
- Klik kartu anggota membuka profil detail yang telah disanitasi — data sensitif (KIP,
  kontak darurat) tidak ditampilkan sesuai kebijakan privasi.

---

## 7. Peer Debriefs (M09)

- Feed KP lain dalam kohort yang sama yang telah mengirimkan debrief minggu ini —
  memungkinkan berbagi wawasan antar-KP.
- Akses terbatas hanya pada KP satu kohort — KP dari kohort lain tidak dapat dilihat
  (diblokir di level API).
- Halaman detail peer debrief sepenuhnya hanya-baca; tidak ada kolom komentar.

---

## Catatan Privasi dan Keamanan

- Profil anggota grup hanya menampilkan data publik (nama, NRP, provinsi) — tidak ada
  data KIP atau kontak darurat.
- Akses peer debrief dibatasi per kohort dan dicatat dalam audit log.
- Seluruh formulir yang mengubah data menggunakan perlindungan CSRF.

---

## Dokumen Terkait

- Arsitektur teknis: `src/app/(DashboardLayout)/dashboard/kp/README.md`
- Logbook library: `src/lib/m09-logbook/README.md`
- Pairing library: `src/lib/pairing/README.md`
- Pulse library: `src/lib/pulse/README.md`
