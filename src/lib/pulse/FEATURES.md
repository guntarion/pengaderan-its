# M04 Pulse Harian & Weekly Journal — Katalog Fitur

Katalog fitur produk untuk modul Pulse Harian & Weekly Journal. Mencakup fitur yang sudah diimplementasikan dan yang direncanakan.

---

## Diimplementasikan

### Fase A — Schema, Migrasi, Seed

- Skema database M04 siap dengan 6 tabel: `PulseCheck`, `JournalDraft`, `Journal`, `RubrikScore`, `RedFlagEvent`, `FollowUpRecord`.
- Row Level Security (RLS) aktif di semua tabel — data terisolasi per organisasi; Maba hanya bisa baca data diri sendiri.
- Data contoh untuk pengembangan tersedia (Maba, pulse 7 hari, jurnal minggu 1).

---

### Fase B — Pulse Harian (MABA)

**Check-in Mood Harian**
- Maba mengisi mood 1–5 dengan pilihan emoji (tampilan mobile-first, tombol 48×48 px).
- Opsi komentar singkat maksimum 100 karakter.
- Satu check-in per hari (berdasar tanggal lokal WIB) — pengiriman kedua di hari yang sama ditolak.

**Offline-First (PWA)**
- Bila tidak ada koneksi internet, pulse masuk ke antrian IndexedDB lokal.
- Saat koneksi pulih, antrian di-sync otomatis ke server (sinkronisasi bulk maks 30 entri).
- Indikator status online/offline ditampilkan di layar.
- Bulk sync idempoten: entri yang sudah ada di server tidak di-duplikat.

**Grafik Tren Mood**
- Halaman tren menampilkan line chart mood selama 7, 14, atau 30 hari terakhir.
- Statistik ringkas: total check-in, rata-rata mood, periode dipilih.
- Daftar riwayat pulse (kronologis terbalik) dengan emoji, label mood, dan tanggal.

---

### Fase C — Jurnal Refleksi Mingguan (MABA)

**Editor Jurnal Tiga-Bagian**
- Tiga kolom refleksi: "Apa yang terjadi?", "Apa maknanya?", "Apa yang akan kamu lakukan?"
- Penghitung kata langsung — tombol submit tidak aktif sampai total minimal 300 kata.
- Petunjuk pertanyaan (PromptHint) tampil di atas setiap kolom sebagai panduan.

**Auto-Save Dual Persistence**
- Draft tersimpan otomatis ke localStorage setiap perubahan ketik (instan, zero-latency).
- Draft tersimpan ke server setiap 30 detik.
- Indikator "Tersimpan HH:MM" diperbarui setiap kali auto-save berhasil.
- Bila halaman ditutup dan dibuka kembali, konten draft dipulihkan (server dipakai bila lebih baru dari lokal).

**Status Jurnal**
- `SUBMITTED` — dikirim tepat waktu atau terlambat dalam batas toleransi.
- `LATE` — dikirim setelah batas waktu Minggu 21:00 WIB.
- `MISSED` — tidak dikirim sampai Rabu berikutnya; auto-lock dilakukan oleh cron.

**Riwayat Jurnal**
- Halaman daftar jurnal menampilkan semua minggu dalam cohort.
- Halaman detail jurnal per minggu menampilkan konten read-only beserta skor rubrik (bila sudah di-scoring oleh KP).

---

### Fase D — Scoring Rubrik AAC&U (KP)

**Antrian Jurnal Belum di-Scoring**
- KP melihat daftar jurnal anggota KP-Groupnya yang belum di-scoring (DataTable dengan sort dan filter).
- Hanya jurnal dari anggota KP-Group sendiri yang tampil — cross-group diblokir.

**Rubrik Scoring Panel**
- Side-by-side view: isi jurnal Maba di kiri, panel scoring di kanan.
- KP memilih level AAC&U 1–4 untuk rubrik `JOURNAL_REFLECTION` dengan tooltip penjelasan tiap level.
- Komentar opsional maksimum 500 karakter; komentar dapat diedit dalam 48 jam setelah scoring.

**Optimistic Lock**
- Satu KP mengunci jurnal sebelum mulai scoring.
- Bila KP lain membuka jurnal yang sama, mendapat notifikasi bahwa jurnal sedang dikerjakan (409).
- Lock otomatis kedaluwarsa setelah 5 menit tanpa aktivitas.

---

