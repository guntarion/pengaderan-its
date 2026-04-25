# M08 Eksekusi Kegiatan (OC Dashboard) — Katalog Fitur

Dokumen ini mencatat fitur yang telah diimplementasikan pada modul Eksekusi Kegiatan, dikelompokkan berdasarkan peran pengguna. Lihat [README.md](./README.md) untuk arsitektur teknis.

---

## Diimplementasikan

### Fitur OC (Organizing Committee)

#### Pembuatan Sesi Kegiatan

- Wizard tiga langkah untuk membuat sesi baru dari katalog kegiatan M02
- Pencarian dan filter katalog kegiatan berdasarkan fase, kategori, dan kata kunci
- Autoprefill preview: tujuan, KPI, rubrik, dan peran PIC ditampilkan otomatis dari master data
- Instance tersimpan dalam status `PLANNED` dengan kapasitas dan jadwal yang dapat dikonfigurasi

#### Daftar Kegiatan OC

- Halaman listing semua sesi milik cohort OC dengan status live (PLANNED/RUNNING/DONE/CANCELLED)
- Tombol "Buat Sesi Baru" langsung dari halaman daftar

#### Halaman Detail Sesi (Tab-based)

Empat tab dalam satu halaman `/dashboard/oc/kegiatan/[instanceId]`:

**Tab Overview:**
- Tampilan status sesi dan informasi dasar
- Tombol lifecycle kontekstual: Mulai / Selesai / Batalkan sesuai status
- Editor kapasitas inline dengan konfirmasi
- Modal pembatalan dengan input alasan (min 20 karakter)
- Modal reschedule dengan input tanggal baru dan alasan
- Indikator progres notifikasi pembatalan (polling status)
- Timeline audit perubahan status

**Tab Kehadiran:**
- QR session management: generate QR PNG, tampilkan di layar, revoke sesi lama
- Tabel kehadiran dengan dropdown status per baris (HADIR/IZIN/SAKIT/ALPA)
- Bulk-mark semua peserta RSVP CONFIRMED sebagai HADIR dalam satu tindakan
- Bagian terpisah untuk walk-in (MABA hadir tanpa RSVP)
- Kartu penghitung kehadiran live (refresh setiap 30 detik)

**Tab Output:**
- Upload file (PDF, gambar, dokumen) dengan presigned S3 URL; batas 50 MB per file
- Tambah tautan URL (LINK), URL video YouTube/Drive (VIDEO), atau URL repositori Git (REPO)
- Scan status mime otomatis: CLEAN atau SUSPICIOUS (karantina)
- Hapus output (hanya pengunggah atau SC)

**Tab Evaluasi:**
- Form evaluasi pasca-acara hanya aktif bila status = DONE
- Pre-fill otomatis: persentase kehadiran, skor NPS (dengan n ≥ 5), jumlah red flag M10
- Attribut sumber ditampilkan per nilai pre-fill
- Toggle override per nilai dengan alasan wajib (tercatat di audit log)
- Input manual Kirkpatrick Level-2 score dan catatan markdown
- Disclaimer bila NPS tidak tersedia (n < 5) atau M10 belum aktif
- View read-only bila evaluasi sudah pernah disubmit

#### Kontrol Lifecycle

- Transisi manual: Mulai (PLANNED → RUNNING), Selesai (RUNNING → DONE), Batalkan (PLANNED/RUNNING → CANCELLED)
- Optimistic lock: pengguna mendapat notifikasi bila ada OC lain yang sudah mengubah status lebih dulu
- Saat DONE: auto-set ALPA untuk peserta yang belum tercatat, trigger NPS window M06, jadwalkan pengingat evaluasi M15
- Saat CANCELLED: batch kirim notifikasi ke semua RSVP CONFIRMED (chunked 50/iterasi), batalkan trigger NPS M06
- Reschedule maks 3 kali per instance; attempt ke-4 ditolak

---

