# M10 Safeguard & Insiden — Katalog Fitur

Katalog fitur produk untuk modul Safeguard & Insiden. Mencakup fitur yang sudah diimplementasi (Fase A–I) dan yang masih direncanakan (Fase J).

---

## Fitur Terimplementasi (Fase A–I)

### Skema Data & Keamanan Database

- Empat tabel database: `SafeguardIncident`, `ConsequenceLog`, `IncidentTimelineEntry`, `SafeguardEscalationFallback`
- Delapan enum: `IncidentType`, `IncidentSeverity`, `IncidentStatus`, `ConsequenceType`, `ConsequenceStatus`, `PassportCascadeStatus`, `TimelineAction`, `EscalationTarget`
- Row-Level Security (RLS) diterapkan di semua 4 tabel — data insiden satu organisasi tidak dapat diakses oleh organisasi lain
- Timeline insiden bersifat append-only: operasi UPDATE dan DELETE dicabut di level database, bukan hanya aplikasi
- Flag `isSafeguardOfficer` ditambahkan ke profil pengguna, dapat diaktifkan per individu tanpa mengubah peran utama

---

### Pelaporan Insiden (KP / SC / OC)

- Formulir laporan insiden baru dengan klasifikasi tipe (SAFE_WORD, MEDICAL, SHUTDOWN, INJURY, CONFLICT, HARASSMENT, OTHER) dan tingkat keparahan (GREEN / YELLOW / RED)
- Laporan menyimpan waktu kejadian, tindakan yang sudah diambil, dan pengguna yang terdampak
- Daftar insiden dengan filter berdasarkan status, tingkat keparahan, dan tanggal; dilengkapi kartu ringkasan per kategori
- Halaman detail insiden dengan tata letak dua kolom: informasi utama di kiri, timeline dan lampiran di kanan
- Pembaruan otomatis halaman detail setiap 15 detik tanpa perlu refresh manual

---

### Safe Word Quick Widget (KP)

- Tombol merah besar "Safe Word" ditempatkan di bagian atas dashboard KP
- Konfirmasi dua langkah sebelum insiden dikirim untuk mencegah pengiriman tidak disengaja
- Pengiriman otomatis membuat insiden bertipe SAFE_WORD dengan tingkat keparahan RED
- Widget hanya muncul untuk pengguna dengan peran KP; peran lain tidak melihat tombol ini

---

### State Machine Insiden

Status insiden mengikuti alur yang ketat dengan validasi di setiap transisi:

| Dari | Ke | Siapa |
|---|---|---|
| OPEN | IN_REVIEW | SC / Safeguard Officer (claim) |
| IN_REVIEW | RESOLVED | SC / Safeguard Officer (dengan catatan resolusi minimal 30 karakter) |
| RESOLVED | IN_REVIEW | SC saja (reopen dengan alasan) |
| IN_REVIEW | ESCALATED_TO_SATGAS | Safeguard Officer saja |
| OPEN / IN_REVIEW | RETRACTED_BY_REPORTER | Reporter dalam 30 menit pertama |
| OPEN / IN_REVIEW | RETRACTED_BY_SC | SC kapan saja |
| PENDING_REVIEW | OPEN | SC / Safeguard Officer (elaborasi draft dari M09) |
| PENDING_REVIEW / OPEN | SUPERSEDED | SC / sistem via sinyal M09 |

Semua transisi yang tidak terdaftar secara eksplisit ditolak dengan respons 400.

---

### Timeline & Lampiran

- Setiap perubahan status, komentar, dan tindakan tercatat otomatis dalam timeline kronologis dengan ikon per jenis aksi
- Tab filter pada timeline (semua / status / catatan / lampiran)
- Upload hingga 3 lampiran per insiden (JPEG, PNG, WEBP, PDF; maksimal 5 MB per file)
- Unduhan lampiran menggunakan URL bertanda tangan (signed URL) berlaku 10 menit
- Setiap unduhan lampiran dicatat di timeline sebagai `ATTACHMENT_DOWNLOADED`

---

### Eskalasi Otomatis (SC / Safeguard Officer)

- Insiden baru secara otomatis mengirim notifikasi ke seluruh SC, Safeguard Officer, dan Pembina di organisasi yang sama
- Reporter tidak menerima notifikasi dari insiden yang ia buat sendiri
- Deduplikasi Redis mencegah pengiriman notifikasi ganda dalam 30 menit
- Jalur utama: notifikasi via sistem M15 (kategori CRITICAL, melewati setelan DND pengguna) dengan batas waktu 10 detik per penerima
- Jalur cadangan: pengiriman langsung via email (nodemailer) dan web-push jika M15 tidak merespons
- Setiap penggunaan jalur cadangan dicatat di tabel `SafeguardEscalationFallback` untuk monitoring
- Feature flag `M10_USE_M15` mengontrol jalur mana yang aktif

---

### Konsekuensi Pedagogis (SC / Safeguard Officer → MABA)

Lima jenis konsekuensi yang diizinkan sesuai Permendikbudristek 55/2024:

