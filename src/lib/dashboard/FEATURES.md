# M13 — Dashboard Multi-Role — Katalog Fitur

Katalog fitur produk untuk modul Dashboard Multi-Role (M13). Mencakup fitur yang sudah diimplementasi dan yang masih direncanakan.

Lihat [README.md](./README.md) untuk dokumentasi arsitektur teknis.

---

## Diimplementasi

### Routing Otomatis Berdasarkan Role

- Halaman `/dashboard` membaca role sesi pengguna dan langsung mengalihkan ke dashboard yang sesuai (`/dashboard/maba`, `/dashboard/sc`, dst.) tanpa klik tambahan.
- Role yang tidak memiliki dashboard khusus (SUPERADMIN, legacy) mendapatkan menu pilihan panel admin.
- Halaman `/dashboard/unauthorized` menampilkan pesan ramah ketika pengguna mencoba mengakses dashboard role lain, dengan tombol kembali dan tautan ke dashboard sendiri.

---

### Dashboard Mahasiswa Baru (MABA)

- **Streak Pulse Check**: menampilkan jumlah hari berturut-turut pengisian pulse; tautan langsung ke halaman Pulse Check.
- **Progress Passport**: cincin progres (ProgressRing) menampilkan persentase aktivitas passport yang sudah diverifikasi.
- **Mood Hari Ini**: rata-rata mood harian dari PulseCheck dengan sparkline 7 hari.
- **Agenda Mendatang**: daftar kegiatan dalam 7 hari ke depan beserta status RSVP.
- **Alat & Bantuan**: menu cepat menuju Kesehatan Mental, Kakak Konselor, Pulse Check, Jurnal Harian, dan Passport.
- **Pakta Gate**: jika Pakta Digital belum ditandatangani, pengguna dialihkan otomatis ke halaman penandatanganan Pakta.

---

### Dashboard KP (Koordinator Pelaksana)

- **Heatmap Mood Kelompok**: tabel per anggota KP-Group dengan riwayat skor mood harian.
- **Red Flag Aktif**: panel alert yang ditargetkan ke role KP, dengan tautan drill-down ke sumber masalah.
- **Pengingat Debrief**: banner apabila sesi debrief KP sudah melewati batas 14 hari.
- **Antrian Review Passport**: jumlah entri passport yang menunggu verifikasi oleh KP.

---

### Dashboard KASUH (Kakak Asuh)

- **Daftar Adik Asuh**: kartu per adik dengan streak pulse, streak jurnal, dan tren mood 7 hari.
- **Deadline Logbook**: tanggal jatuh tempo logbook KASUH berikutnya.

---

### Dashboard OC (Organizing Committee)

- **Agenda sebagai PIC**: daftar kegiatan mendatang yang OC ini terdaftar sebagai penanggung jawab.
- **Evaluasi Tertunda**: jumlah kegiatan yang belum memiliki evaluasi pasca-acara.
- **NPS Terbaru**: tabel NPS tiga kegiatan terakhir (nama kegiatan, rata-rata NPS, jumlah responden).

---

### Dashboard BLM (Badan Legislatif Mahasiswa)

- **Antrian Laporan Anonim**: jumlah laporan berstatus NEW atau IN_REVIEW yang menunggu tindak lanjut BLM.
- **Breakdown Laporan per Keparahan**: hitungan laporan merah/kuning/hijau.
- **Indikator Kepatuhan**: progres Pakta Panitia, Social Contract MABA, pelanggaran Forbidden Acts, dan checklist 10 butir Permen 55/2024.

---

### Dashboard Pembina

- **Kirkpatrick Kompak**: snapshot empat level (L1 Reaksi, L2 Pembelajaran, L3 Perilaku, L4 Hasil) dengan badge partial untuk L4.
- **Indikator Kepatuhan**: sama dengan BLM — Pakta, Social Contract, FA, Permen 55.
- **Eskalasi Kritis**: daftar RedFlagAlert berseveritas CRITICAL yang ditargetkan ke Pembina.

---

### Dashboard Satgas

- **Insiden Berat**: jumlah insiden safeguard dengan status aktif atau tingkat keparahan tinggi.
- **Laporan Anonim Berat**: hitungan laporan anonim merah (kritis) dan kuning — hanya jumlah, tanpa isi laporan.
- **Statistik Program**: total MABA, jumlah MABA aktif, jumlah kegiatan yang sudah selesai.

---

### Dashboard SC (Steering Committee)

- **Kirkpatrick Lengkap**: empat level dengan sparkline tren 30 hari per level, badge partial, dan tautan drill-down per level ke modul sumber.
- **Mood Angkatan (Live)**: rata-rata mood seluruh cohort hari ini, diperbarui otomatis setiap 60 detik tanpa reload halaman; badge waktu polling terakhir di header.
- **Panel Alert Aktif**: daftar semua RedFlagAlert berstatus ACTIVE yang ditargetkan ke SC, diurutkan berdasarkan keparahan; setiap alert memiliki tautan drill-down ke halaman terkait.
- **Laporan Anonim — Hanya Jumlah**: breakdown total/kritis/tinggi/sedang dengan privasi k≥5 (kelompok di bawah 5 ditampilkan sebagai 0).
- **Indikator Kepatuhan**: Pakta Panitia %, Social Contract MABA %, Forbidden Acts, Permen 55.

---

### Infrastruktur Dashboard (Dipakai Semua Role)

