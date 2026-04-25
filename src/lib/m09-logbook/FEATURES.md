# M09 KP & Kasuh Logbook — Katalog Fitur

Katalog fitur yang menghadap pengguna untuk modul M09. Mencakup apa yang sudah diimplementasikan dan apa yang direncanakan. Dokumentasi arsitektur ada di [README.md](./README.md).

---

## Sudah Diimplementasikan

### Phase B — Log Daily KP (Harian)

Fitur untuk peran **KP (Kakak Pendamping)**:

- **Form Log Harian**: KP mencatat mood rata-rata kelompok (skala 1–5) setiap hari kerja melalui halaman `/dashboard/kp/log/daily`.
- **Saran Mood Otomatis**: Saat membuka form, sistem menampilkan rata-rata mood hari ini berdasarkan data Pulse Journal (M04) anggota kelompok KP — hanya ditampilkan bila minimal 3 anggota sudah mengisi (pelindung privasi).
- **Checklist Bendera Merah**: KP dapat menandai kondisi yang diamati: MENANGIS, SHUTDOWN, KONFLIK, INJURY, WITHDRAW, LAINNYA (dengan kolom keterangan teks bebas).
- **Catatan Anekdot Singkat**: Kolom teks opsional untuk mencatat kejadian singkat hari ini (maks. 500 karakter).
- **Jendela Edit 48 Jam**: Log yang sudah dikirim dapat diedit dalam 48 jam. Setelah itu, log terkunci secara otomatis.
- **Riwayat 7 Hari**: Di bawah form, tersedia ringkasan log 7 hari terakhir (tanggal, mood, jumlah bendera merah) sebagai referensi cepat.

### Phase C — Debrief Mingguan KP

- **Form Debrief Mingguan**: KP mengisi tiga refleksi teks (min. 50 karakter masing-masing) tentang minggu yang baru lewat: apa yang berhasil, apa yang tidak, dan apa yang perlu diubah. Tersedia di `/dashboard/kp/log/weekly`.
- **Konteks Minggu Otomatis**: Sebelum menulis, KP melihat ringkasan minggu tersebut — rata-rata mood, distribusi bendera merah, dan daftar anekdot — yang diambil dari log harian minggunya secara otomatis.
- **Auto-Simpan Draft Lokal**: Tulisan KP disimpan otomatis di perangkat setiap 30 detik selama KP belum mengirim, sehingga tidak hilang jika halaman ditutup sementara.
- **Konfirmasi Visibilitas Peer**: Sebelum mengirim, muncul konfirmasi bahwa debrief akan terlihat oleh sesama KP dalam cohort yang sama.
- **Pre-Compute Sabtu Malam**: Sistem mempersiapkan konteks minggu setiap Sabtu pukul 22:00 agar form Senin pagi langsung siap tanpa jeda.

### Phase D — Dashboard & Logbook Kasuh (Biweekly)

Fitur untuk peran **KASUH (Kakak Asuh)**:

- **Dashboard Adik Asuh**: Halaman `/dashboard/kasuh` menampilkan kartu per adik asuh dengan foto profil, tren mood 14 hari terakhir (grafik), status pertemuan cycle terakhir, dan tombol aksi "Catat Logbook Cycle N".
- **Tren Mood Adik**: Grafik tren Pulse Journal adik asuh selama 14 hari ditampilkan di dasbor Kasuh melalui integrasi data M04 yang diproteksi — akses tercatat di audit log setiap kali dibuka.
- **Badge Status Cycle**: Setiap pair menampilkan badge visual: SESUAI JADWAL, JATUH TEMPO, TERLAMBAT, atau SUDAH DIISI — dihitung otomatis dari tanggal pair dibuat dan interval 14 hari.
- **Form Logbook Biweekly**: Di halaman `/dashboard/kasuh/adik/[mabaId]/logbook`, Kasuh memilih salah satu dari dua jalur:
  - **Sudah Bertemu (MET)**: mengisi tanggal pertemuan, refleksi (min. 30 karakter), dan opsional catatan tindak lanjut.
  - **Belum Bertemu (NOT_MET)**: memilih alasan dari daftar dan menambahkan penjelasan (min. 10 karakter).
- **Bendera Mendesak (URGENT)**: Kasuh dapat menandai log sebagai mendesak; sistem otomatis mengirim notifikasi prioritas tinggi ke SC.
- **Riwayat Cycle**: Logbook cycle sebelumnya tersedia dalam mode baca saja di halaman yang sama.

### Phase E — Peer Debrief KP (Antar-KP dalam Cohort)

- **Daftar Debrief Peer**: KP dapat melihat debrief mingguan sesama KP dalam cohort yang sama di halaman `/dashboard/kp/peer-debriefs` — termasuk nama, ringkasan pertama dari "what worked", dan tautan ke detail.
- **Halaman Detail Baca-Saja**: Membuka debrief KP lain menampilkan konten lengkap dalam mode baca saja tanpa kolom input. Setiap akses tercatat di audit log (`PEER_DEBRIEF_READ`).
- **Isolasi Cohort**: KP hanya dapat melihat debrief dari KP dalam cohort yang sama. Mencoba mengakses debrief KP dari cohort lain menghasilkan error akses ditolak.

### Phase F — Cascade Bendera Merah ke M10 Safeguard

