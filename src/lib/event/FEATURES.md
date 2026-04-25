# M06 Event RSVP & NPS — Katalog Fitur

Katalog fitur modul Event RSVP & NPS (Nawasena). Mencakup fitur yang sudah diimplementasi dan fitur yang ditangguhkan.

---

## Diimplementasi

### Fase A — Skema Data & Seed

- Empat tabel baru: `kegiatan_instances`, `rsvps`, `event_nps`, `attendances`
- Tiga status kegiatan: `PLANNED` (menerima RSVP), `RUNNING` (berlangsung), `DONE` (NPS aktif), `CANCELLED`
- Status RSVP: `CONFIRMED`, `WAITLIST` (antrian FIFO), `DECLINED`
- Status kehadiran: `HADIR`, `IZIN`, `SAKIT`, `ALPA`
- Data dev: 3 instance, 15 RSVP campuran, 10 entri NPS
- Migrasi SQL menyertakan RLS (Row-Level Security) isolasi antar-organisasi dan CHECK constraints untuk skor NPS/feltSafe/meaningful

### Fase B — Katalog Publik (tanpa login)

- Halaman publik `/kegiatan/[id]` menampilkan daftar sesi mendatang untuk suatu kegiatan (30 hari ke depan)
- Halaman instance publik `/kegiatan/instance/[instanceId]` dengan hero, metadata kegiatan terbatas, dan tombol CTA "Daftar sebagai Maba"
- Data publik hanya menampilkan lokasi tingkat kota (tidak bocor detail internal)
- ISR revalidate 3600 detik; Redis cache 1 jam
- SEO metadata via `generateMetadata`

### Fase C — Daftar & Detail Instance (Maba)

- Dashboard Maba `/dashboard/kegiatan` dengan tiga tab: Mendatang / Sedang Berlangsung / Selesai
- Filter berdasarkan Fase dan Kategori kegiatan
- Tombol RSVP dengan modal waitlist bila kapasitas penuh
- Badge status RSVP (Terkonfirmasi / Antrian / Batal)
- Halaman detail instance `/dashboard/kegiatan/[instanceId]` dengan hero, metadata badge, dan daftar peserta terkonfirmasi (nama saja untuk Maba)
- Batas 10 RSVP per pengguna per jam via Redis (fail-open jika Redis tidak tersedia)
- Promosi waitlist otomatis saat peserta CONFIRMED membatalkan — menggunakan advisory lock PostgreSQL untuk mencegah race condition

### Fase D — Formulir NPS

- Formulir NPS di `/dashboard/kegiatan/[instanceId]/nps` dengan tiga slider:
  - NPS Score (0–10): "Seberapa besar kemungkinan kamu merekomendasikan kegiatan ini?"
  - Felt Safe (1–5): tingkat rasa aman
  - Meaningful (1–5): tingkat kebermanfaatan
- Kolom komentar opsional (maks 500 karakter)
- Tampilan "sudah terkirim" bila pengguna telah mengisi sebelumnya
- Validasi multi-penjagaan: status instance harus DONE, pengguna harus tercatat HADIR, dalam jendela 7 hari, belum pernah mengisi

### Fase E — Auto-Trigger NPS

- Setelah M08 menandai instance sebagai DONE, `triggerNPSForInstance` mengirim notifikasi NPS ke semua peserta HADIR via M15
- Dedulikasi via field `npsRequestedAt` — trigger kedua langsung dilewati tanpa mengirim ulang
- Pengiriman notifikasi dalam batch 50 secara paralel
- Endpoint SC `/api/admin/event/instances/[id]/trigger-nps` untuk pemicu manual (recovery)
- Pembatalan trigger via `cancelNPSTrigger` (mereset `npsRequestedAt`)

### Fase F — Dashboard OC

- Hub OC `/dashboard/oc/kegiatan` — daftar semua instance yang dikelola OC
- Halaman detail OC `/dashboard/oc/kegiatan/[instanceId]` dengan empat tab:
  - Ringkasan (metadata instance)
  - Daftar RSVP lengkap (nama, NRP, email, status)
  - Stub kehadiran (jumlah HADIR/IZIN/SAKIT/ALPA — detail dikelola M08)
  - Agregat NPS
- Ekspor daftar RSVP sebagai CSV (nama, NRP, email, status, waktu RSVP, waktu promosi)
- Tampilan agregat NPS: rata-rata NPS Score, rata-rata Felt Safe, rata-rata Meaningful, Net Promoter Percent, histagram distribusi NPS (0–10)
- Data agregat hanya ditampilkan bila minimal 5 respons — di bawah ambang batas ditampilkan pesan privasi
- Komentar individual tidak dapat diakses dari endpoint OC

### Fase G — E2E, Retensi & Polish

- 8 spesifikasi E2E Playwright:
  - `rsvp-flow.spec.ts` — alur RSVP dari login hingga konfirmasi
  - `rsvp-waitlist.spec.ts` — antrian waitlist dan promosi
  - `nps-submit.spec.ts` — pengisian NPS happy path
  - `nps-duplicate-reject.spec.ts` — penolakan pengisian duplikat
  - `oc-aggregate.spec.ts` — tampilan agregat OC
  - `oc-aggregate-insufficient.spec.ts` — tampilan data tidak cukup
  - `public-catalog-instance.spec.ts` — halaman publik tanpa login
  - `cross-org-isolation.spec.ts` — isolasi antar-organisasi
- Retensi data: `purgeExpiredInstances` menghapus instance (cascade ke RSVP/NPS/Attendance) lebih dari 3 tahun, dalam batch 100 per transaksi
- Broadcast pembatalan: `broadcastCancellation` mengirim notifikasi `EVENT_CANCELLED` ke semua pemegang RSVP CONFIRMED dan WAITLIST
- Badge "Dibatalkan" pada kartu instance dan halaman detail untuk status CANCELLED
- Pembaruan sidebar: menu Maba (Kegiatan) dan menu OC (Kegiatan)
- RBAC routes diperbarui di `src/lib/rbac.ts`
- 7 unit test untuk `nps-trigger.ts` (dedupe, batch, status guard, error handling)
- Barrel export `src/lib/event/index.ts` dengan 8 kontrak untuk M08 dan M05

---

## Ditangguhkan / Direncanakan

### Spesifikasi E2E: Jendela NPS Kedaluwarsa
- Tes `nps-window-expired.spec.ts` memerlukan sesi terautentikasi dengan instance yang `executedAt`-nya lebih dari 7 hari lalu
- Memerlukan DB live dengan data seed khusus

### Spesifikasi E2E: Notifikasi Pembatalan
- Tes `rsvp-cancelled-notification.spec.ts` memerlukan M15 live dan template notification terseed
- API broadcast sudah tersedia — hanya integrasi E2E yang ditangguhkan

### Verifikasi Live DB
- Migrasi `m06_event_instance_init` sudah disiapkan (SQL lengkap dengan RLS + CHECK constraints) namun belum diterapkan karena DB tidak reachable saat implementasi
- Pengujian RLS cross-org, full Maba flow, dan full OC flow menunggu DB tersedia

### Smoke Test Performa
- Target: listing p95 < 500 ms, agregat NPS p95 < 200 ms
- Memerlukan DB live dengan data memadai

### Integrasi M15 Daily-Scan Fallback
- Rencana perluasan cron harian M15 untuk meng-handle instance yang melewati DONE tanpa trigger NPS (misalnya lifecycle M08 gagal)
- Koordinasi dengan tim M15 diperlukan