### Fitur MABA (Mahasiswa Baru)

#### Scan Kehadiran PWA

- Halaman scan kamera `/dashboard/attendance/scan/` yang dapat dipakai dari ponsel
- Buka kamera dan decode QR code yang ditampilkan OC secara real-time
- Fallback kode manual: masukkan 6 karakter shortcode bila kamera tidak tersedia
- Indikator status koneksi internet (online/offline) dengan penjelasan bahasa Indonesia

#### Mode Offline

- Scan saat offline disimpan ke IndexedDB (store `nawasena-m08/attendance-queue`)
- Auto-sinkron ke server saat perangkat kembali online
- Tombol "Sinkron Sekarang" untuk sinkron manual
- Badge penghitung scan yang menunggu sinkronisasi
- Batas retry 5 kali per scan; scan yang gagal dihapus dari antrean setelah retry habis
- Idempotency via `clientScanId` — scan yang sama tidak tercatat dua kali meski terkirim berulang

---

### Fitur SC (Senior Coordinator) / Admin

#### Revert Lifecycle

- Endpoint khusus untuk membalik status instance (mis. DONE → RUNNING) dengan alasan wajib
- Revert dari DONE otomatis membatalkan trigger NPS M06 yang sudah berjalan
- Tercatat di audit log sebagai `KEGIATAN_INSTANCE_LIFECYCLE_REVERT`

#### Hapus Evaluasi

- SC dapat menghapus evaluasi yang sudah disubmit agar OC dapat resubmit
- Tercatat di audit log dengan alasan

---

### Infrastruktur & Integrasi

#### Cron Jobs

| Cron | Jadwal | Fungsi |
|---|---|---|
| `m08-auto-running` | Setiap 15 menit | Auto-transisi PLANNED → RUNNING untuk sesi yang sudah melewati `scheduledAt` |
| `m08-evaluation-overdue-flag` | Setiap hari pukul 02:00 UTC | Log warning untuk sesi DONE > 14 hari tanpa evaluasi |
| `qr-session-expire` | Bersama M05 | Expire sesi QR ACTIVE yang sudah melewati `expiresAt` |

#### Audit Trail

25 aksi audit baru mencakup seluruh siklus: pembuatan instance, transisi status, generate/revoke QR, scan kehadiran (sukses/invalid/deduped/terlambat), bulk/manual mark, upload/finalize/hapus output, submit evaluasi, override prefill, revert SC.

#### Notifikasi M15

- `EVENT_CANCELLED` — dikirim ke semua RSVP CONFIRMED saat instance dibatalkan
- `EVENT_RESCHEDULED` — dikirim saat jadwal berubah
- `EVALUATION_REMINDER` — dijadwalkan H+7 setelah status DONE

---

## Rencana / Belum Diimplementasikan (Phase I)

### Unit Tests Vitest

- `lifecycle.service.test.ts` — validasi batas state machine + optimistic lock
- `qr.service.test.ts` — HMAC valid/invalid/expired paths
- `attendance.service.test.ts` — bulk mark + autoSetAlpa
- `evaluation.service.test.ts` — prefill + override + late detection
- `output.service.test.ts` — presigned flow + mime sniff
- `cancellation.service.test.ts` + `reschedule.service.test.ts` — cascade logika
- `src/lib/qr/__tests__/signing.test.ts` — shared HMAC helper

### E2E Playwright

- OC create instance wizard
- OC lifecycle transitions (manual + cron)
- MABA scan kamera (mock camera)
- OC bulk attendance
- OC output upload (file + URL)
- OC evaluasi form
- Multi-tenant isolation (Org A tidak bisa akses data Org B)

### Polish UI

- Skeleton loading untuk semua halaman M08
- Error boundary
- Toast standarisasi Bahasa Indonesia
- Verifikasi dark mode
- Mobile responsive (halaman scan + tabel kehadiran prioritas)
- Lighthouse PWA score >= 80 untuk halaman scan
