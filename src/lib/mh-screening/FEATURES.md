# M11 — Mental Health Screening — Katalog Fitur

> Dokumen ini mendeskripsikan fitur modul M11 dari sudut pandang pengguna, dikelompokkan per peran.
> Bahasa: Indonesia formal.
> Lihat juga: [README.md](./README.md) untuk dokumentasi arsitektur teknis.

---

## Ringkasan Modul

Modul M11 menyediakan sistem skrining kesehatan mental berbasis instrumen klinis (PHQ-9) untuk seluruh Maba aktif di NAWASENA. Sistem ini dirancang dengan prinsip **privasi absolut**: data disimpan terenkripsi, akses dicatat secara permanen, dan hanya pihak yang berwenang dapat mengakses informasi individual. Pengisian bersifat sukarela dan tidak berdampak pada status kaderisasi.

---

## Fitur per Peran

### A. Maba (Mahasiswa Baru)

#### A.1 Alur Persetujuan (Informed Consent)

Sebelum mengisi skrining, Maba diwajibkan membaca dan menyetujui pernyataan persetujuan informasi.

- Teks persetujuan ditampilkan penuh dalam halaman; tombol persetujuan hanya aktif setelah pengguna menggulir hingga akhir teks.
- Maba dapat membuka teks lengkap kapan saja melalui modal.
- Persetujuan menyimpan referensi versi teks (misalnya v1.0) sehingga perubahan teks di masa mendatang memicu persetujuan ulang secara otomatis.
- Menolak memberikan persetujuan tidak berdampak pada status kaderisasi, nilai Passport, atau penilaian apapun.

#### A.2 Pengisian Skrining PHQ-9

Instrumen yang tersedia pada V1 adalah PHQ-9 (Patient Health Questionnaire 9 item), divalidasi dalam Bahasa Indonesia.

- Formulir ditampilkan satu pertanyaan per langkah (one-per-step) untuk mengurangi kelelahan dan mendorong respons yang cermat.
- Terdapat indikator progres yang menunjukkan posisi saat ini dari total 9 pertanyaan.
- Pertanyaan nomor 9 (terkait dorongan menyakiti diri) disertai panduan tambahan dan jalur respons darurat.
- Pengisian dapat dilakukan dua kali per cohort: fase F1 (minggu kedua) dan fase F4 (re-skrining akhir).
- Jawaban dienkripsi di lapisan basis data sebelum disimpan; tidak ada data jawaban yang tersimpan dalam format terbaca di server aplikasi.

#### A.3 Tampilan Hasil

Setelah pengisian, Maba melihat hasil dalam bahasa yang tidak menstigmatisasi.

- Hasil ditampilkan sebagai label deskriptif (misalnya "Kondisi Anda tergolong perlu perhatian lebih") tanpa angka skor mentah.
- Tidak ada label warna (hijau/kuning/merah) yang ditampilkan kepada Maba — warna hanya digunakan di sisi konselor SAC.
- Halaman hasil selalu menyertakan tautan ke sumber daya edukatif dan kontak hotline.
- Apabila hasil memerlukan tindak lanjut segera (item nomor 9 dijawab positif), banner darurat menampilkan nomor hotline 119 ext 8 dan informasi kontak SAC.

#### A.4 Riwayat Pengisian

Maba dapat melihat daftar seluruh pengisian skrining miliknya.

- Setiap entri menampilkan tanggal pengisian, fase (F1/F4), dan label hasil.
- Detail per pengisian dapat dibuka untuk melihat informasi lebih lanjut (tanpa menampilkan skor mentah).

#### A.5 Kendali Privasi

Maba memiliki kendali penuh atas datanya melalui halaman Kendali Privasi.

- **Penarikan Persetujuan**: Maba dapat menarik persetujuan kapan saja. Penarikan ini akan menandai data untuk dihapus dalam siklus purge berikutnya.
- **Permintaan Penghapusan Data**: Maba dapat mengajukan permintaan penghapusan seluruh data skrining. Penghapusan dijadwalkan dalam 7 hari sebagai masa tenggang; permintaan diblokir sementara jika terdapat referral SAC yang sedang aktif (demi keselamatan).
- **Opt-in Penelitian**: Maba dapat memilih untuk mengizinkan data anonim digunakan untuk keperluan penelitian ilmiah (non-identifikasi). Pilihan ini memperpanjang retensi data hingga 2 tahun. Opt-in dapat ditarik kapan saja.

---

### B. SAC Counselor (Konselor SAC)

Akses SAC Counselor tersedia bagi pengguna dengan peran SC dan flag `isSACCounselor = true`.

#### B.1 Antrean Referral

Halaman antrean menampilkan seluruh kasus yang dirujuk kepada konselor yang sedang masuk.

