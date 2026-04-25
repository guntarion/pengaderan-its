# M03 Struktur Angkatan — Katalog Fitur

Daftar fitur yang tersedia pada modul Struktur Angkatan. Mencakup fitur yang sudah diimplementasi dan yang direncanakan.

---

## Diimplementasi

### Phase 1 — Schema & Database

- Tujuh tabel relational (`kp_groups`, `kp_group_members`, `buddy_pairs`, `buddy_pair_members`, `kasuh_pairs`, `pairing_requests`, `bulk_pairing_batches`) dengan Row-Level Security berbasis organisasi
- Empat enum: `PairStatus`, `KPGroupStatus`, `PairingRequestType`, `PairingRequestStatus`
- Partial unique index mencegah satu MABA memiliki lebih dari satu pair AKTIF per cohort untuk setiap jenis relasi
- Audit trail otomatis untuk 18 aksi pairing melalui ekstensi Prisma M01

### Phase 2 — Pairing Algorithm Library

#### Buddy Pair Generation
- Algoritma greedy bipartite yang memprioritaskan pasangan lintas-demografis (rantau x lokal)
- Single-pass swap optimization menghasilkan rasio cross-demographic ≥80% untuk cohort 200 orang
- Deterministik: seed yang sama + input yang sama selalu menghasilkan output identik
- Menangani jumlah peserta ganjil dengan membentuk triple pair secara otomatis
- Metadata hasil mencakup: cross ratio, jumlah triple, unpaired, dan input hash untuk verifikasi

#### Kasuh Matchmaking
- Pencocokan berbasis Jaccard similarity pada minat (interests) MABA dan KASUH
- Bonus skor: +0.2 untuk provinsi yang sama, +0.1 untuk program studi yang sama
- Menampilkan Top-3 rekomendasi KASUH per MABA beserta alasan tekstual ("hobi sama: musik, desain")
- Secara otomatis mengecualikan KASUH yang sudah memiliki 2 adik asuh aktif
- Menandai pasangan dengan skor rendah (< 0.1) agar SC dapat menangani secara manual

#### KP Group Assignment
- Tiga mode penugasan: round-robin (urutan abjad), random-seeded (acak deterministik), dan stratified (distribusi merata berdasarkan status rantau dan KIP)
- Statistik per grup: jumlah total, rantau, lokal, dan penerima KIP
- Input hash memastikan komposisi peserta tidak berubah antara preview dan commit

#### Infrastruktur Pendukung
- Preview cache Redis dengan TTL 10 menit dan tanda tangan HMAC; fallback ke memory map saat Redis tidak tersedia
- `applyNegativeConstraints`: filter pasangan berdasarkan daftar konflik yang diberikan (V1 stub)
- `computeUnhealthyPairs`: deteksi pair tanpa aktivitas (V1 stub — selalu mengembalikan array kosong)
- `canRequestRePair`: validasi batas maksimum 2 pengajuan dalam 21 hari pertama cohort

### Phase 3 — Admin UI SC/OC (KP Group, Buddy, Kasuh, Requests)

#### Manajemen KP Group (SC/OC/SUPERADMIN)
- Buat, edit, arsipkan KP Group dengan kode unik dan koordinator KP per cohort
- Kelola anggota grup: tambah/hapus MABA secara individual
- Wizard bulk-assign: pilih mode (round-robin/random/stratified), lihat preview distribusi, konfirmasi commit dengan advisory lock

#### Manajemen Buddy Pair (SC/OC/SUPERADMIN)
- Generate semua Buddy Pair cohort sekaligus: pilih seed, preview hasil (cross ratio, triple list), commit
- Swap manual: tukar satu anggota dari dua pair yang berbeda setelah generate
- Daftar semua pair aktif dengan status dan metadata algoritma

#### Manajemen Kasuh Pair (SC/OC/SUPERADMIN)
- Saran pencocokan: tampilkan Top-3 KASUH per MABA beserta skor dan alasan, SC pilih lalu commit
- Reassign manual: ganti KASUH dari halaman detail pair
- Daftar semua pair aktif dengan skor match dan tanggal penetapan

