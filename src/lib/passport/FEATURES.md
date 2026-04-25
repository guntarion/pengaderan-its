# M05 Passport Digital — Katalog Fitur

Daftar fitur product-facing untuk modul Passport Digital Nawasena. Dikelompokkan berdasarkan peran pengguna.

---

## Diimplementasikan

### MABA — Submit & Pantau Bukti Kegiatan

- Melihat daftar 57 item passport yang dikelompokkan per dimensi (Akademik, Organisasi, Sosial, dll.) beserta status masing-masing (Belum Submit, Menunggu Verifikasi, Terverifikasi, Ditolak).
- Melihat ringkasan progress passport dengan visualisasi cincin SVG (persentase selesai) dan grafik stacked-bar per dimensi.
- Mengumpulkan bukti kegiatan dengan lima tipe:
  - **Foto** — kamera ponsel + kompresi otomatis + unggah langsung ke cloud storage.
  - **File** — PDF, PNG, atau JPG; tervalidasi server-side (MIME magic bytes).
  - **Tanda Tangan Verifier** — pilih verifier (KP/KASUH) via autocomplete; entry menunggu konfirmasi verifier.
  - **Entri Logbook** — tautkan ke entri jurnal harian M04.
  - **Scan QR** — pindai QR yang dibuat SC saat kegiatan berlangsung; bukti terverifikasi otomatis tanpa antrian verifier.
- Membatalkan entri yang sedang menunggu verifikasi (status PENDING) selama belum di-review.
- Meresubmit setelah entri ditolak; riwayat submit sebelumnya tetap tersimpan dalam rantai resubmit.
- Melihat detail entri termasuk riwayat rantai resubmit, catatan penolakan verifier, dan foto/file bukti yang diunggah.
- Akses foto/file bukti melalui tautan aman yang kedaluwarsa dalam 15 menit (tidak ada link publik permanen).

### Verifier (KP / KASUH) — Antrian Review

- Melihat antrian entri passport yang perlu direview, dilengkapi filter status dan urutan waktu submit.
- Badge jumlah antrian pada sidebar yang diperbarui otomatis setiap 30 detik.
- Mereview bukti secara detail: melihat foto/file, informasi item passport, dan riwayat submit MABA.
- Mengapprove entri dengan satu klik; shortcut keyboard A (approve) dan R (reject) untuk efisiensi desktop.
- Menolak entri dengan wajib mengisi alasan minimal 10 karakter agar MABA mendapat umpan balik yang jelas.
- Navigasi antar entri dengan shortcut J/K (item berikutnya/sebelumnya) tanpa kembali ke halaman daftar.
- Perlindungan concurrency: jika dua verifier mengklik approve bersamaan, hanya satu yang berhasil (idempotency Redis 1 jam).

### SC — Agregat Kohort, Override, dan Ekspor SKEM

- Melihat dashboard agregat kohort: stacked-bar progress per dimensi untuk seluruh MABA dalam kohort.
- Melihat daftar MABA yang "stuck" (belum submit dimensi tertentu lebih dari 14 hari) untuk tindakan proaktif.
- Melihat daftar verifier yang "diam" (antrian lebih dari 5 item tanpa aksi) untuk pengingat.
- Memfilter tampilan agregat berdasarkan KP-Group.
- Meng-override status entri (REJECTED → VERIFIED atau sebaliknya) dengan wajib mengisi alasan minimal 20 karakter; setiap override tercatat di audit log.
- Menghasilkan sesi QR untuk kegiatan tertentu: QR berisi tanda tangan HMAC-SHA256 dengan waktu kedaluwarsa yang dapat dikonfigurasi.
- Mencetak dan mengunduh QR dari halaman generator admin.
- Mencabut (revoke) sesi QR yang aktif; scan berikutnya setelah pencabutan langsung ditolak.
- Mengekspor data passport kohort ke format CSV SKEM ITS dengan pemetaan kolom yang sudah dikonfigurasi.
- Mode pratinjau ekspor SKEM sebelum unduh CSV final.
- Setiap ekspor SKEM dicatat (PassportSkemExportLog) dengan checksum SHA256 untuk verifikasi integritas.

### Sistem — Otomasi & Keamanan

- Eskalasi otomatis nightly (03:00 WIB) untuk entri yang terlambat diverifikasi; idempoten via Redis lock.
- Notifikasi M15 dikirim ke target eskalasi (KP-Group senior atau SC).
- Scan MIME asinkhron pada file yang diunggah (`EvidenceScanStatus`): CLEAN / SUSPICIOUS / FAILED.
- RLS (Row-Level Security) PostgreSQL memastikan data satu organisasi tidak bocor ke organisasi lain.
- Audit log untuk setiap aksi kritis: submit, verify, reject, cancel, override, QR generate, QR scan invalid, SKEM export.
- Retensi cron bulanan (`m05-retention-purge`) untuk membersihkan data lama sesuai kebijakan.

---

## Rencana / Belum Diimplementasikan

### Phase H — Pengujian & Pemurnian (Deferred)

- Suite E2E Playwright: submit foto, approve verifier, scan QR (mock), reject-resubmit, cancel, SC override, ekspor SKEM, isolasi multi-tenant.
- Unit test: qr-hmac (boundary crypto), submit.service (idempotency key), progress.service (cache invalidation), escalation.service (Redis lock), skem-export.service.
- Load test: 200 MABA x 5 submit dalam 1 jam, target p95 submit < 3 detik.
- Retention purge terverifikasi di lingkungan dev (objek S3 terhapus + baris DB ter-purge).

### Antrian Submit Offline (Phase I)

- Submit passport secara offline menggunakan IndexedDB (reuse pola M04); sinkronisasi saat koneksi kembali.
- Berguna untuk acara outdoor dengan sinyal tidak stabil.

### Ekspor Portofolio PDF/JSON (Phase J)

- Cetak portofolio lengkap satu MABA (semua item VERIFIED + bukti thumbnail) ke PDF via puppeteer atau react-pdf.
- Berguna untuk kenangan dan keperluan administrasi pasca-program.

### Bulk Approve Verifier (Phase K)

- Multi-select entri di antrian + satu klik approve semua.
- Berguna untuk verifier yang mengelola banyak MABA sekaligus.

### Verifikasi Otomatis via M08 / M11 (Phase M, N)

- ATTENDANCE evidence diverifikasi otomatis dari data absensi M08 (OC Execution).
- QUIZ_SCORE evidence diverifikasi otomatis dari hasil kuis M11 (Mental Health Screening).

### Integrasi API SKEM Real-Time (Phase O)

- Push data SKEM langsung ke endpoint ITS jika API publik tersedia; tidak perlu upload manual.