- Setiap baris menampilkan: ID referral anonim, fase skrining, tingkat urgensi (SLA countdown), dan status saat ini.
- Indikator SLA menunjukkan sisa waktu dari batas 72 jam (atau 24 jam untuk kasus dengan `immediateContact=true`).
- Kasus yang mendekati atau melewati batas waktu ditandai secara visual.
- Konselor hanya dapat melihat kasus yang ditugaskan kepadanya; tidak ada akses ke kasus konselor lain.

#### B.2 Detail Kasus

Halaman detail menampilkan informasi kasus secara bertahap untuk meminimalkan eksposur data tidak perlu.

- Metadata (fase, waktu pengisian, status, timeline) ditampilkan tanpa dekripsi secara otomatis.
- Konselor harus secara eksplisit menekan tombol "Lihat Jawaban" untuk memulai proses dekripsi. Setiap tindakan dekripsi dicatat secara permanen dalam log audit.
- Timeline kasus menampilkan seluruh riwayat tindakan: kapan dibuat, kapan diakui, catatan yang ditambahkan, perpindahan penugasan, dan eskalasi.

#### B.3 Tindak Lanjut

Setelah meninjau kasus, konselor dapat melakukan tindak lanjut melalui formulir follow-up.

- Konselor dapat menambahkan catatan terenkripsi (disimpan terenkripsi, hanya bisa dibaca saat sesi aktif dengan dekripsi eksplisit).
- Konselor dapat mengubah status referral: dari PENDING ke IN_PROGRESS, lalu ke RESOLVED.
- Saat menutup kasus (RESOLVED), konselor diwajibkan mengisi catatan resolusi.

#### B.4 Penugasan Ulang

Konselor atau koordinator dapat memindahkan kasus ke konselor lain.

- Formulir penugasan ulang mengharuskan pengisian alasan perpindahan.
- Perpindahan dicatat dalam timeline kasus; riwayat penugasan sebelumnya tetap tersimpan dan tidak dapat dihapus.

#### B.5 Rujukan Silang ke M10 Safeguard

Apabila konselor menilai kasus memerlukan penanganan melalui modul Safeguard (misalnya indikasi kekerasan atau risiko keselamatan segera), konselor dapat membuat rujukan silang secara manual.

- Tersedia dialog konfirmasi yang mengharuskan konselor mendokumentasikan dasar pertimbangan dan konfirmasi bahwa persetujuan Maba telah diperoleh atau dasar duty of care telah terpenuhi.
- Tindakan ini dicatat dalam log audit dan tidak dapat dibatalkan.

---

### C. Koordinator Poli Psikologi

Akses tersedia bagi pengguna dengan flag `isPoliPsikologiCoord = true`.

#### C.1 Pengambilalihan Kasus Tereskalasi

Koordinator memperoleh akses ke kasus yang telah melewati batas SLA tanpa penanganan SAC (referral tereskalasi).

- Akses dibatasi hanya pada kasus dengan status eskalasi aktif (`escalatedAt IS NOT NULL`).
- Koordinator dapat mengambil alih kasus (status berubah menjadi TAKEN_OVER) dan menyelesaikannya secara langsung.
- Seluruh akses dan tindakan dicatat dalam log audit.

#### C.2 Notifikasi Eskalasi

Koordinator menerima notifikasi CRITICAL melalui M15 setiap kali terdapat kasus yang melewati SLA.

- Notifikasi berisi referensi referral dan konteks anonim (tanpa nama Maba).
- SLA eskalasi: koordinator dihubungi dalam kurang dari 24 jam setelah SLA SAC terlampaui.

---

### D. Admin / SC / Pembina / BLM

Pengguna dengan peran tersebut hanya dapat mengakses data agregat anonim; tidak ada akses ke data individual.

#### D.1 Dashboard Agregat Distribusi Tingkat Keparahan

Halaman agregat menampilkan distribusi hasil skrining per kelompok KP dalam satu cohort.

- Data dikelompokkan berdasarkan KP-Group dan fase skrining (F1 atau F4).
- Sel dengan jumlah kurang dari 5 Maba ditampilkan sebagai "\<5" (disamarkan) untuk mencegah kemungkinan identifikasi ulang.
- Penyamaran ditegakkan di sisi server dan tidak dapat dilewati melalui filter antarmuka pengguna.

#### D.2 Tampilan Transisi F1-F4

Halaman transisi menampilkan pergerakan Maba antar kategori keparahan antara fase F1 dan F4.

- Ditampilkan dalam format matriks (misalnya: dari F1-GREEN ke F4-GREEN, dari F1-RED ke F4-GREEN, dan seterusnya).
- Berguna untuk mengevaluasi efektivitas program kaderisasi dalam mendukung kondisi mental Maba.
- Sel dengan jumlah kecil tetap disamarkan.

