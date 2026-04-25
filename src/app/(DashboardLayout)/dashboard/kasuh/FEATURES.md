# Fitur KASUH Dashboard — Katalog untuk Pengguna (Kakak Asuh)

Dokumen ini menjelaskan kapabilitas yang tersedia bagi pengguna dengan peran KASUH
(Kakak Asuh) di modul dashboard KASUH.

---

## 1. Halaman Utama KASUH (Beranda)

- Daftar adik asuh lengkap dengan status siklus logbook saat ini (SUBMITTED / DUE /
  OVERDUE / UPCOMING).
- Mini tren pulse 7 hari terakhir per adik asuh — menampilkan nilai mood terbaru,
  ikon tren naik/turun/stabil, dan rata-rata.
- Tanggal tenggat siklus logbook berikutnya ditampilkan sebagai pengingat.
- Tautan langsung ke formulir logbook dari kartu adik asuh di halaman beranda.
- Bagian M13: tren pulse 7 hari diperlihatkan sebagai ringkasan sebelum masuk ke
  detail.

---

## 2. Daftar Adik Asuh (M03)

- Tampilan kartu seluruh adik asuh aktif: nama, NRP, asal provinsi, status rantau,
  dan skor kecocokan pairing beserta alasannya.
- Tombol WhatsApp langsung — membuka percakapan WhatsApp baru dengan nomor adik asuh
  dari dalam aplikasi.
- Tombol "Tidak Dapat Dihubungi" — KASUH dapat melaporkan adik yang tidak bisa
  dihubungi; laporan diteruskan ke SC untuk tindak lanjut. Aksi memerlukan konfirmasi
  dialog sebelum dikirim.
- Tautan ke halaman detail profil lengkap dan ke halaman logbook.

---

## 3. Profil Detail Adik Asuh (M03)

- Profil lengkap non-MH: nama, NRP, provinsi, status rantau, status KIP, nomor
  telepon, dan minat.
- Informasi skor kecocokan pairing dan alasan yang mendasarinya.
- Tombol WhatsApp dan "Tidak Dapat Dihubungi" tersedia di halaman detail.
- Data kesehatan mental tidak ditampilkan di profil ini sesuai kebijakan privasi.

---

## 4. Logbook Siklus (M09)

- Formulir logbook per siklus: status pertemuan (MET / NOT_MET), refleksi pertemuan,
  alasan ketidakhadiran (jika NOT_MET), catatan tindak lanjut, dan penanda urgensi.
- Status siklus ditampilkan secara dinamis — KASUH tahu apakah siklus sudah
  terlewat, mendekati tenggat, atau masih aman.
- Riwayat logbook siklus-siklus sebelumnya dapat dibuka dari halaman yang sama.
- Data nama adik asuh ditampilkan di header halaman untuk memastikan konteks.

---

## 5. Time Capsule & Life Map Adik Asuh (M07)

- Tampilan hanya-baca entri time capsule yang secara eksplisit dibagikan adik asuh
  kepada KASUH-nya — termasuk judul, isi, mood saat menulis, dan lampiran.
- Tampilan goals life map beserta milestone dan persentase progres.
- Banner pemberitahuan menjelaskan apabila adik asuh belum membagikan entri apapun
  (share gate belum aktif).
- Navigasi tab antara "Time Capsule" dan "Life Map" dalam satu halaman.
- Pagination untuk entri yang banyak (20 entri per halaman).
- Akses hanya tersedia selama pasangan KASUH-MABA masih berstatus aktif.

---

## Catatan Privasi dan Keamanan

- Akses data pulse adik asuh melewati kebijakan RLS dan setiap akses dicatat secara
  otomatis dalam audit log dengan tag KASUH_PULSE_READ.
- Entri time capsule hanya muncul apabila adik asuh mengaktifkan berbagi secara
  mandiri DAN pasangan masih aktif — dua kondisi ini dicek bersamaan di server.
- Data kesehatan mental (skor screening, catatan MH) tidak pernah ditampilkan di
  dashboard KASUH.
- Seluruh formulir yang mengubah data menggunakan perlindungan CSRF.

---

## Dokumen Terkait

- Arsitektur teknis: `src/app/(DashboardLayout)/dashboard/kasuh/README.md`
- Logbook library: `src/lib/m09-logbook/README.md`
- Pairing library: `src/lib/pairing/README.md`
- Pulse library: `src/lib/pulse/README.md`
- Time capsule library: `src/lib/time-capsule/README.md`
