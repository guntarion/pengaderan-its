# M15 Notifications & Reminders — Katalog Fitur

Katalog fitur produk untuk modul infrastruktur notifikasi NAWASENA. Mencakup fitur yang sudah diimplementasikan (Phase A–G) dan fitur yang direncanakan (Phase H).

Untuk detail arsitektur dan keputusan teknis, lihat [README.md](./README.md).

---

## Sudah Diimplementasikan

### Phase A — Skema Data & Seed

- **7 model database** untuk notifikasi: template, versi template, aturan, eksekusi aturan, log pengiriman, langganan push, dan preferensi pengguna.
- **16 template notifikasi global** sudah di-seed dengan versi `v1.0.0`: mencakup Pulse harian Maba, jurnal mingguan Maba, stand-up harian KP, debrief mingguan KP, logbook dwi-mingguan Kasuh, setup OC H-7, triwulan SC H-7, NPS pasca-kegiatan, CRITICAL alert safeguard, CRITICAL alert kesehatan mental, laporan anonim, verifikasi paspor, pakta ditolak, triwulan sign-off, dan eskalasi KP-Maba diam.
- **7 aturan (rule) global** sudah di-seed: R01–R07 mencakup semua jadwal cron standar NAWASENA.
- **Backfill preferensi** untuk pengguna yang sudah ada: setiap pengguna mendapat `NotificationPreference` dengan token unsubscribe unik.
- **Row Level Security (RLS)** di 6 tabel: akses data dibatasi per organisasi.

### Phase B — Abstraksi Channel

- **Web Push Channel** (`channels/push.ts`): kirim notifikasi ke semua perangkat aktif pengguna menggunakan VAPID. Otomatis menandai langganan yang kedaluwarsa (HTTP 410) sebagai `EXPIRED`.
- **Email Channel** (`channels/email.ts`): kirim email transaksional via Resend SDK. Merender React Email component ke HTML. Memeriksa `emailBouncedAt` untuk skip email selama 30 hari setelah bounce.
- **WhatsApp Stub** (`channels/whatsapp-stub.ts`): placeholder — mengembalikan `NOT_IMPLEMENTED`. Siap diimplementasikan di fase berikutnya.
- **16 React Email Component**: satu komponen per template, mewarisi `BaseLayout` + `UnsubscribeFooter`.
- **Registry channel**: lazy-load agar inisialisasi tidak gagal bila env var belum diset.

### Phase C — Cron Endpoints

Tujuh endpoint cron yang dipanggil Vercel Cron secara terjadwal:

| Endpoint | Jadwal (WIB) | Audience |
|---|---|---|
| `maba-pulse-daily` | Setiap hari 19:00 | Semua Maba aktif |
| `maba-journal-saturday` | Sabtu 17:00 | Maba yang belum isi jurnal minggu ini |
| `maba-journal-sunday` | Minggu 19:00 | Maba yang belum isi jurnal minggu ini |
| `kp-standup-daily` | Senin–Jumat 17:00 | Semua KP aktif |
| `kp-debrief-weekly` | Senin 09:00 | Semua KP aktif |
| `kasuh-logbook-biweekly` | Sabtu selang-seling 10:00 | Semua Kasuh aktif |
| `daily-scan` | Setiap hari 08:00 | OC (H-7 kegiatan) + SC (H-7 triwulan) |

- **Audience resolver per aturan**: masing-masing cron memiliki fungsi resolver yang menentukan siapa yang menerima notifikasi berdasarkan kondisi database saat itu (belum submit, ada kegiatan mendatang, dll).
- **Tombol "Jalankan Sekarang"** di admin panel: SC/SUPERADMIN dapat memicu eksekusi manual via `POST /api/notifications/admin/rules/[id]/run-now`.

### Phase D — Dispatcher sendNotification

Fungsi utama `sendNotification()` yang digunakan oleh semua modul pemanggil:

- **Resolusi preferensi**: memeriksa preferensi channel pengguna sebelum kirim.
- **CRITICAL override**: kategori `CRITICAL` mengabaikan opt-out pengguna — PUSH + EMAIL selalu dikirim secara paralel.
- **Rate limiting FORM_REMINDER**: maksimal 3 pengiriman per pengguna per template per minggu. Redis counter dengan fail-open (tetap kirim bila Redis tidak tersedia).
- **Eskalasi ke KP**: bila pengguna mencapai 4 kali tidak mengisi form dalam seminggu, notifikasi dikirim ke KP-nya.
- **Render template**: substitusi variabel `{{nama}}` dari template aktif, dengan fallback ke template global bila tidak ada override per-org.
- **Retry 3 kali** dengan backoff eksponensial (1 detik, 5 detik, 30 detik).
- **NotificationLog**: setiap percobaan kirim — berhasil maupun gagal — dicatat di database.

### Phase E — Webhook & Langganan