#### Antrian Pairing Request (SC)
- Tampilkan antrian permintaan pergantian KASUH dari MABA beserta indikator SLA
- Aksi: setujui, tolak (wajib isi alasan), atau fulfil dengan menetapkan KASUH baru
- Detail halaman per request: catatan MABA, pair saat ini, status timeline

#### Riwayat Pairing (SC/OC/SUPERADMIN)
- Timeline kronologis semua perubahan pasangan untuk seorang MABA: Buddy, KP Group, Kasuh
- Menampilkan penyebab perubahan dan SC yang melakukan tindakan

### Phase 4 — Dashboard MABA: Relasi Saya

- Halaman "Relasi Saya" menampilkan tiga kartu: KP Group, Buddy Pair, dan Kasuh — dalam satu tampilan
- Setiap kartu menampilkan informasi kontak yang diizinkan (nama, email, WhatsApp) tanpa data sensitif
- Tombol "Ajukan Pergantian Kakak Asuh" langsung dari kartu Kasuh
- Tampilan empty state yang informatif saat belum ada penugasan

### Phase 5 — Dashboard KP dan KASUH

#### Dashboard KP: Grup Saya
- Daftar anggota KP Group dengan kartu per anggota (tanpa isKIP atau kontak darurat)
- Halaman detail per anggota dengan informasi yang diizinkan untuk peran KP

#### Dashboard KASUH: Adik Asuh Saya
- Daftar adik asuh aktif (maksimal 2) dengan kartu ringkasan
- Halaman detail per adik asuh: data lengkap yang diizinkan (tanpa data mental health atau kontak darurat)
- Tombol "Adik tidak dapat dihubungi" untuk melaporkan adik yang tidak bisa dihubungi ke SC

### Phase 6 — Alur Consent Re-Pair (MABA)

- Formulir pengajuan pergantian Kakak Asuh dengan catatan opsional untuk SC
- Semua teks form dikunci di `src/i18n/struktur-copy.ts` — bahasa non-stigmatisasi, disetujui BLM
- Validasi otomatis: blok pengajuan jika melebihi batas 2 kali atau di luar jendela 21 hari
- Halaman pelacak status: MABA dapat melihat perkembangan pengajuannya (Menunggu → Disetujui → Selesai)
- Setelah fulfilled, halaman status menampilkan identitas Kakak Asuh baru

### Phase 7 — Spesifikasi E2E

- 6 file spec Playwright mencakup: setup KP Group, generate Buddy Pair, Kasuh matchmaking, repair consent flow, field-level access restrictions, dan RLS cross-org isolation
- Fixture multi-role: SC, OC, MABA, KP, KASUH — masing-masing dengan auto-login per role

---

## Direncanakan / Deferred

### Negative Constraints Database
- Simpan pasangan yang saling berkonflik ke tabel `PairingConflict` agar dapat dikelola oleh SC
- Saat ini: `applyNegativeConstraints` sudah ada tetapi hanya menerima daftar konflik in-memory (tidak ada UI atau persistensi)

### Pair Health Monitor
- Deteksi otomatis pair KP Group atau Kasuh yang tidak ada aktivitas selama 7+ atau 14+ hari
- Saat ini: `computeUnhealthyPairs` adalah stub yang selalu mengembalikan array kosong; bergantung pada data KasuhLog (M09) dan KPLogDaily (M09)

### Integration & Load Tests
- `tests/integration/pairing/reproducibility.test.ts` — verifikasi reproduksi hasil algoritma dengan DB nyata
- `tests/load/bulk-pair-generation.test.ts` — benchmark bulk generate 200 MABA < 30 detik
- `tests/integration/audit-completeness.test.ts` — validasi 10 aksi M03 semua tercatat di audit log
- Seluruh deferred karena memerlukan staging environment dengan DB seed

### Rollback Script Migration
- Script SQL untuk membatalkan migrasi `20260424300000_nawasena_struktur_angkatan` jika diperlukan rollback sebelum go-live production

### E2E Test Runtime
- 6 spec file sudah dibuat secara sintaktis tetapi belum dijalankan; memerlukan staging DB dengan seed lengkap dan akun 5 role