| Jenis | Keterangan |
|---|---|
| REFLEKSI_500_KATA | Tulisan refleksi minimal 500 kata |
| PRESENTASI_ULANG | Presentasi ulang materi tertentu |
| POIN_PASSPORT_DIKURANGI | Pengurangan poin passport digital |
| PERINGATAN_TERTULIS | Surat peringatan resmi |
| TUGAS_PENGABDIAN | Kegiatan pengabdian tambahan |

- Hukuman fisik, verbal, dan psikologis tidak tersedia sebagai pilihan — tidak dapat dimasukkan via API maupun UI
- Banner permanen dan tidak dapat ditutup menampilkan daftar larangan Permen 55/2024 di atas formulir assign
- Alur persetujuan: ASSIGNED → (MABA submit) → PENDING_REVIEW → (SC review) → APPROVED / NEEDS_REVISION
- Deadline dapat diperpanjang oleh SC; konsekuensi yang melewati deadline otomatis berubah ke OVERDUE
- Khusus POIN_PASSPORT_DIKURANGI: pengurangan diteruskan ke modul M05 (feature-flagged)

---

### Self-View Konsekuensi (MABA)

- Halaman `/konsekuensi` menampilkan daftar semua konsekuensi yang ditugaskan kepada pengguna yang sedang login
- Halaman detail per konsekuensi menampilkan formulir pengiriman sesuai tipe (mis. teks refleksi untuk REFLEKSI_500_KATA)
- Counter kata real-time untuk jenis REFLEKSI_500_KATA dengan indikator warna ketika mendekati / mencapai 500 kata
- Jendela retraksi laporan: MABA yang melaporkan insiden dapat menarik laporan dalam 30 menit pertama dengan alasan

---

### Eskalasi ke Satgas + PDF (Safeguard Officer)

- Safeguard Officer dapat mengubah status insiden dari IN_REVIEW ke ESCALATED_TO_SATGAS dengan alasan minimal 50 karakter
- Laporan PDF resmi digenerate otomatis menggunakan `@react-pdf/renderer`, mencakup: header, metadata insiden, narasi, tabel timeline, jumlah lampiran, alasan eskalasi, tanda tangan
- Watermark pada PDF menampilkan nama pengunduh dan waktu unduh
- PDF disimpan di S3 dengan masa berlaku signed URL 7 hari
- Halaman cetak HTML (`/incidents/[id]/print`) tersedia sebagai fallback jika PDF gagal digenerate

---

### Akses Pembina (Read-Only)

- Pembina dapat melihat daftar dan detail insiden di organisasi yang sama
- Tombol aksi (claim, resolve, retract) tidak muncul untuk Pembina
- Pembina dapat menambahkan anotasi pada insiden yang terlihat di timeline sebagai `PEMBINA_ANNOTATION_ADDED`
- Pembina tidak dapat mengunduh lampiran — hanya melihat jumlah lampiran

---

### Integrasi M09 Red Flag Cascade

- Saat KP mencatat red flag di logbook harian (M09), insiden draft otomatis dibuat di M10 sebagai `PENDING_REVIEW`
- Idempoten: jika red flag yang sama diproses ulang dalam 1 jam, insiden yang ada dikembalikan tanpa membuat duplikat
- Jika KP menghapus red flag dari logbook, insiden terkait otomatis berubah ke SUPERSEDED (bila masih di PENDING_REVIEW / OPEN)
- Pemetaan tipe: INJURY → RED, SHUTDOWN/PSYCHOLOGICAL → YELLOW, lainnya → YELLOW
- Feature flag `M09_M10_CASCADE_ENABLED` (default: false) untuk deploy bertahap

---

## Direncanakan (Fase J)

### E2E Test Suite (`e2e/safeguard/`)

Dua belas spesifikasi Playwright yang mencakup:
- Alur safe word end-to-end
- Setiap transisi state machine
- Cascade M09 dan idempotency
- Assign dan cascade konsekuensi
- Akses read-only Pembina
- Submit konsekuensi oleh MABA
- Eskalasi ke Satgas dan PDF
- Upload lampiran
- Retraksi dalam dan luar jendela waktu
- Isolasi multi-tenant (cross-org tidak bisa akses)
- Verifikasi SLA eskalasi < 5 menit
- Penolakan tipe hukuman fisik via API (`zero-hukuman-fisik.spec.ts`)

### Load Test

- 20 insiden RED secara bersamaan, semua tereskalasi dalam SLA, tidak ada notifikasi duplikat

### Pemindaian Keamanan

- Verifikasi template notifikasi tidak memuat detail insiden ke MABA yang terdampak
- Verifikasi expiry signed URL (lampiran dan PDF)
- Tes isolasi RLS cross-org

### Feature Flag Final untuk Go-Live

- `M10_USE_M15=true`
- `M09_M10_CASCADE_ENABLED=true` (setelah M09 Fase F stabil)
- `M10_M05_PASSPORT_CASCADE_ENABLED=true` (setelah M05 stabil)

### Materi Pelatihan & Go-Live

- Panduan onboarding SC (deck + demo video widget F1)
- Pelatihan KP: kapan menggunakan safe word, UX retraksi
- Pelatihan Pembina: cakupan read-only dan penggunaan anotasi
- Runbook penanganan insiden untuk tim SC
- Smoke test di staging dengan data nyata
- Sign-off pemangku kepentingan (SC lead, Pembina, SUPERADMIN)
