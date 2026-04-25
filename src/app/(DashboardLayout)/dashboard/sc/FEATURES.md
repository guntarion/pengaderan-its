# Fitur — SC Dashboard

Dokumentasi fitur yang tersedia bagi pengguna dengan peran Steering Committee (SC).

## Dashboard Utama

### Snapshot Agregat Cohort
Menampilkan ringkasan kondisi angkatan secara keseluruhan dalam satu layar:
Kirkpatrick 4-level (reaction, learning, behavior, results), tingkat kepatuhan
dokumen digital, dan indikator mood kolektif.

### Monitor Mood Live
Widget `MoodCard` memuat ulang data mood angkatan secara otomatis setiap ~30 detik
tanpa perlu refresh halaman. SC dapat memantau tren emosional peserta secara
real-time selama kegiatan berlangsung.

### Panel Peringatan (Alerts)
`AlertsPanel` menyajikan daftar eskalasi aktif: insiden safeguard yang belum
ditindak, threshold kepatuhan yang terlampaui, dan angkatan yang mendekati
batas triwulan. Setiap peringatan dapat diklik untuk navigasi langsung ke detail.

### Indikator Kepatuhan
`ComplianceIndicator` menampilkan persentase penyelesaian pakta digital, passport,
dan jurnal harian per angkatan. Warna indikator berubah sesuai ambang batas
yang dikonfigurasi.

## Manajemen Review Triwulan

### Daftar Review
Halaman `/triwulan` memuat semua review aktif beserta status (`DRAFT`,
`SUBMITTED_FOR_PEMBINA`, `PEMBINA_SIGNED`, dll.) dan penanda urgensi jika ada
escalation flag.

### Buat Review Baru
Form `/triwulan/new` memungkinkan SC memilih angkatan dan kuartal lalu memicu
`/api/triwulan/generate` untuk membuat snapshot data otomatis (KPI, Kirkpatrick,
insiden) sebagai dasar narasi.

### Edit Narasi dan Submit
Halaman `/triwulan/[reviewId]` menyediakan editor narasi (`NarrativeEditor`),
tampilan KPI (`SnapshotKPITable`), ringkasan Kirkpatrick
(`SnapshotKirkpatrickSection`), dan ringkasan insiden (`SnapshotIncidentSummary`).
SC mengisi narasi lalu men-submit ke Pembina untuk tanda tangan.

### Riwayat Tanda Tangan
`SignatureChainTimeline` menampilkan urutan tanda tangan SC → Pembina → BLM
beserta tanggal dan keterangan masing-masing tahap.

Lihat juga: `src/app/(DashboardLayout)/dashboard/sc/triwulan/FEATURES.md`
