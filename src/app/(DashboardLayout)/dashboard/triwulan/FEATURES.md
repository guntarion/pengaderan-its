# Fitur — Triwulan Archive Viewer

Dokumentasi fitur halaman arsip review triwulan. Semua tampilan bersifat
read-only — tidak ada aksi mutasi data yang tersedia di seksi ini.

## Daftar Arsip (`/triwulan/archive`)

### Daftar Review Terarsip
Menampilkan seluruh review triwulan yang telah melewati proses sign-off penuh
(status `PEMBINA_SIGNED`, `BLM_ACKNOWLEDGED`, atau `FINALIZED`). Setiap entri
menampilkan:

- Nama angkatan dan nomor kuartal
- Status review dengan badge berwarna
- Tingkat eskalasi (`NONE`, `YELLOW`, `RED`)
- Tautan ke halaman detail
- Tombol unduh PDF (jika PDF sudah digenerate)

### Navigasi ke Detail
Setiap baris dapat diklik untuk membuka halaman detail lengkap review.

## Detail Arsip (`/triwulan/archive/[reviewId]`)

### KPI Snapshot
Tabel `SnapshotKPITable` menampilkan metrik kinerja angkatan yang diambil pada
saat review dibuat: tingkat kehadiran, penyelesaian passport, kepatuhan jurnal,
dan indikator lainnya.

### Evaluasi Kirkpatrick
`SnapshotKirkpatrickSection` menyajikan hasil evaluasi 4-level Kirkpatrick
(reaction, learning, behavior, results) dari seluruh kegiatan dalam kuartal
berjalan.

### Ringkasan Insiden
`SnapshotIncidentSummary` merekap insiden safeguard yang tercatat dalam periode
review: jumlah insiden, kategori, dan status penanganan.

### Audit Substansi BLM
`AuditSubstansiChecklist` menampilkan hasil audit 10 muatan wajib yang dilakukan
BLM sebelum review difinalisasi. Setiap muatan ditandai terpenuhi atau tidak.

### Banner Eskalasi
`EscalationFlagBanner` menampilkan flag kritis yang dipicu otomatis oleh sistem
(misalnya: kehadiran di bawah threshold, insiden berulang) sehingga pembaca dapat
memahami konteks kondisi angkatan saat itu.

### Riwayat Tanda Tangan
`SignatureChainTimeline` menampilkan urutan lengkap tanda tangan:
SC (penyusun) → Pembina (validasi) → BLM (audit substansi), beserta tanggal
masing-masing aksi.

### Unduh PDF
Tombol `PDFDownloadButton` tersedia jika PDF sudah digenerate. Mengunduh
dokumen resmi review dalam format PDF dengan satu klik.
