# M01 Foundation — Katalog Fitur

Daftar fitur modul Foundation (Auth, Cohort, Pakta) dari perspektif pengguna.
Dikelompokkan per peran/kasus penggunaan.

---

## Fitur Terimplementasi

### Admin Organisasi (SUPERADMIN)

- Membuat, melihat, dan mengedit data Organisasi (nama, kode, domain email, status aktif/nonaktif).
- Melihat daftar semua Organisasi lintas-tenant beserta statistik Cohort dan jumlah pengguna.
- Membuat akun SUPERADMIN bootstrap otomatis saat pertama kali sign-in dengan email terdaftar di `SUPERADMIN_EMAILS` — tidak memerlukan intervensi manual di database.
- Melihat Audit Log lintas-organisasi (SUPERADMIN dapat memfilter per org, per aksi, per rentang tanggal).
- Akses lintas-org yang sah dicatat otomatis sebagai `SUPERADMIN_CROSS_ORG_ACCESS` di Audit Log.

### Admin Cohort (SC / SUPERADMIN)

- Membuat Cohort baru dengan kode unik per organisasi (contoh: `C26`), tanggal mulai/selesai, dan status Draft/Active/Closed.
- Mengaktifkan Cohort — hanya satu Cohort dapat berstatus Active pada satu waktu (partial unique index mencegah duplikasi).
- Melihat daftar Cohort beserta jumlah MABA terdaftar.

### Manajemen Pengguna + Role (SC / SUPERADMIN)

- Melihat daftar pengguna dengan filter berdasarkan peran, status, dan cohort; pencarian berdasarkan nama/NRP/email.
- Melihat detail pengguna: data demografi (ditampilkan sesuai hak akses viewer), status Pakta, riwayat role.
- Mengubah peran pengguna dengan wajib mengisi alasan (minimal 20 karakter) dan konfirmasi ganda untuk peran sensitif.
  - Perubahan peran otomatis mencabut sesi aktif pengguna pada permintaan berikutnya (via `sessionEpoch`).
  - Setiap perubahan peran dicatat di Audit Log (`ROLE_CHANGE`).
- Melihat kontak darurat pengguna — akses ini dicatat sebagai `USER_EMERGENCY_CONTACT_ACCESSED`.

### Whitelist Email (SC / SUPERADMIN)

- Menambahkan email ke daftar putih dengan opsional penetapan peran awal (`preassignedRole`) dan `cohortId`.
- Melihat daftar whitelist beserta status konsumsi (sudah/belum digunakan untuk sign-in pertama).
- Mendukung domain `@its.ac.id` sebagai allowlist otomatis (tanpa perlu entri manual per email).

### Bulk Import Pengguna via CSV (SC / SUPERADMIN)

- Mengunggah file CSV untuk mengimpor pengguna secara massal.
  - Template CSV dapat diunduh langsung dari halaman import.
  - Validasi per baris: format email, format NRP, field wajib; validasi lintas-baris: deteksi duplikat email/NRP dalam file.
- Melihat pratinjau hasil validasi sebelum commit:
  - Statistik: total baris, valid, error, duplikat.
  - Tabel error dengan baris dan kolom bermasalah disorot.
  - Tabel sampel baris valid dengan dropdown keputusan per baris (CREATE / UPDATE / SKIP).
- Konfirmasi ganda sebelum melakukan commit.
- Commit chunked 50 baris per transaksi — tidak ada partial write jika satu chunk gagal.
- Satu entri Audit Log (`USER_BULK_IMPORT`) merangkum jumlah: dibuat, diperbarui, dilewati, gagal.

### Pakta Digital — Penandatanganan (MABA)

MABA dengan status `PENDING_PAKTA` diarahkan otomatis ke alur berikut sebelum dapat mengakses dashboard:

1. **Baca Pakta** — konten Pakta dalam format Markdown ditampilkan penuh. Tombol lanjut dikunci hingga pengguna men-scroll sampai bawah (dideteksi via `IntersectionObserver`).
2. **Konfirmasi 3 Checkbox** — pengguna mencentang tiga pernyataan persetujuan. Tombol lanjut aktif hanya jika semua tercentang.
3. **Kuis Pemahaman** — 5 pertanyaan pilihan ganda. Skor minimal (default 80%) harus tercapai. Jika gagal, jawaban benar ditampilkan dan pengguna diminta membaca ulang Pakta.
4. **Tanda Tangan Digital** — pengguna mengkonfirmasi penandatanganan. IP dan User-Agent dicatat. Status pengguna berubah menjadi `SIGNED` dan dashboard terbuka.

### Pakta Digital — Penolakan (MABA)

- MABA dapat menolak menandatangani Pakta dengan mengisi alasan (minimal 20 karakter).
- Penolakan dicatat sebagai `PaktaRejection` dan eskalasi otomatis dikirimkan ke SC.
- Status pengguna berubah menjadi `REJECTED`.

### Pakta Digital — Administrasi Versi (SC)

- Membuat versi Pakta baru dengan konten Markdown dan 5 soal kuis (masing-masing dengan 4 pilihan jawaban dan 1 jawaban benar).
- Mempublikasikan versi baru — versi lama otomatis berstatus `SUPERSEDED`.
- Penerbitan versi baru memicu **re-sign** untuk semua pengguna yang sudah menandatangani versi sebelumnya: status mereka dikembalikan ke `PENDING_PAKTA`.
- Melihat daftar penandatangan per versi Pakta beserta tanggal dan status tanda tangan.

### Profil & Demografi Pengguna (Semua Peran)

- Mengisi profil awal setelah sign-in pertama (nama lengkap, NRP, nomor HP, kontak darurat).
- Mengisi data demografi secara opsional (teks transparansi akses ditampilkan sebelum formulir).
- Data demografi ditampilkan di detail pengguna sesuai hak akses viewer:
  - SC/SUPERADMIN: semua field.
  - KP: field terbatas (tanpa kontak darurat kecuali ada audit trail).

### Audit Log Viewer (SC / SUPERADMIN)

- Melihat log audit dengan filter: rentang tanggal, jenis aksi, resource, user ID.
- SC hanya dapat melihat log dalam organisasinya sendiri.
- SUPERADMIN dapat melihat log lintas organisasi.

---

## Fitur Direncanakan / Deferred

### Phase 7 — E2E Test Suite (Deferred)

Seluruh Phase 7 belum dimulai. Tidak ada blocker teknis; ditunda karena prioritas modul M02–M14.

- E2E: alur sign-up MABA + penandatanganan Social Contract (happy path).
- E2E: SC bulk import + role assignment.
- E2E: verifikasi tidak ada kebocoran data lintas-organisasi (cross-org leak).
- E2E: skenario re-sign setelah SC menerbitkan versi Pakta baru.
- E2E: penolakan Pakta dan pembalikan status.
- E2E: role demote memaksa logout pada permintaan berikutnya.
- E2E: SUPERADMIN cross-org audit — verifikasi entri `SUPERADMIN_CROSS_ORG_ACCESS` tercatat.
- Load test: 150 concurrent signing, zero error, p95 < 2 detik.

### Prisma Tenant Extension (Deferred)

`src/lib/tenant/prisma-tenant-extension.ts` — client-side query interceptor yang otomatis menyuntikkan filter `organizationId`. Saat ini RLS di PostgreSQL sudah menjamin isolasi; extension ini akan menjadi lapisan pertahanan tambahan.

---

Lihat juga: [README.md](./README.md) untuk keputusan arsitektur dan gotchas teknis.
