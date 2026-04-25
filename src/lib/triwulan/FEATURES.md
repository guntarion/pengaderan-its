# M14 — Triwulan Review, Sign-off & Audit — Katalog Fitur

Katalog fitur yang telah diimplementasikan dan yang direncanakan untuk modul M14. Dikelompokkan berdasarkan peran pengguna.

---

## Diimplementasikan

### SC (Steering Committee)

- Generate laporan triwulan baru untuk cohort dan nomor kuartal yang dipilih; sistem secara paralel mengumpulkan data dari seluruh modul NAWASENA (KPI, Kirkpatrick, insiden, laporan anonim, kehadiran, Pakta, pelanggaran tindakan terlarang) dan merakitnya menjadi satu snapshot beku. Jika sumber data gagal atau timeout, review tetap dibuat dengan tanda `dataPartial: true`.
- Melihat status eskalasi langsung setelah generate: NONE, WARNING, atau URGENT ditampilkan sebagai banner berwarna.
- Menulis atau menyempurnakan narasi eksekutif (ringkasan evaluasi kuartal) dengan auto-save berbasis debounce 3 detik. Minimal 200 karakter diperlukan sebelum bisa dikirim ke Pembina.
- Melihat data snapshot review: KPI, evaluasi Kirkpatrick (L1–L4), ringkasan insiden, laporan anonim, kepatuhan Pakta, kesehatan cohort, dan perbandingan cohort — semua dari data yang diambil saat generate dan tidak berubah setelahnya.
- Mengirim review ke Pembina dengan satu klik setelah narasi memenuhi syarat.
- Melihat riwayat revisi: review yang digantikan oleh revisi baru ditampilkan sebagai "Review Lama (Digantikan)" dan tetap dapat dibaca.
- Mengakses arsip semua review yang telah diselesaikan (FINALIZED) lintas kuartal, termasuk unduhan PDF.
- Mengunduh laporan PDF final via tautan presigned yang kedaluwarsa otomatis dalam 1 jam.

### Pembina

- Melihat daftar review yang menunggu tanda tangan, dengan filter otomatis ke status `SUBMITTED_FOR_PEMBINA`. Review dengan eskalasi URGENT ditampilkan dengan banner merah.
- Memeriksa seluruh isi review sebelum menandatangani: narasi SC, data KPI, evaluasi Kirkpatrick, insiden, rantai tanda tangan, dan banner eskalasi.
- Tanda tangan normal: menambahkan catatan opsional lalu menekan tombol konfirmasi. Review langsung masuk ke antrian audit BLM.
- Tanda tangan review URGENT: memerlukan (a) centang konfirmasi bahwa review telah dilakukan tatap muka dengan SC, dan (b) catatan Pembina minimal 200 karakter. Sistem menolak tanda tangan jika salah satu syarat tidak terpenuhi.
- Meminta revisi ke SC: memberikan alasan revisi melalui dialog; sistem membuat review DRAFT baru untuk SC, dan review lama ditandai sebagai superseded.
- Mengakses arsip read-only untuk semua review yang telah difinalisasi.

### BLM (Badan Legislatif Mahasiswa)

- Melihat daftar review yang sudah ditandatangani Pembina dan menunggu audit substansi (status `PEMBINA_SIGNED`).
- Mengaudit 10 muatan wajib kaderisasi sesuai Kerangka §7 per review:

  | No | Muatan Wajib |
  |----|--------------|
  | 1 | Narasi Sepuluh Nopember |
  | 2 | Advancing Humanity (Tagline ITS) |
  | 3 | 6 Tata Nilai ITS |
  | 4 | Pendidikan Integralistik |
  | 5 | Struktur Keluarga Mahasiswa ITS |
  | 6 | Tri Dharma Perguruan Tinggi |
  | 7 | Kode Etik Mahasiswa ITS |
  | 8 | Permen 55/2024 & Satgas PPKPT |
  | 9 | Riset & Inovasi ITS |
  | 10 | Keinsinyuran & PII |

  Setiap muatan dinilai dengan status: **Tercakup**, **Sebagian Tercakup**, **Tidak Tercakup**, atau **Belum Dinilai**. Penilaian Sebagian Tercakup atau Tidak Tercakup wajib disertai catatan minimal 50 karakter. Penilaian disimpan otomatis setiap 10 detik.

- Melihat progress bar real-time yang menunjukkan berapa dari 10 item yang sudah dinilai (berbeda dari NOT_ASSESSED).
- Mengakui review secara formal (acknowledge) setelah semua 10 muatan dinilai. Sistem otomatis memicu render laporan PDF final di latar belakang.
- Meminta revisi ke SC dengan alasan minimal tertentu; sistem membuat review DRAFT baru.
- Mengakses arsip read-only lintas kuartal.

### SUPERADMIN

- Mengakses semua review lintas organisasi (melewati RLS) dengan log audit otomatis.
- Men-generate review atas nama SC untuk cohort manapun.
- Memicu regenerasi PDF yang gagal via `POST /api/triwulan/[id]/pdf/regenerate`.
- Menerima notifikasi CRITICAL untuk review yang macet lebih dari 14 hari atau kegagalan render PDF.

---

### Eskalasi Otomatis