#### D.3 Ekspor CSV

Pengguna dengan akses tinggi (SUPERADMIN) dapat mengunduh data agregat dalam format CSV.

- CSV yang diunduh menerapkan aturan penyamaran sel yang sama dengan tampilan layar.
- Setiap unduhan dicatat dalam log audit dengan entri `EXPORT_AGGREGATE`.

---

### E. Superadmin

#### E.1 Penampil Log Audit MH

Superadmin dapat mengakses riwayat lengkap semua tindakan yang melibatkan data MH.

- Tersedia filter berdasarkan tindakan, pelaku, rentang waktu, dan ID pengguna target.
- Setiap kueri ke log audit itu sendiri juga dicatat (tindakan `AUDIT_REVIEW`) — log bersifat self-auditing.
- Log audit bersifat immutable: tidak ada endpoint untuk mengubah atau menghapus entri.

#### E.2 Pemrosesan Permintaan Penghapusan Data

Superadmin dapat meninjau dan memproses permintaan penghapusan data yang diajukan Maba.

- Tersedia daftar permintaan yang tertunda beserta status: menunggu, diblokir (kasus aktif), atau siap diproses.
- Setiap tindakan pemrosesan dicatat dalam log audit.

---

## Fitur Lintas Peran

### F.1 Sumber Daya Edukatif (Publik)

Tersedia di halaman publik `(WebsiteLayout)/mental-health/` tanpa memerlukan autentikasi.

- **Self-Care**: Artikel panduan perawatan diri berbasis bukti.
- **Bantuan**: Cara menghubungi SAC dan daftar hotline (termasuk 119 ext 8 untuk krisis).
- **FAQ Anti-Stigma**: Pertanyaan umum tentang kesehatan mental, dirancang untuk mengurangi hambatan mencari bantuan.

Seluruh konten menggunakan bahasa yang tidak menstigmatisasi dan tidak menampilkan label atau angka yang dapat menimbulkan kekhawatiran berlebihan.

### F.2 Notifikasi (Melalui M15)

| Penerima | Template | Kategori | Isi |
|---|---|---|---|
| SAC yang ditugaskan | MH_REFERRAL_SAC | CRITICAL | Referral baru — tanpa nama Maba, hanya ref cohort/KP-Group |
| KP terkait | MH_SUPPORT_ALERT_KP | NORMAL | Pemberitahuan anonim bahwa salah satu anggota KP-Group mendapat pendampingan SAC |
| Koordinator Poli Psikologi | MH_ESCALATION_COORDINATOR | CRITICAL | Referral melewati SLA |
| SAC (kasus darurat) | MH_IMMEDIATE_CONTACT | CRITICAL | Kasus dengan item #9 positif — SLA 24 jam |
| Maba | MH_RETENTION_WARNING | NORMAL | 14 hari sebelum data dihapus otomatis |

### F.3 Kepatuhan Privasi dan Regulasi

Seluruh fitur M11 dirancang untuk memenuhi:

- **UU PDP 27/2022**: data kesehatan mental sebagai kategori khusus — persetujuan eksplisit, retensi terbatas, hak penghapusan.
- **Permen Dikbudristek 30/2021**: kewajiban perguruan tinggi menyediakan layanan dukungan psikologis.
- **Standar etik HIMPSI**: informed consent, kompetensi penanganan, kerahasiaan klinis.

Catatan: Fitur M11 memerlukan penyelesaian proses DPIA, MOU dengan SAC dan Poli Psikologi ITS, serta uji penetrasi sebelum dapat diaktifkan di lingkungan produksi.

---

## Pembatasan Fitur (V1)

- **GAD-7 dan DASS-21** tersedia sebagai kode stub di sistem (infrastructure sudah ada) tetapi belum diaktifkan untuk pengisian. Akan diaktifkan pada V2 dan V3.
- **Skrining mandiri** (Maba memulai skrining di luar jadwal F1/F4) tersedia sebagai enum `SELF_TRIGGERED` di schema tetapi belum diaktifkan di antarmuka V1.
- **Akses orang tua/wali** tidak tersedia dan tidak direncanakan — sesuai prinsip otonomi dan UU PDP.
- **Dosen Wali** tidak terhubung ke M11. Koordinasi dengan Dosen Wali, bila diperlukan SAC, dilakukan di luar sistem dengan persetujuan Maba.
- **Analitik penelitian** (ekspor data de-identifikasi untuk peneliti) direncanakan sebagai fitur terpisah dengan kontrol akses peran `RESEARCHER` di versi mendatang.

---

Lihat [README.md](./README.md) untuk dokumentasi arsitektur dan keputusan teknis.
Lihat [08-master-checklist.md](./08-master-checklist.md) untuk status implementasi.
