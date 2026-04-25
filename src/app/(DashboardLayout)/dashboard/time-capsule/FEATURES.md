# Time Capsule — Katalog Fitur

**Pengguna**: MABA (penulis), Kakak Kasuh (baca entri yang dibagikan), Admin/SUPERADMIN (bypass)

Lihat juga: [README.md](./README.md)

---

## F1 — Daftar Catatan Harian

**Rute**: `/dashboard/time-capsule`

Halaman utama menampilkan seluruh catatan yang telah dipublikasikan dengan fitur:

- **Pencarian** berdasarkan kata kunci judul atau isi
- **Filter mood** (1–5) menggunakan Select
- **Filter status berbagi** (semua / dibagikan ke Kasuh / privat)
- Pagination dengan tombol Sebelumnya/Berikutnya
- Kartu entri menampilkan: emoji mood, judul (atau "Tanpa Judul"), tanggal publikasi, cuplikan isi, dan ikon kunci/bagikan sesuai status
- Tombol "Tulis Catatan Baru" menuju `/dashboard/time-capsule/new`
- Skeleton loading saat data sedang dimuat

---

## F2 — Buat Catatan Baru

**Rute**: `/dashboard/time-capsule/new`

Form penulisan catatan harian dengan fitur lanjutan:

- **Editor markdown** — textarea dengan pratinjau rendered (toggle Preview)
- **Pemilih mood** — skala 1–5 dengan emoji representatif
- **Auto-save draft** — tersimpan ke localStorage setiap 1 detik (debounce) dan ke server setiap 5 detik; draft dipulihkan otomatis saat halaman dibuka kembali
- **Pemulihan draft** — pesan informasi muncul jika draft lokal lebih baru dari draft server
- **Bagikan ke Kasuh** — checkbox dengan dialog konfirmasi sebelum publikasi
- **Upload lampiran** — unggah foto atau file setelah catatan disimpan
- Tombol "Simpan" menonaktifkan diri sendiri saat mengirim; redirect ke daftar setelah berhasil

---

## F3 — Detail dan Edit Catatan

**Rute**: `/dashboard/time-capsule/:entryId`

Tampilan detail catatan yang sudah dipublikasikan:

- **Pratinjau markdown** — isi catatan dirender sebagai HTML dengan gaya tipografi
- Mood emoji, tanggal publikasi, dan status berbagi ditampilkan di header
- Galeri lampiran (foto/file) jika ada

### Jendela Edit 24 Jam

Selama 24 jam setelah publikasi, tombol "Edit" muncul:
- Membuka kembali `TimeCapsuleEditor` dengan konten yang sudah ada
- Sisa waktu edit ditampilkan (jam:menit)
- Setelah jendela 24 jam berakhir, catatan menjadi hanya-baca

### Toggle Berbagi dengan Kasuh

- Tombol "Bagikan" / "Batalkan Berbagi" tersedia pada detail maupun form edit
- Dialog konfirmasi muncul sebelum membagikan
- Ketika dibagikan, Kakak Kasuh menerima notifikasi dalam aplikasi
- Toggle tidak memengaruhi catatan lain

---

## F4 — Draft Otomatis

Berlaku di halaman `/new` dan edit entri:

- Isi editor disimpan ke localStorage tanpa perlu menekan tombol
- Draft juga dikirim ke server setiap 5 detik sebagai cadangan
- Saat halaman dibuka: sistem membandingkan stempel waktu lokal vs server dan memuat versi terbaru
- Draft lokal dibersihkan setelah catatan berhasil dipublikasikan

---

## F5 — Lampiran

Tersedia setelah catatan dipublikasikan:

- Upload foto (JPEG/PNG) atau dokumen (PDF) via URL S3 yang ditandatangani
- Thumbnail galeri ditampilkan di bawah konten catatan
- Tombol hapus per lampiran dengan konfirmasi

---

## F6 — Tampilan Kasuh (Baca Saja)

**Rute**: `/dashboard/kasuh/adik-asuh/:mabaId/time-capsule`

Kakak Kasuh dapat membaca catatan Adik Asuh yang ditandai `sharedWithKasuh = true`:

- Ditampilkan dalam mode hanya-baca (tanpa tombol edit, hapus, atau share)
- Spanduk privasi mengingatkan bahwa konten dibagikan secara sukarela oleh Maba
- Akses diblokir jika tidak ada KasuhPair aktif antara kedua pengguna
- Akses lintas pasangan atau lintas organisasi mengembalikan HTTP 403

---

## F7 — Hapus Catatan

- Tombol "Hapus" tersedia di halaman detail (hanya pemilik)
- Dialog konfirmasi via `useConfirm` sebelum penghapusan
- Catatan yang memiliki lampiran: lampiran dihapus dari S3 terlebih dahulu
- Penghapusan dicatat dalam audit log (`TIME_CAPSULE_DELETE`)

---

## Referensi Mood

| Nilai | Emoji | Makna |
|---|---|---|
| 1 | Perasaan sangat rendah |
| 2 | Kurang baik |
| 3 | Biasa saja |
| 4 | Cukup baik |
| 5 | Luar biasa |