Pada saat generate, sistem menjalankan 6 aturan eskalasi terhadap snapshot:

| Aturan | Tingkat | Pemicu Default |
|--------|---------|----------------|
| RETENTION_LOW | URGENT | Tingkat retensi cohort < 85% |
| FORBIDDEN_ACTS_VIOLATION | URGENT | Ada pelanggaran tindakan terlarang (threshold 0) |
| INCIDENTS_RED_UNRESOLVED | URGENT | Insiden merah belum terselesaikan > 3 |
| ANON_HARASSMENT_PRESENT | URGENT | Laporan anonim kategori harassment > 0 |
| PAKTA_SIGNING_LOW | WARNING | Signing rate Pakta < 90% untuk peran manapun |
| NPS_NEGATIVE | WARNING | NPS rata-rata < 0 |

Threshold dapat di-override per organisasi via `Organization.settings.triwulanEscalationThresholds`. Notifikasi M15 dikirim ke pihak terkait pada deteksi URGENT.

### PDF Final Otomatis

Setelah BLM acknowledge, laporan PDF di-render secara asinkron:
- Halaman sampul, ringkasan eksekutif, tabel KPI dengan grafik batang, evaluasi Kirkpatrick, ringkasan insiden dan laporan anonim, hasil audit substansi BLM, banner eskalasi, rantai tanda tangan lengkap, footer dengan informasi kerahasiaan.
- Diunggah ke cloud storage (S3/DO Spaces); unduhan via tautan presigned yang kedaluwarsa dalam 1 jam.
- Tombol unduh di UI menampilkan status render secara real-time (polling 5 detik): PENDING, RENDERING, READY, atau FAILED.
- Pada kegagalan setelah 3 percobaan dengan backoff eksponensial: status `FAILED` dan notifikasi M15 ke SC + SUPERADMIN.

### Revisi Lineage

Setiap permintaan revisi (oleh Pembina atau BLM) menghasilkan review DRAFT baru yang memanggil ulang generator untuk snapshot segar. Review lama tetap tersimpan dan dapat dibaca; tidak dihapus. SC dapat melacak seluruh histori revisi kuartal melalui halaman list.

### Arsip Triwulan

Semua review berstatus FINALIZED dapat diakses dari halaman arsip read-only lintas kuartal, dengan unduhan PDF. Halaman ini dapat diakses oleh SC, Pembina, BLM, dan SUPERADMIN. Data arsip di-cache (TTL panjang) untuk performa query.

### Pengingat dan Notifikasi Otomatis (Cron)

- **Harian 09:00 WIB**: cron `triwulan-overdue-reminder` memeriksa review yang macet. Review macet 3+ hari → notifikasi OPS ke pihak bertanggung jawab. Review macet 14+ hari → notifikasi CRITICAL ke BLM + SUPERADMIN.
- **Bulanan 1 tiap bulan**: cron `triwulan-retention-purge` mengidentifikasi review superseded yang berumur lebih dari 365 hari. Mode dry-run aktif secara default; penghapusan aktual memerlukan parameter eksplisit `?dryRun=false`.

### Keamanan Jejak Tanda Tangan

Setiap aksi dicatat sebagai `TriwulanSignatureEvent` (GENERATE, SUBMIT, PEMBINA_SIGN, BLM_AUDIT_ITEM_TICK, BLM_ACKNOWLEDGE, PEMBINA_REQUEST_REVISION, BLM_REQUEST_REVISION, PDF_DOWNLOAD, dst.). Tabel ini dilindungi `REVOKE UPDATE, DELETE FROM app_role` di level database — tidak dapat diubah atau dihapus bahkan melalui kode aplikasi.

---

## Direncanakan / Ditangguhkan

### Komponen Perbandingan Cohort (G.3 — ditangguhkan)

- `CohortComparisonChart.tsx` dan `CohortComparisonTable.tsx` — visualisasi perbandingan KPI lintas cohort dalam satu organisasi. Ditangguhkan karena memerlukan keputusan library charting untuk konteks server-side. Data `cohortComparison` sudah ada di snapshot JSON.

### E2E Test Suite (I.2)

- Seluruh skenario Playwright untuk full lifecycle, termasuk: generate → edit → submit → sign (normal + URGENT) → request revision → audit substansi → acknowledge → PDF → arsip. Belum ditulis.

### Load Testing (I.3)

- 10 render PDF konkuren, 50 generate review per 5 menit, query arsip 200+ reviews p95 < 500 ms.

### UAT dan Rollout (I.4)

- Verifikasi dark mode, audit aksesibilitas (a11y), UAT staging SC + Pembina + BLM full cycle, handover ke tim maintenance.

### Konfigurasi Threshold Eskalasi via UI (V1.1)

- Saat ini threshold hanya dapat diubah via `Organization.settings` secara langsung. UI admin untuk mengonfigurasi threshold per organisasi belum ada.

### Streaming PDF tanpa Presigned URL (V1.1)

- Endpoint `/api/triwulan/[id]/pdf` saat ini menghasilkan presigned URL yang dapat dibagikan. Upgrade ke session-gated PDF streaming mencegah tautan presigned beredar ke pihak yang tidak berwenang.
