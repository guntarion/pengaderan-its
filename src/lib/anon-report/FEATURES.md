# M12 Anonymous Channel — Katalog Fitur

Katalog fitur produk untuk modul Saluran Pelaporan Anonim (M12). Mencakup fitur yang sudah diimplementasikan dan rencana pengembangan selanjutnya.

---

## Diimplementasikan

### Pelapor Anonim (Publik)

#### Formulir Pelaporan Anonim

- Halaman publik di `/anon-report` yang dapat diakses tanpa login, tersedia dari Navbar website dan sidebar dashboard semua peran
- Pelapor memilih kohort angkatan, kategori laporan (Bullying, Harassment, Ketidakadilan, Saran, Lainnya), dan menulis isi laporan minimal 20 karakter
- Pelapor opsional menandai tingkat keparahan yang dirasakan (Hijau / Kuning / Merah)
- Formulir dilindungi captcha (Cloudflare Turnstile dengan fallback hCaptcha) dan rate limit 5 laporan per 24 jam per perangkat
- Konten laporan diuji kualitas minimum (anti-spam) sebelum disimpan
- Lampiran foto atau PDF opsional (JPEG, PNG, PDF) melalui presigned S3 upload

#### Jaminan Anonimitas

- Banner `AnonymityNotice` menjelaskan bahwa tidak ada data identitas yang dikumpulkan atau disimpan
- Sistem tidak menyimpan userId, email, nomor telepon, nama, IP, User-Agent, atau fingerprint pelapor di database
- Fingerprint perangkat hanya digunakan untuk rate limiting, dibuang setelah 24 jam, dan tidak pernah masuk ke log

#### Kode Pelacak Laporan

- Setelah submit berhasil, pelapor menerima kode unik format `NW-XXXXXXXX` (8 karakter acak kriptografis)
- Kode tidak dapat dikaitkan kembali ke waktu pengiriman atau perangkat pelapor
- Halaman sukses memungkinkan menyalin kode pelacak ke clipboard

#### Pelacak Status Laporan

- Halaman publik di `/anon-status` untuk memasukkan kode dan memeriksa status laporan
- Informasi yang ditampilkan dibatasi: status, kategori, keparahan, tanggal diterima, catatan publik dari BLM, tanggal selesai
- Tidak ada informasi identitas handler atau isi laporan yang bocor ke pelapor

---

### BLM (Badan Legislatif Mahasiswa) — Triage & Penanganan

#### Daftar Laporan Masuk

- Dashboard BLM di `/dashboard/blm/anon-reports` menampilkan semua laporan untuk kohort yang dikelola
- Tabel dapat difilter berdasarkan status (Baru, Sedang Ditangani, Selesai, Dieskalasi), kategori, dan keparahan
- Kode laporan ditampilkan dalam format tersamarkan di daftar
- RLS PostgreSQL memastikan BLM hanya melihat laporan dari organisasinya sendiri

#### Detail & Tindak Lanjut Laporan

- Halaman detail menampilkan isi laporan, klasifikasi keparahan otomatis beserta alasannya, dan riwayat akses
- BLM dapat mengakui laporan (status NEW → IN_REVIEW) dengan optimistic locking — konflik simultan menghasilkan 409
- BLM dapat menambah catatan internal (hanya terlihat BLM/Satgas/SUPERADMIN), catatan publik (muncul di status tracker pelapor, maksimal 300 karakter), dan catatan khusus Satgas
- BLM dapat meng-override kategori atau keparahan laporan (dicatat di access log sebagai SEVERITY_OVERRIDE / CATEGORY_OVERRIDE)
- BLM dapat menutup laporan dengan catatan resolusi wajib (minimal 10 karakter)

#### Eskalasi Manual ke Satgas

- BLM dapat meng-eskalasi laporan ke Satgas PPKPT ITS secara manual dari halaman detail
- Eskalasi memicu notifikasi CRITICAL ke semua Satgas via M15 (dengan timeout 10 detik + fallback nodemailer)

---

### Satgas PPKPT ITS — Penanganan Insiden Berat

#### Dashboard Laporan yang Dieskalasi

- Halaman Satgas di `/dashboard/satgas/escalated-reports` menampilkan semua laporan yang dieskalasi
- Satgas menerima notifikasi CRITICAL saat ada laporan baru dieskalasi (otomatis untuk kategori Harassment atau keparahan Merah, atau manual oleh BLM)

#### Penanganan Laporan Escalated