- **Registrasi Web Push** (`POST /api/notifications/subscribe`): menyimpan endpoint + kunci VAPID browser ke database. Idempoten berdasarkan `(userId, endpoint)`.
- **Berhenti langganan** (`POST /api/notifications/unsubscribe`): dua jalur — terautentikasi (dari pengaturan akun) dan via token (dari link email, tanpa login).
- **Preferensi pengguna** (`GET/PUT /api/notifications/preferences`): membaca dan memperbarui pengaturan push/email/WhatsApp.
- **Webhook Resend** (`POST /api/webhooks/resend`): memperbarui status log notifikasi berdasarkan event delivery dari Resend — `delivered`, `bounced`, `complained`. Verifikasi tanda tangan Svix + validasi timestamp 5 menit.

### Phase F — Antarmuka Admin

Dapat diakses oleh SC dan SUPERADMIN di `/admin/notifications/`.

**Manajemen Aturan:**
- Daftar semua aturan (global + per-org) dengan status aktif, kategori, channel, dan waktu eksekusi terakhir.
- Formulir buat/ubah aturan: jadwal cron, key audience resolver, template, kategori, channel, maksimal pengiriman per minggu.
- Badge override: tampilkan bila aturan merupakan override org-specific dari aturan global.
- Pratinjau audience: hitung jumlah penerima yang akan dituju bila aturan dijalankan sekarang.
- Tombol "Jalankan Sekarang" untuk eksekusi manual.
- Nonaktifkan/aktifkan aturan tanpa menghapus.

**Manajemen Template:**
- Daftar semua template dengan status versi aktif.
- Halaman detail template: riwayat versi dengan tanggal publikasi.
- Editor versi baru: kolom konten push (judul + isi), email (subjek + komponen React + HTML fallback), WhatsApp (teks).
- Pratinjau template: render push card dan iframe email dalam browser sebelum dipublikasikan.
- Publikasi versi: hanya versi yang dipublikasikan yang digunakan untuk pengiriman.

**Log Pengiriman:**
- Tabel log dengan filter: status, channel, kategori, template, rentang tanggal.
- Panel detail log: menampilkan semua field termasuk pesan error dan ID pesan provider.
- Ekspor CSV: mengunduh log terfilter dalam format CSV untuk analisis eksternal.

### Phase G — Preferensi Pengguna

- **Halaman pengaturan notifikasi** (`/settings/notifications`): tersedia untuk semua pengguna terautentikasi.
- **Toggle per channel**: pengguna dapat mengaktifkan/menonaktifkan push notification, email, dan WhatsApp secara independen.
- **Disclaimer CRITICAL**: pesan jelas bahwa notifikasi CRITICAL (safeguard, kesehatan mental) tidak dapat dinonaktifkan demi keselamatan.
- **Permintaan izin push**: banner `PushPermissionPrompt` muncul di dashboard bila browser mendukung notifikasi tetapi izin belum diberikan.
- **Hook usePushSubscription**: mengelola state izin, status langganan, dan fungsi subscribe/unsubscribe dengan feedback toast.
- **Service Worker** (`public/sw.js`): menangani event `push` (tampilkan notifikasi) dan `notificationclick` (buka URL target). Service Worker terdaftar secara otomatis saat pengguna pertama kali mengaktifkan push.

---

## Direncanakan / Belum Diimplementasikan (Phase H)

### Uji Unit & Integrasi

- Unit test komprehensif untuk `send.ts`, channel push, channel email (6+ skenario: CRITICAL override, rate limit escalation, bounce cooldown, template render failure, retry exhaustion, WhatsApp stub).
- Integration test: panggil `sendNotification` dari script → verifikasi log + push terkirim ke browser nyata.
- Simulasi webhook Svix via CLI: konfirmasi alur bounce (simulasi bounce → `emailBouncedAt` di-set → pengiriman berikutnya di-skip).

### Integrasi Aktif dengan Modul Pemanggil

Beberapa modul sudah memanggil `sendNotification` secara mandiri (M10, M11, M12), tetapi koordinasi resmi dengan tim modul lain belum selesai:

- M10 Safeguard — injeksi di incident RED handler
- M11 MH Screening — injeksi di hasil screening RED
- M06 Passport — injeksi di submit + verify actions
- M14 Triwulan — injeksi di submit action
- M01 Pakta — background job notifikasi penandatangan saat versi baru terbit
- M04 Events NPS — jadwal via pola `daily-scan` catch-up

### E2E Tests (8 Skenario Playwright)

- Eksekusi aturan end-to-end
- Preferensi pengguna dihormati
- CRITICAL override mengabaikan opt-out
- Rate limit memicu eskalasi
- Versioning template
- Alur subscribe push
- Webhook Resend
- Isolasi multi-tenant

### Uji Beban

- Eksekusi aturan 500 pengguna: latensi P95 < 15 detik.
- Profil timeout Vercel function: budget ≤ 40 detik.

### Dashboard Monitoring (Opsional)

- Metrik cron: ketepatan waktu, tingkat pengiriman, tingkat bounce, tingkat eskalasi.
- Alert ke admin bila cron miss > 2 kali, bounce rate > 3%, delivery rate < 95%.

### Infrastruktur Produksi

- Domain email `@its.ac.id` terverifikasi di Resend (SPF/DKIM/DMARC).
- VAPID keys di-generate dan dikonfigurasi di `.env.production`.
- Uji push terkirim di Chrome, Firefox, dan iOS (bila memungkinkan).
- Pembaruan kebijakan privasi: klausa notifikasi + provider Resend + Web Push.