- **Cascade Otomatis ke Insiden M10**: Saat KP mengirim log harian dengan bendera INJURY atau SHUTDOWN, sistem secara otomatis membuat draft insiden di M10 (Safeguarding) di latar belakang — tanpa memperlambat proses submit KP.
- **Notifikasi Bendera Biasa**: Bendera MENANGIS, KONFLIK, WITHDRAW, LAINNYA tetap memicu notifikasi prioritas tinggi ke SC tanpa cascade ke M10.
- **Retry Otomatis**: Bila M10 tidak tersedia, sistem mencoba ulang hingga 3 kali dengan jeda bertahap. Bila semua gagal, kejadian dicatat di audit log dan tim teknis menerima notifikasi kritis.
- **Feature Flag M10 Cascade**: Cascade ke M10 dikendalikan oleh variabel lingkungan `M09_M10_CASCADE_ENABLED`. Default nonaktif hingga M10 siap produksi — saat flag nonaktif, notifikasi M15 tetap terkirim.
- **Pencabutan Cascade**: Bila KP mengedit log dalam 48 jam dan menghapus bendera berat, sistem memperbarui status draft M10 menjadi `SUPERSEDED` dan mencatat `RED_FLAG_REVOKED` di audit log.

### Phase G — Notifikasi, Pantauan SC, dan Retensi Data

**Notifikasi Otomatis (via M15)**

| Aturan | Waktu | Penerima | Kondisi |
|---|---|---|---|
| R-M09-DAILY-17 | Hari kerja 17:00 | KP | Belum mengisi log hari ini |
| R-M09-WEEKLY-MON-09 | Senin 09:00 | KP | Debrief minggu lalu belum dikirim |
| R-M09-KASUH-SAT-10 | Sabtu 10:00 | KASUH | Cycle logbook jatuh tempo minggu ini |
| R-M09-DAILY-MISS-21 | Hari kerja 21:00 | KP | Log hari ini masih kosong |
| R-M09-KASUH-OVERDUE-H3 | Harian | KASUH | Log cycle terlambat > 3 hari |
| R-M09-SC-KP-MISS-H3 | Harian | SC | KP miss log > 3 hari berturut-turut |

**Pantauan SC (Staf Koordinasi)**

- **Ringkasan Mingguan per Cohort**: `GET /api/sc/m09/weekly-rollup` — rata-rata mood dan distribusi bendera merah per cohort per minggu, di-cache 5 menit.
- **Umpan Bendera Merah**: `GET /api/sc/m09/red-flag-feed` — daftar bendera merah terbaru dengan tingkat keparahan (paginasi), data langsung tanpa cache.
- **Daftar Kasuh Terlambat**: `GET /api/sc/m09/kasuh-overdue` — daftar pair Kasuh yang logbook-nya terlambat > 3 hari, data langsung.
- Akses dibatasi untuk peran SC, SUPERADMIN, PEMBINA, dan DOSEN_WALI. PEMBINA dan DOSEN_WALI melihat data agregat tanpa nama personal.

**Retensi Data**

- Semua data KPLogDaily, KPLogWeekly, dan KasuhLog disimpan selama 2 tahun untuk keperluan evaluasi longitudinal.
- Cron `m09-retention-purge` berjalan setiap hari pukul 03:30 dan menghapus data yang melewati batas 2 tahun. Setiap eksekusi dicatat di audit log.

---

## Direncanakan / Belum Diimplementasikan

### Phase H — Pengujian E2E, Performa, dan Polesan UI

- **Pengujian E2E Playwright**: 7 spec file belum dibuat — happy path KP harian/mingguan, peer debrief cross-cohort, alur Kasuh, cascade bendera ke M10 (dengan mock), privasi Maba tidak bisa baca KasuhLog, dan stres-test RLS multi-organisasi.
- **Pengujian Unit**: Belum ada unit test untuk `suggested-mood.ts`, `weekly-context.ts`, `cycle.ts`, `kasuh-adik-resolver.ts`, `peer-cohort-resolver.ts`, dan `m10-cascade.ts`.
- **Verifikasi Performa**: Belum diuji — target p95 < 500ms untuk 50 KP concurrent GET Weekly; cron precompute Sabtu malam < 10 menit untuk 15.000 KP.
- **Polesan UI**: Tinjauan oleh frontend-designer agent, penambahan micro-interaction dan animasi, verifikasi tampilan mobile (iPhone SE, Android mid-range), dan verifikasi dark mode belum dilakukan.
- **Draft Server-Side untuk Debrief Mingguan (V2)**: Saat ini draft disimpan di `localStorage` perangkat. Bila pengguna membersihkan data browser, draft hilang. Tabel `KPLogWeeklyDraft` di database direncanakan untuk V2.
- **Anchor Cycle Cohort-Wide (V2)**: Cycle Kasuh saat ini dihitung dari tanggal pair dibuat (per-pair). V2 akan menambahkan opsi `cycleAnchor = cohort.startDate` untuk sinkronisasi seluruh cohort bila dibutuhkan SC.
- **Antrian Offline untuk Submit Harian (V2)**: Bila KP submit dari area tanpa sinyal, form gagal dengan pesan kesalahan. Antrian offline (seperti pola M04 PWA) direncanakan untuk V2.
