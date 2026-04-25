# Fitur Dashboard SAC

**Peran pengguna**: Konselor Student Affairs (SAC) — pengguna dengan flag `isSACCounselor = true`  
**Modul terkait**: M11 (Mental Health Screening)

Panduan teknis: [README.md](./README.md)

---

## 1. Antrean Kasus Skrining

Tampil di `/dashboard/sac/screening-queue`.

- Menampilkan daftar referral yang ditugaskan kepada SAC yang sedang login.
- Kasus prioritas RED (keparahan tinggi) ditandai secara visual untuk penanganan segera.
- Tombol refresh tersedia untuk memperbarui antrean tanpa reload halaman.
- Tabel menampilkan: nama (disamarkan), tanggal skrining, status referral, dan prioritas.

---

## 2. Detail Kasus

Tampil di `/dashboard/sac/screening-queue/[id]`.

### Informasi yang ditampilkan:
- Metadata referral: tanggal, status, nama konselor yang ditugaskan
- Ringkasan hasil skrining tanpa jawaban terenkripsi (default)

### Dekripsi Jawaban Skrining (Decrypt-on-Demand)

- Tombol "Dekripsi & Lihat Jawaban" tersedia di halaman detail.
- Dialog peringatan audit ditampilkan sebelum proses dekripsi dimulai.
- Setelah konfirmasi, sistem mencatat akses dekripsi ke audit log **sebelum** mengembalikan data.
- Jawaban hanya tampil di sesi browser saat ini dan tidak disimpan di cache.

### Tindakan lanjutan dari detail:
- Tautan ke halaman follow-up untuk menambahkan catatan tindak lanjut
- Referensi silang ke insiden safeguard M10 (jika relevan)

---

## 3. Catatan Tindak Lanjut

Tampil di `/dashboard/sac/screening-queue/[id]/follow-up`.

- SAC mengisi catatan tindak lanjut dan memperbarui status referral.
- Status yang tersedia: `IN_PROGRESS`, `RESOLVED`, atau status lain sesuai alur penanganan.
- Formulir menggunakan komponen `SACFollowUpForm` dengan validasi sisi klien.

---

## 4. Penugasan Otomatis Round-Robin

- Saat MABA menyelesaikan skrining dan hasilnya membutuhkan tindak lanjut, sistem secara otomatis menugaskan kasus ke SAC dengan jumlah referral aktif paling sedikit.
- Penugasan menggunakan mekanisme `SELECT FOR UPDATE SKIP LOCKED` untuk mencegah kondisi balapan pada pengiriman simultan.

---

## 5. Eskalasi Otomatis ke Poli Psikologi

- Kasus RED yang tidak diakui dalam batas waktu SLA akan dieskalasi secara otomatis oleh proses terjadwal (cron hourly) ke koordinator Poli Psikologi.
- Koordinator dapat melihat semua referral dalam organisasi dan melakukan penugasan ulang.

---

## 6. Keamanan dan Privasi

- SAC hanya dapat melihat referral yang ditugaskan kepada mereka sendiri (dibatasi oleh RLS PostgreSQL).
- Setiap akses dekripsi dicatat dalam audit log yang hanya dapat diakses oleh SUPERADMIN.
- Koordinator Poli Psikologi memiliki visibilitas lebih luas tetapi tetap terbatas pada organisasi yang sama.