- Satgas dapat melihat detail laporan termasuk catatan internal dan catatan khusus Satgas
- Satgas dapat menambah catatan Satgas, meng-update status, dan menutup laporan
- Seluruh akses Satgas dicatat di access log yang tidak dapat diubah

---

### SUPERADMIN — Administrasi & Pengawasan

#### Audit Log Akses Laporan

- Halaman `/dashboard/superadmin/anon-audit` menampilkan seluruh riwayat akses ke laporan anonim
- Setiap aksi (baca, ubah, eskalasi, unduh lampiran, hapus massal) dicatat dengan: actor ID, peran actor, hash IP actor, waktu, dan metadata before/after
- Access log bersifat append-only — UPDATE dan DELETE diblokir di level database

#### Manajemen Keyword Keparahan

- Halaman `/dashboard/superadmin/anon-keywords` untuk mengelola daftar kata kunci pemicu keparahan Merah dan daftar profanity
- Perubahan disimpan di tabel `AnonReportConfig` dan aktif segera pada laporan berikutnya

#### Penghapusan Massal

- SUPERADMIN dapat menghapus laporan secara massal (maksimal 100 laporan sekaligus) dengan wajib mengisi alasan penghapusan
- Setiap penghapusan massal dicatat di access log sebagai BULK_DELETE

---

### SC (Student Council) — Ringkasan Agregat Saja

#### Aggregate Summary

- SC dapat mengakses endpoint `/api/anon-reports/summary` yang mengembalikan statistik per kategori, keparahan, dan status
- Sel dengan jumlah kurang dari 3 disembunyikan (ditampilkan sebagai `<3`) untuk melindungi privasi pada kohort kecil
- SC tidak memiliki akses ke laporan individual manapun — RLS memblokir endpoint detail

---

### Sistem Otomasi & Keamanan

#### Klasifikasi Keparahan Otomatis

- Setiap laporan masuk diklasifikasikan otomatis berdasarkan: pencocokan kata kunci berbahaya, kategori minimum (Harassment → minimal Kuning), dan indikasi keparahan dari pelapor
- Laporan berkeparahan Merah atau kategori Harassment secara otomatis dieskalasi ke Satgas

#### Lampiran dengan Strip EXIF

- Pelapor dapat melampirkan foto (JPEG, PNG) atau PDF
- Worker `anon-exif-worker.ts` otomatis menghapus metadata EXIF (termasuk GPS location) dari foto sebelum disimpan permanen di S3
- Lampiran hanya dapat diunduh oleh BLM/Satgas/SUPERADMIN dengan dicatat di access log

#### Retensi 3 Tahun

- Script `anon-retention-cron.ts` (dijalankan bulanan) melakukan soft-redact pada laporan yang sudah lebih dari 3 tahun: isi laporan diganti dengan marker `[REDACTED after 3-year retention policy]`, kunci lampiran S3 dihapus
- Mode dry-run tersedia untuk preview sebelum eksekusi nyata

---

## Rencana / Belum Diimplementasikan

### Integrasi Uploader di Formulir Submit

- Komponen `AttachmentUploader` sudah tersedia tetapi belum terintegrasi di halaman formulir publik
- API presign dan confirm sudah berfungsi — hanya integrasi UI yang diperlukan

### Integrasi Downloader di Detail BLM

- Komponen `AttachmentDownloader` sudah tersedia tetapi belum disisipkan ke halaman detail BLM
- API download sudah berfungsi dan menghasilkan audit log

### Runbook Operasional

- Dokumen `docs/runbooks/m12-anon-channel.md` belum dibuat: prosedur response breach, rotasi salt tahunan, penghapusan spam massal, tuning keyword, trigger manual cron retensi

### FAQ Publik

- Halaman `/anon-report/faq` yang menjelaskan cara kerja anonimitas, apa yang terjadi setelah laporan dikirim, dan kontak darurat belum dibuat

### Embed di Dashboard SC M13

- `AnonReportSummaryCard` sudah tersedia dan siap digunakan, tetapi belum di-embed ke dashboard M13 SC

### Security & Compliance Review

- Sign-off 2 reviewer untuk invariant anonimitas (P1–P7) — memerlukan tindakan eksternal
- Review legal Permen 55/2024 + UU PDP — memerlukan tindakan eksternal

### Test Lanjutan (Deferred)

- Unit test terpisah untuk `severity-classifier.ts` dengan coverage 100%
- Integration test per endpoint dengan verifikasi audit entry
- E2E scenario dengan seeded data: cross-org RLS check dan race-condition acknowledge
- Load test 20 concurrent submission Harassment → SLA < 5 menit
