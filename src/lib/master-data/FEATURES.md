# M02 — Master Data & Taksonomi — Katalog Fitur

Daftar fitur product-facing untuk modul Master Data & Taksonomi. Mencakup semua yang sudah diimplementasi (Fase A–E) dan yang ditangguhkan (Fase F).

---

## Sudah Diimplementasi

### Pengunjung Publik — Katalog Kegiatan

- Halaman `/kegiatan` menampilkan seluruh kegiatan aktif NAWASENA tanpa perlu login.
- Filter multi-dimensi: fase pembinaan (Pra, F1–F4), kategori kegiatan (K1–K7), nilai (N1–N8), intensitas (Ringan/Sedang/Berat), dan skala (Individual/KP/Angkatan/dst.) — kombinasi filter menggunakan logika AND antar-dimensi.
- URL filter shareable: parameter filter ditulis ke query string sehingga link bisa dibagikan langsung.
- Detail kegiatan di `/kegiatan/[id]` menampilkan: deskripsi lengkap (markdown), rasional pedagogis, tujuan pembelajaran, KPI definition, konsep anchor/referensi, passport item terkait, catatan safeguard, dan prasyarat kegiatan lain.
- SEO lengkap: `<title>`, `<meta description>`, Open Graph tags — setiap kegiatan punya metadata tersendiri.
- Halaman loading skeleton, empty state, dan halaman 404 tersedia.
- Konten dirender server-side (SSR) dengan ISR revalidate 1 jam — SEO-friendly dan cepat.

### MABA — Referensi Dashboard

- Halaman `/referensi/taksonomi` menampilkan seluruh dimensi, nilai, fase, dan kategori dalam dua bahasa (Indonesia + English) — MABA dapat memahami terminologi kaderisasi.
- Halaman `/referensi/safeguard` menampilkan protokol safeguard beserta langkah-langkah, peran penanggung jawab, dan kondisi aktivasi — pegangan offline selama kegiatan lapangan.
- Halaman `/referensi/forbidden-acts` menampilkan 20+ tindakan terlarang dikelompokkan per tingkat keparahan (CRITICAL/HIGH/MEDIUM/LOW), lengkap dengan sumber regulasi, konsekuensi, dan sinyal deteksi.
- Halaman `/referensi/rubrik` menampilkan rubrik AAC&U dalam format tabel 4 level per dimensi rubrik — referensi standar penilaian.
- Semua halaman referensi dapat diakses oleh semua peran yang sudah login.

### Pengader (KP/KASUH) — Referensi Lapangan

- Akses ke halaman `/referensi/forbidden-acts` dan `/referensi/safeguard` sebagai pegangan saat menjalankan kegiatan.
- Halaman `/referensi/form-inventory` menampilkan matriks 28+ formulir yang ada di sistem: pengisi, frekuensi, estimasi waktu, prioritas, dan perangkat utama — membantu OC dan SC memahami scope pengumpulan data.
- Navigasi sidebar "Referensi" muncul untuk semua peran yang terotorisasi.

### Admin/SC — Pengelolaan Master Kegiatan

- Halaman `/admin/master/kegiatan` menampilkan tabel seluruh kegiatan dengan kolom: ID, nama, fase, kategori, intensitas, skala, status aktif, dan badge global/org-spesifik.
- Toggle `isActive` langsung dari tabel (inline) — perubahan diterapkan seketika ke katalog publik setelah cache invalidasi.
- Kegiatan global (isGlobal = true) tidak dapat diedit oleh SC biasa — hanya SUPERADMIN — tombol dinonaktifkan dan API mengembalikan 403.
- Setiap perubahan toggle otomatis tercatat di audit log.
- Banner peringatan di admin: "Perubahan ini akan ditiban saat re-seed. Edit CSV + PR untuk permanent."

### SUPERADMIN — Editor Taksonomi

- Halaman `/admin/master/taksonomi` (hanya SUPERADMIN) menampilkan tabel TaxonomyMeta dengan edit inline per baris.
- Edit `labelId`, `labelEn`, dan `deskripsi` tanpa migration database — perubahan langsung aktif di seluruh badge dan referensi aplikasi setelah cache invalidasi.
- Perubahan tercatat di audit log.

### SUPERADMIN — Seed Trigger UI

- Halaman `/admin/master/seed` (hanya SUPERADMIN) menyediakan antarmuka untuk menjalankan seed CSV dari browser.
- Tombol "Preview Diff" menampilkan laporan per entitas (added/updated/unchanged/orphan) tanpa menulis ke database.
- Tombol "Apply Seed" dengan dialog konfirmasi — menjalankan seed penuh dan menginvalidasi semua cache.
- Rate limit: maksimal 1 kali apply per 5 menit.
- Audit log entry `MASTER_DATA_SEED` tercatat setelah setiap apply berhasil.

### Operator — Seed via CLI

- `npm run seed:master-data:preview` — tampilkan diff tanpa tulis (safe untuk inspeksi rutin).
- `npm run seed:master-data:apply` — jalankan seed penuh, idempotent.
- `npm run seed:master-data:apply -- --only=kegiatan` — seed parsial satu entitas.
- Seed berjalan aman bersamaan dengan aplikasi — advisory lock mencegah race condition.
- Laporan log detail: jumlah baris added/updated/unchanged/orphan per entitas, durasi total.
- Validasi Zod per baris CSV + cross-referential integrity check sebelum upsert — gagal cepat dengan pesan error lokasi baris.

---

## Struktur Data Master (11 Tabel)

| Tabel | Isi | Jumlah Baris (seed awal) |
|---|---|---|
| `kegiatan` | Aktivitas kaderisasi dengan metadata taksonomi | 48 |
| `tujuan` | Tujuan pembelajaran per kegiatan | ~70 |
| `kpi_defs` | Definisi KPI per kegiatan | ~96 |
| `anchor_refs` | Referensi konsep/teori per kegiatan | ~48 |
| `passport_items` | Item passport digital per dimensi | ~77 |
| `rubrik` | Rubrik AAC&U 4-level per dimensi | ~32 |
| `forbidden_acts` | Tindakan terlarang dengan tingkat keparahan | 20+ |
| `safeguard_protocols` | Protokol keselamatan dengan langkah-langkah | 15+ |
| `taxonomy_meta` | Label bilingual 4 kelompok taksonomi | 30 |
| `form_inventory` | Inventaris formulir sistem | 28+ |
| `role_permissions` | Matriks izin per peran | ~150 |

---

## Ditangguhkan / Direncanakan

### Fase F — E2E Tests

- Test Playwright untuk katalog publik: filter, URL shareable, navigasi detail.
- Test admin toggle: SC toggle → audit log → katalog update dalam 5 detik.
- Test cross-org isolation: SC HMTC tidak melihat kegiatan HMM-spesifik.
- Test taxonomy edit: label baru terpropagasi ke badge katalog.
- Test seed idempotency: run kedua menghasilkan zero changes; modifikasi CSV terdeteksi.
- Test seed UI: preview diff + apply via antarmuka admin.

### Benchmark & Load Test

- Load test 100 concurrent request `/kegiatan` → P95 < 500ms, 0 error.
- Monitoring Redis cache hit rate setelah warm-up.

### Fitur Opsional (Tidak Dijadwalkan)

- Flag `--respect-manual` pada seed: skip entitas yang sudah diedit manual via admin UI.
- Export katalog kegiatan sebagai PDF (untuk distribusi offline).
- Notifikasi ke SC saat seed diterapkan (via M15 notification).
