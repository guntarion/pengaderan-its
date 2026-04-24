# Fitur M14 — Triwulan Review, Sign-off & Audit

## Untuk SC (Steering Committee)

### Generate Review Triwulanan
SC dapat membuat laporan triwulan baru untuk cohort yang dipilih. Sistem secara otomatis mengumpulkan data dari seluruh modul NAWASENA (KPI, Kirkpatrick, insiden, laporan anonim, kehadiran, dll.) dan merakitnya menjadi satu snapshot. Jika ada sumber data yang tidak tersedia, review tetap dibuat dengan tanda "data parsial".

### Edit Narasi Eksekutif
Setelah review dibuat, SC menulis atau menyempurnakan narasi eksekutif — ringkasan evaluasi triwulan dalam bahasa formal. Narasi disimpan otomatis saat SC berhenti mengetik (debounce 3 detik). Minimal 200 karakter diperlukan sebelum dapat dikirim ke Pembina.

### Melihat Data Snapshot
Review menampilkan data KPI, hasil evaluasi Kirkpatrick, ringkasan insiden dan laporan keamanan dalam format yang dapat dilipat/dibuka. Semua data bersumber dari snapshot yang diambil pada saat generate — tidak berubah meskipun data asli diperbarui kemudian.

### Kirim ke Pembina
Setelah narasi selesai (minimal 200 karakter), SC mengirim review ke Pembina dengan satu klik. Review masuk ke antrian tanda tangan Pembina.

### Arsip Review
SC dapat melihat semua review yang telah selesai (BLM acknowledged dan finalized) untuk cohort mereka, lengkap dengan unduhan PDF.

---

## Untuk Pembina

### Melihat Review Masuk
Pembina melihat daftar review yang menunggu tanda tangan, diurutkan berdasarkan tanggal submit. Review dengan eskalasi URGENT ditampilkan dengan banner merah.

### Memeriksa Detail Review
Pembina dapat melihat seluruh isi review: narasi SC, data KPI, evaluasi Kirkpatrick, insiden, dan jejak tanda tangan. Konten yang sama dengan yang akan masuk ke PDF final.

### Tanda Tangan Normal
Untuk review tanpa eskalasi URGENT, Pembina menambahkan catatan opsional dan menekan tombol "Tanda Tangani". Review langsung masuk ke antrian audit BLM.

### Tanda Tangan Review URGENT
Review dengan eskalasi URGENT (retention sangat rendah, pelanggaran tindakan terlarang, insiden tidak terselesaikan, dll.) memerlukan prosedur khusus:
- Pembina harus mencentang konfirmasi bahwa review telah dilakukan tatap muka dengan SC
- Catatan Pembina minimal 200 karakter

### Minta Revisi ke SC
Jika review dinilai belum layak, Pembina dapat meminta SC merevisinya dengan memberikan alasan. Sistem membuat review DRAFT baru; review lama ditandai sebagai superseded dan hanya dapat dibaca.

---

## Untuk BLM (Badan Legislatif Mahasiswa)

### Melihat Review Siap Diaudit
BLM melihat review yang sudah ditandatangani Pembina dan menunggu audit substansi.

### Audit Substansi — 10 Muatan Wajib
BLM menilai 10 muatan wajib kaderisasi sesuai Kerangka §7:
1. Narasi Sepuluh Nopember
2. Advancing Humanity (tagline ITS)
3. Enam Tata Nilai ITS
4. Pendidikan Integralistik
5. Struktur Keluarga Mahasiswa ITS
6. Tri Dharma Perguruan Tinggi
7. Kode Etik Mahasiswa ITS
8. Permen 55/2024 & Satgas PPKPT
9. Riset & Inovasi ITS
10. Keinsinyuran & PII

Setiap muatan dinilai dengan status: **Tercakup**, **Sebagian Tercakup**, **Tidak Tercakup**, atau **Belum Dinilai**. Penilaian Sebagian Tercakup atau Tidak Tercakup wajib disertai catatan minimal 50 karakter. Penilaian disimpan otomatis setiap 10 detik.

### Progress Bar
Indikator progress real-time menunjukkan berapa dari 10 item yang sudah dinilai (berbeda dari NOT_ASSESSED).

### Acknowledge Review
Setelah semua 10 muatan dinilai, BLM mengakui review secara formal. Sistem kemudian secara otomatis men-*generate* laporan PDF final di latar belakang.

### Minta Revisi ke SC
BLM juga dapat meminta revisi dengan alasan minimal 50 karakter. Sistem membuat review DRAFT baru untuk SC.

---

## Fitur Umum

### Eskalasi Otomatis
Saat review di-generate, sistem mendeteksi kondisi berisiko secara otomatis berdasarkan 6 aturan:
- **URGENT**: retention sangat rendah (<85%), pelanggaran tindakan terlarang, insiden RED tidak terselesaikan, laporan harassment anonim
- **WARNING**: signing rate Pakta rendah (<90%), NPS negatif

Level eskalasi ditampilkan di seluruh UI sebagai banner berwarna. Notifikasi dikirim ke pihak terkait via M15.

### PDF Final Otomatis
Setelah BLM acknowledge, laporan PDF 7-halaman di-*render* secara otomatis:
- Halaman sampul, ringkasan eksekutif, data KPI (dengan grafik batang)
- Evaluasi Kirkpatrick, insiden & keamanan
- Hasil audit substansi BLM
- Rantai tanda tangan (GENERATE → SUBMIT → PEMBINA_SIGN → BLM_ACKNOWLEDGE)

PDF diunggah ke cloud storage (DigitalOcean Spaces/S3) dan dapat diunduh via tautan *presigned* yang kedaluwarsa otomatis. Tombol unduh menampilkan status render (pending/rendering/siap/gagal) secara *real-time* (polling 5 detik).

### Revisi Lineage
Setiap permintaan revisi menghasilkan review baru yang mewarisi snapshot data dari review sebelumnya. Review lama tetap tersimpan (tidak dihapus) dan ditandai sebagai superseded. SC dapat melacak histori revisi.

### Arsip Triwulan
Semua review yang telah selesai dapat diakses dari halaman arsip lintas triwulan. Data tersimpan permanen untuk keperluan audit dan pelaporan ke Dirmawa.

### Pengingat Otomatis (Cron)
- **3 hari overdue**: notifikasi OPS ke pihak yang bertanggung jawab
- **14 hari overdue**: notifikasi CRITICAL ke semua pihak terkait

### Retensi Data
Review beserta PDF yang berumur lebih dari 5 tahun akan dihapus otomatis oleh cron bulanan (mode dry-run default — harus diaktifkan secara eksplisit oleh SUPERADMIN).

### Keamanan Jejak Tanda Tangan
Setiap aksi (generate, submit, sign, acknowledge, revision) dicatat sebagai `TriwulanSignatureEvent` yang dilindungi di level database — tidak dapat diubah atau dihapus bahkan oleh application code. Ini memastikan integritas audit trail.
