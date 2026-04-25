# M07 Time Capsule & Personal Life Map — Katalog Fitur

Katalog fitur modul Time Capsule & Personal Life Map. Mencakup fitur yang telah diimplementasi (Phases A–G) dan fitur yang direncanakan (Phase H).

---

## Diimplementasi

### Phase A — Fondasi Data

- Skema database dengan 4 model (TimeCapsule Entry, Attachment, LifeMap, LifeMapUpdate) dan 3 enum (LifeArea, LifeMapStatus, MilestoneKey).
- Isolasi data antarorganisasi dan antarpengguna ditegakkan di level database (Row Level Security), bukan hanya di kode aplikasi.
- 6 template notifikasi tersedia: pengingat milestone M1/M2/M3, notifikasi overdue, dan notifikasi berbagi ke Kasuh.
- Data contoh tersedia di lingkungan pengembangan: 3 entri Time Capsule, 6 tujuan Life Map, dan 2 update milestone.

### Phase B — Time Capsule CRUD dan Editor

#### Penulisan Refleksi

- MABA dapat membuat entri refleksi pribadi dengan judul (opsional, maks 120 karakter) dan isi (wajib, maks 10.000 karakter) menggunakan format Markdown.
- Mood harian dapat ditandai dengan skala 1–5 yang selaras dengan sistem M04 Pulse Journal.
- Editor tersedia dalam dua mode: tulis langsung atau pratinjau render Markdown.

#### Penyimpanan Otomatis

- Draf tersimpan otomatis ke penyimpanan lokal perangkat setiap 1 detik.
- Sinkronisasi draf ke server terjadi setiap 30 detik saat ada perubahan.
- Indikator "Tersimpan otomatis HH:MM" muncul di editor.

#### Kelola Entri

- Daftar entri dapat difilter berdasarkan mood, status berbagi, atau dicari berdasarkan teks.
- Entri dapat diedit dalam waktu 24 jam setelah dipublikasikan.
- Entri yang melewati batas waktu edit ditampilkan sebagai hanya-baca.

### Phase C — Lampiran File

#### Unggah Lampiran

- MABA dapat melampirkan hingga 3 file per entri (gambar, audio, atau dokumen).
- Batas ukuran file: 10 MB per lampiran.
- Unggahan menggunakan presigned URL langsung ke S3/Spaces — file tidak melewati server aplikasi.
- Percobaan ulang otomatis hingga 3 kali bila unggahan gagal (exponential backoff).

#### Pratinjau dan Unduhan

- Gambar ditampilkan langsung di dalam galeri entri.
- Audio dapat diputar langsung di halaman detail.
- Tautan unduhan menggunakan presigned URL dengan masa berlaku 1 jam.

#### Pembersihan Otomatis

- Lampiran yang belum dikonfirmasi (gagal ditautkan ke entri) dihapus otomatis setelah 7 hari oleh cron harian.

### Phase D — Life Map: Tujuan Hidup SMART

#### Buat dan Kelola Tujuan

- MABA dapat menetapkan tujuan SMART di 6 area kehidupan:

| Area | Cakupan |
|------|---------|
| Pengembangan Diri | Kepribadian, karakter, kebiasaan |
| Studi & Karir | Akademik, skill profesional |
| Finansial | Literasi keuangan, tabungan |
| Kesehatan | Fisik, mental, olahraga, pola tidur |
| Sosial | Pertemanan, komunitas, kontribusi |
| Keluarga | Keluarga inti, relasi |

- Setiap area dapat memiliki hingga 5 tujuan aktif secara bersamaan.
- Setiap tujuan mencakup: teks tujuan, metrik terukur, alasan pentingnya, dan tenggat waktu (minimal 30 hari ke depan).

#### Status Tujuan

- **ACTIVE** — tujuan sedang berjalan.
- **ACHIEVED** — ditandai tercapai saat update milestone; dicatat tanggal pencapaiannya.
- **ADJUSTED** — tujuan direvisi secara material; versi baru dibuat dan terhubung ke versi lama (rantai riwayat tujuan dapat ditelusuri).

### Phase E — Update Milestone

#### Tiga Checkpoint Terjadwal

