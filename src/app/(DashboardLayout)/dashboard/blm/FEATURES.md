# Fitur Dashboard BLM

**Peran pengguna**: Anggota Badan Legislatif Mahasiswa (BLM)  
**Modul terkait**: M12 (Kanal Anonim), M14 (Triwulan)

Panduan teknis: [README.md](./README.md)

---

## 1. Ringkasan Dashboard

Halaman utama menampilkan widget KPI yang merangkum:
- Jumlah laporan anonim baru yang belum ditinjau
- Jumlah laporan dalam proses review (IN_REVIEW)
- Jumlah laporan yang telah diteruskan ke Satgas
- Jumlah review triwulan yang menunggu audit BLM

---

## 2. Antrean Laporan Anonim (Triage Queue)

Tampil di `/dashboard/blm/anon-reports`.

- Daftar semua laporan anonim yang masuk ke BLM, ditampilkan dalam tabel dengan kolom: tingkat keparahan, kategori, status, dan tanggal.
- Filter dan sortir berdasarkan status (`NEW`, `IN_REVIEW`, `ESCALATED_TO_SATGAS`, `RESOLVED`) dan tingkat keparahan.
- Klik baris untuk membuka halaman detail laporan.

---

## 3. Detail dan Penanganan Laporan Anonim

Tampil di `/dashboard/blm/anon-reports/[reportId]`.

### Tindakan yang tersedia:

**Akui Laporan (Acknowledge)**
- Mengubah status menjadi `IN_REVIEW` dan mengaitkan akun BLM yang sedang login.
- Dialog konfirmasi ditampilkan sebelum aksi dijalankan.

**Teruskan ke Satgas**
- Mengubah status menjadi `ESCALATED_TO_SATGAS` dan menandai `satgasEscalated = true`.
- Hanya tersedia selama status masih `IN_REVIEW` dan belum dieskalasi.
- Laporan kemudian muncul di antrean Satgas.

**Tambah Catatan**
- BLM dapat menambahkan catatan internal yang tidak terlihat oleh pelapor.

**Selesaikan Laporan**
- Menutup laporan dengan catatan resolusi.
- Tidak dapat dibatalkan setelah dieksekusi.

### Jejak Audit Akses
Setiap pembukaan halaman detail dan setiap tindakan dicatat secara otomatis dalam log akses anonim (`AnonAccessLog`) oleh sistem backend. Log ini hanya dapat dilihat oleh SUPERADMIN.

---

## 4. Daftar Review Triwulan

Tampil di `/dashboard/blm/triwulan`.

- Menampilkan semua review triwulan yang telah ditandatangani Pembina dan menunggu audit BLM.
- Ditandai dengan banner urgensi apabila ada eskalasi aktif.
- Setiap kartu menampilkan kode angkatan, nama cohort, status review, dan level eskalasi.

---

## 5. Audit Substansi Triwulan

Tampil di `/dashboard/blm/triwulan/[reviewId]/audit-substansi`.

- **Checklist audit substansi** — BLM memverifikasi muatan wajib yang telah dilaksanakan oleh cohort.
- **Editor narasi** — BLM menambahkan catatan naratif sebagai bagian dari audit legislatif.
- **Eskalasi flag** — Banner peringatan otomatis muncul apabila review memiliki tanda eskalasi urgen.
- **Akui Review** — BLM dapat mengakui review setelah audit substansi selesai, dengan opsi meminta revisi melalui `RevisionReasonDialog`.
- Status review diperbarui secara real-time setelah aksi berhasil.