- **Payload caching Redis 5 menit**: setiap kombinasi `(role, userId, cohortId)` di-cache; cache diinvalidasi setelah mutasi data terkait.
- **Widget Error Boundary**: widget yang crash menampilkan kartu error lokal tanpa menjatuhkan seluruh halaman.
- **Empty State & Partial Data Badge**: setiap widget menangani kondisi data kosong dan data parsial secara konsisten.
- **Skeleton loading**: halaman menampilkan skeleton card selama payload dimuat.
- **Breadcrumb dinamis**: setiap halaman dashboard menggunakan `DynamicBreadcrumb`.

---

### Mesin Agregasi KPI (Backend)

- **10 handler KPI otomatis** terdaftar di `MEASURE_METHOD_REGISTRY`:
  - `PULSE_AVG_7D`, `PULSE_AVG_30D` — rata-rata mood pulse
  - `NPS_AVG_30D` — rata-rata NPS kegiatan
  - `ATTENDANCE_RATE_30D` — tingkat kehadiran
  - `RUBRIK_AVG_MONTHLY` — rata-rata skor rubrik
  - `JOURNAL_SUBMISSION_RATE_7D` — tingkat pengumpulan jurnal
  - `PASSPORT_COMPLETION_RATE` — tingkat penyelesaian passport
  - `INCIDENT_RESOLUTION_RATE` — tingkat penyelesaian insiden
  - `KASUH_LOG_COMPLETION_RATE` — tingkat kelengkapan logbook KASUH
  - `PAKTA_SIGNED_RATE` — tingkat penandatanganan Pakta oleh panitia

- **Kirkpatrick L1–L4** dihitung dalam `kirkpatrick.ts`:
  - L1 Reaksi: rata-rata EventNPS 30 hari terakhir (sumber M06)
  - L2 Pembelajaran: rata-rata RubrikScore (sumber M04/M05)
  - L3 Perilaku: tingkat kehadiran (sumber M06/M08)
  - L4 Hasil: tingkat retensi anggota aktif; IPS dan LKMM-TD menunggu integrasi SIAKAD (selalu partial)

- **Cron Nightly** (`POST /api/cron/nightly`, jadwal 02:00 WIB): iterasi semua cohort aktif, hitung semua KPI, simpan `KPISignal` baru.

---

### Mesin Red Flag (Backend)

- **8 aturan otomatis** dengan auto-resolve:
  1. `PULSE_LOW_3D` — skor pulse ≤2 selama 3 hari berturut-turut
  2. `JOURNAL_DORMANT_14D` — tidak ada jurnal selama 14 hari
  3. `KP_DEBRIEF_OVERDUE_14D` — debrief KP melewati 14 hari
  4. `PAKTA_UNSIGNED_7D` — Pakta belum ditandatangani 7 hari setelah registrasi
  5. `INCIDENT_CREATED_UNASSIGNED` — insiden M10 tanpa handler selama 24 jam
  6. `ANON_REPORT_RED_NEW` — laporan anonim baru berseveritas merah
  7. `MOOD_COHORT_DROP` — rata-rata mood cohort turun >20% dibanding baseline 7 hari
  8. `NPS_DROP` — NPS kegiatan di bawah ambang batas

- **Cron setiap 30 menit** (`POST /api/cron/redflag-engine`): evaluasi semua aturan, upsert alert yang masih aktif, auto-resolve alert yang kondisinya sudah selesai.
- Alert memiliki lifecycle lengkap: `ACTIVE` → `ACKNOWLEDGED` / `DISMISSED` / `SNOOZED` → `RESOLVED`.

---

### Keamanan & Privasi

- **RBAC dua lapis**: middleware Next.js memeriksa rute `/dashboard/<role>`, dan API handler memeriksa ulang role sebelum membangun payload.
- **Cell floor k≥5**: data agregat kesehatan mental dan laporan anonim di dashboard SC dan Satgas menerapkan ambang minimal 5 sebelum ditampilkan.
- **Tidak ada isi laporan anonim** di dashboard SC/Satgas/BLM — hanya hitungan.
- **Tidak ada data MH individual** di dashboard manapun — hanya agregat cohort.
- **RLS PostgreSQL** aktif di tabel `kpi_signals` dan `red_flag_alerts` berdasarkan `organizationId`.
- **CRON_SECRET** melindungi endpoint cron dari pemicu tidak sah.

---

## Direncanakan / Ditangguhkan

### E2E Tests — Per Role & Privasi (Phase 9)

- 8 file spec `e2e/dashboard/dashboard-<role>.spec.ts` — login → redirect benar → widget tampil → drill-down.
- `e2e/dashboard/privacy.spec.ts` — SC tidak dapat akses data MH individual, SC hanya melihat hitungan anonim, isolasi lintas-organisasi.
- SC polling test: verifikasi mood diperbarui setelah 60 detik.

### Load Test (Phase 9)

- k6/Artillery 100 concurrent user pada endpoint polling mood SC.
- Target p95 < 500ms.

### Validasi Performa FCP (Phase 9)

- First Contentful Paint < 1.5s pada cache hit, < 3s pada cache miss, untuk semua 8 dashboard.
- Hasil dicatat di `docs/modul/13-dashboard-multi-role/PERFORMANCE.md`.

### Audit Log Drill-Down Lintas Organisasi

- Rekam audit log ketika SUPERADMIN membuka dashboard cohort dari organisasi lain.
- Menggunakan helper M01 §6 R-A5.

### Integrasi SIAKAD untuk Kirkpatrick L4

- Mengambil data IPS dan status LKMM-TD dari SIAKAD.
- Badge partial pada L4 akan dihapus setelah integrasi selesai.
