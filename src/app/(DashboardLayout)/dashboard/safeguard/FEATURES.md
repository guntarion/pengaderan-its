# Fitur — Safeguard & Insiden (M10)

Modul ini diperuntukkan bagi staf (SC, Pembina, OC, KP, BLM, Satgas, dan
Safeguard Officer) untuk mengelola insiden keselamatan dan konsekuensi
pedagogis selama kegiatan kaderisasi. MABA tidak memiliki akses langsung ke
modul ini.

## Fitur Utama

### 1. Daftar Insiden
- Tabel berhalaman dengan ringkasan: jumlah terbuka, dalam-review, dan terlambat.
- Kolom: jenis insiden, tingkat keparahan, status, waktu kejadian, pelapor,
  dan petugas penanganan.
- Tombol Lapor Insiden Baru (untuk peran yang berwenang).

### 2. Laporan Insiden Baru (F2)
- Formulir lengkap: jenis, tingkat keparahan (RED/YELLOW/GREEN), waktu kejadian,
  kohort, pengguna terdampak, dan tindakan awal.
- Legenda keparahan ditampilkan di samping formulir untuk membantu pemilihan.

### 3. Detail Insiden
- Tampilan dua kolom: detail utama (kiri) dan linimasa + lampiran (kanan).
- Linimasa append-only: setiap tindakan (klaim, eskalasi, resolusi, pencabutan)
  dicatat secara permanen dan tidak dapat dihapus.
- Polling otomatis setiap 15 detik untuk pembaruan status real-time.
- Tombol aksi berbasis peran dan kondisi status (`IncidentActionBar`).
- Tombol cetak untuk dokumentasi resmi.
- Pencabutan insiden oleh pelapor dalam 30 menit pertama; setelah itu hanya SC.

### 4. Daftar Konsekuensi
- Tabel semua konsekuensi yang pernah diberikan kepada MABA.
- Filter status: Ditugaskan, Menunggu Review, Perlu Revisi, Disetujui, Terlambat.
- Tombol Berikan Konsekuensi Baru.

### 5. Pemberian Konsekuensi Baru
- Selector jenis konsekuensi terbatas pada lima jenis sesuai Permen 55/2024
  (tidak ada hukuman fisik).
- Banner pendidikan permanen yang tidak dapat ditutup, mengingatkan dasar hukum
  larangan kekerasan.
- Field: MABA target, alasan, tenggat waktu, poin passport yang dikurangi
  (jika jenis `POIN_PASSPORT_DIKURANGI`), insiden terkait (opsional).
- Beberapa jenis konsekuensi (`POIN_PASSPORT_DIKURANGI`, `PERINGATAN_TERTULIS`)
  hanya dapat diberikan oleh SC atau Safeguard Officer.

## Perlindungan Anti-Kekerasan (Tiga Lapis)
1. UI hanya menampilkan lima jenis konsekuensi non-fisik.
2. Banner Permen 55/2024 selalu tampil dan tidak dapat ditutup.
3. API menolak jenis konsekuensi di luar daftar yang diizinkan.

---

Lihat juga: [README arsitektur](./README.md)