### Fase E — Dashboard Mood KP-Group (KP)

**Agregat Mood Harian**
- KP melihat rata-rata mood dan distribusi mood (bar chart) anggota KP-Groupnya untuk hari ini.
- Indikator "Diperbarui X menit lalu" + tombol refresh manual.
- Data diagregasi dari `PulseCheck` dan di-cache Redis 1 jam — dashboard render < 200ms.

**Daftar Belum Check-in**
- Setelah pukul 20:00 WIB, KP melihat daftar nama Maba yang belum mengisi pulse hari ini.
- Membantu KP proaktif menghubungi Maba yang tidak aktif.

**Panel Red-Flag Aktif**
- KP melihat daftar red-flag aktif anggota KP-Groupnya (mood rendah beruntun belum di-follow-up).
- Status badge (ACTIVE / FOLLOWED_UP / ESCALATED) ditampilkan per entri.

---

### Fase F — Red-Flag Engine & Eskalasi (KP + SC)

**Deteksi Otomatis Mood Rendah**
- Setiap kali Maba submit pulse, sistem memeriksa 3 pulse terakhir.
- Bila semua 3 pulse terakhir memiliki mood ≤ 2, red-flag event dibuat dan KP menerima notifikasi (PUSH + email, prioritas CRITICAL).
- Cooldown 7 hari per Maba — tidak ada double-trigger dalam satu minggu.
- Bila Maba belum punya KP yang ditugaskan, notifikasi dikirim ke SC cohort.

**Follow-Up oleh KP**
- KP mencatat aksi tindak lanjut lewat modal: jenis kontak (chat/telepon/tatap muka/lainnya), ringkasan (min 20 karakter), dan rencana langkah berikutnya.
- Status red-flag berubah ke `FOLLOWED_UP` setelah catatan disimpan.

**Eskalasi Otomatis ke SC**
- Cron berjalan setiap 6 jam mencari red-flag yang sudah lebih dari 48 jam tidak di-follow-up.
- Red-flag tersebut di-eskalasi ke `ESCALATED` dan SC menerima notifikasi.

---

### Fase G — PWA Install Prompt

**Banner Instalasi Aplikasi**
- Setelah sign-in kedua kali, banner muncul mengajak Maba menginstal PWA ke layar utama HP.
- Pengguna dapat menutup banner; setelah ditutup 3 kali, banner tidak muncul lagi permanen.
- Menggunakan native browser install prompt (`beforeinstallprompt`).

---

### Fase H — Cron Maintenance & E2E Tests

**Cron Retention Purge (`m04-retention-purge`)**
- Berjalan setiap hari pukul 10:00 WIB.
- Menghapus PulseCheck > 1 tahun, Journal > 2 tahun, JournalDraft > 6 bulan.
- Mendukung mode `?dryRun=true` untuk preview tanpa hapus data.
- Setiap batch penghapusan dicatat di audit log.

**Cron Journal Auto-Lock (`m04-journal-auto-lock`)**
- Berjalan setiap Rabu pukul 07:00 WIB.
- Menghapus draft yatim piatu dari minggu yang sudah lewat (tidak pernah di-submit).

**Cron Red-Flag Escalate (`m04-red-flag-escalate`)**
- Berjalan setiap 6 jam.
- Mengambil red-flag `ACTIVE` yang sudah > 48 jam dan mengubah status menjadi `ESCALATED`.

**E2E Test Coverage**
- 6 spec file Playwright: pulse-submit, journal-editor, journal-submit-lock, rubric-scoring, kp-mood-dashboard, kp-cross-group-forbidden.

---

## Masa Depan / Direncanakan

### Export CSV Data Pulse Maba
- Tombol unduh di halaman tren untuk mengekspor seluruh riwayat pulse ke CSV.
- Dirancang (F9 dalam rencana implementasi) tetapi belum diimplementasikan.

### Unit Test Lengkap
- `service.test.ts` untuk pulse service, journal service, rubric service.
- `offline-queue-client.test.ts` untuk antrean offline IndexedDB.
- `kp-accessor.test.ts` untuk verifikasi scope KP.

### Monitoring Metrik Dashboard (Opsional V1)
- Halaman metrik untuk SC/OC: pulse submission rate, journal submission rate, KP scoring rate, red-flag response rate.
- Dirancang sebagai opsional V1 di checklist Fase H; belum diimplementasikan.