- Setiap tujuan memiliki tiga titik pelaporan: M1 (awal F2), M2 (pertengahan F2), M3 (akhir F2).
- MABA mengisi persentase kemajuan (0–100%), narasi kemajuan (min. 50 karakter), dan refleksi (min. 50 karakter) di setiap milestone.
- Sistem mendeteksi apakah update dilakukan di dalam atau di luar jendela waktu yang ditentukan (pengiriman terlambat dicatat).
- Update dapat diedit dalam 7 hari setelah pertama kali dikirim.
- Setiap milestone hanya dapat diisi satu kali per tujuan — duplikasi ditolak dengan kode error spesifik.

#### Tampilan Perbandingan

- Halaman detail milestone menampilkan perbandingan M1 vs M2 vs M3 secara berdampingan untuk melihat perkembangan dari waktu ke waktu.

#### Pengingat Otomatis

- Cron harian (01:00 WIB) mengirim pengingat ke MABA yang memiliki tujuan aktif saat jendela milestone terbuka.
- Pengingat overdue dikirim 7 hari setelah jendela milestone tutup bila MABA belum mengisi.

### Phase F — Kontrol Berbagi ke Kasuh

#### Per-Entri dan Per-Tujuan

- MABA dapat mengaktifkan/menonaktifkan berbagi untuk setiap entri Time Capsule secara individual.
- MABA dapat mengaktifkan/menonaktifkan berbagi untuk setiap tujuan Life Map secara individual.
- Saat berbagi diaktifkan, notifikasi dikirim ke Kakak Kasuh aktif.
- Setiap perubahan status berbagi dicatat di log audit (nilai sebelum dan sesudah).

#### Tampilan Kasuh (Hanya Baca)

- Kasuh dapat membuka halaman khusus untuk melihat entri Time Capsule dan tujuan Life Map yang dibagikan oleh adik asuh mereka.
- Tampilan Kasuh bersifat hanya-baca — tidak ada tombol edit atau komentar.
- Banner pemberitahuan ditampilkan untuk menegaskan bahwa konten adalah milik MABA dan bersifat pribadi.
- Kasuh hanya dapat melihat data adik asuh dari pasangan aktif mereka; akses lintas pasangan atau lintas organisasi ditolak.

### Phase G — Portfolio

#### Tampilan Terintegrasi

- Halaman Portfolio menampilkan ringkasan Time Capsule (total entri, entri terbaru), Life Map (tujuan per area beserta status milestone), dan placeholder untuk data Passport (M05).
- Data portfolio di-cache selama 5 menit untuk performa; cache diperbarui otomatis saat ada perubahan data.

#### Akses Kasuh ke Portfolio Adik Asuh

- Kasuh dapat membuka portfolio adik asuh mereka melalui parameter URL (`?userId=...`).
- Akses Kasuh diverifikasi ganda: pengecekan aplikasi dan RLS database.
- Akses oleh Kasuh dicatat di log audit (`PORTFOLIO_VIEW_ACCESS`).

#### Ekspor (Direncanakan)

- Tombol "Ekspor PDF" tersedia di UI tetapi dinonaktifkan (tooltip menjelaskan fitur belum tersedia).

---

## Direncanakan (Phase H)

### Cron Retensi Data

- Entri Time Capsule yang lebih dari 2 tahun akan dihapus otomatis (dengan pengecualian bila MABA mengaktifkan `extendedRetention`).
- Data Life Map akan dihapus 1 tahun setelah kelulusan.
- Penghapusan dilakukan dalam batch dengan mode dry-run yang harus diverifikasi selama 1 minggu sebelum diaktifkan penuh.
- API cron sudah direncanakan tetapi belum dibuat.

### Pengaturan Privasi Global

- Halaman pengaturan (`settings/privacy`) untuk mengatur default berbagi ke Kasuh secara global (untuk semua entri baru sekaligus).
- API backend sudah tersedia; halaman UI belum dibuat.

### Suite E2E (15 Skenario)

- Pengujian otomatis mencakup: membuat dan mengedit entri, unggah lampiran, auto-save, membuat tujuan, mengisi milestone, perbandingan milestone, toggle berbagi, akses Kasuh, blokir lintas-pasangan, blokir lintas-organisasi, dan portfolio.

### Uji Beban

- Target: 300 MABA membuka Portfolio bersamaan dengan p95 di bawah 2 detik.
- Target: 100 unggahan lampiran bersamaan dengan waktu presigned URL di bawah 300ms.

### Pemolesan QA

- Uji perangkat mobile (iPhone dan Android mid-range).
- Uji mode gelap di semua halaman modul.
- Audit aksesibilitas (navigasi keyboard, atribut aria, kontras warna).
