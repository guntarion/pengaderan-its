# Fitur — Pembina Dashboard

Dokumentasi fitur yang tersedia bagi pengguna dengan peran Pembina (dosen wali /
pembina akademik program kaderisasi).

## Dashboard Utama

### Ringkasan Program
Widget `KirkpatrickSnapshot` dan `ComplianceIndicator` menyajikan gambaran
singkat kondisi program: seberapa jauh peserta memenuhi dokumen digital wajib dan
bagaimana efektivitas kegiatan diukur dalam 4 level evaluasi Kirkpatrick.

### Peringatan Aktif
`AlertsPanel` menampilkan eskalasi yang perlu perhatian Pembina: review triwulan
menunggu tanda tangan, insiden safeguard belum ditindak, dan angkatan yang
melampaui batas kepatuhan.

## Manajemen Review Triwulan

### Antrian Tanda Tangan
Halaman `/pembina/triwulan` menampilkan semua review berstatus
`SUBMITTED_FOR_PEMBINA` atau `PEMBINA_SIGNED`. Indikator urgensi muncul jika
review memiliki escalation flag kritis.

### Halaman Tanda Tangan (`/triwulan/[reviewId]/sign`)
Pembina dapat meninjau isi penuh review triwulan yang diajukan SC:

- **Tabel KPI Snapshot** — metrik kinerja angkatan per periode
- **Evaluasi Kirkpatrick** — rekapitulasi 4-level dari seluruh kegiatan
- **Ringkasan Insiden** — insiden safeguard yang tercatat dalam kuartal berjalan
- **Narasi SC** — teks naratif yang disusun oleh Steering Committee
- **Banner Eskalasi** — peringatan visual untuk kondisi kritis (threshold pelanggaran,
  kehadiran rendah, dll.)
- **Riwayat Tanda Tangan** — timeline tanda tangan SC → Pembina → BLM

### Tanda Tangan Resmi
Setelah menelaah isi review, Pembina memilih "Tanda Tangan" melalui
`SignConfirmDialog`. Tindakan ini mengubah status review menjadi `PEMBINA_SIGNED`
dan meneruskan dokumen ke BLM untuk audit substansi.

### Permintaan Revisi
Jika narasi atau data dirasa tidak tepat, Pembina dapat memilih "Minta Revisi"
melalui `RevisionReasonDialog`. Review lama di-supersede secara otomatis dan SC
menerima draft baru untuk diperbaiki, sehingga riwayat lengkap tetap tersimpan.

### Riwayat Tanda Tangan
`SignatureChainTimeline` memberikan visibilitas penuh atas posisi dokumen dalam
rantai sign-off: siapa sudah menandatangani, siapa belum, dan kapan setiap aksi
dilakukan.
