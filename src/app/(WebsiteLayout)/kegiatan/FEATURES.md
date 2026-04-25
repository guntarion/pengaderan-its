# Fitur Katalog Kegiatan (Publik)

Halaman publik untuk menjelajahi seluruh kegiatan pengaderan mahasiswa baru ITS tanpa memerlukan akun.

## Kemampuan Pengguna

### Menjelajahi Katalog
- Melihat seluruh kegiatan pengaderan yang aktif dalam tampilan kartu grid.
- Memfilter kegiatan berdasarkan kombinasi:
  - **Fase** — tahap pelaksanaan dalam program pengaderan.
  - **Kategori** — jenis/tipe kegiatan.
  - **Nilai** — nilai inti yang dikembangkan.
  - **Intensitas** dan **Skala** kegiatan.
- Jumlah hasil filter ditampilkan di header halaman.

### Membaca Detail Kegiatan
- Membuka halaman detail kegiatan untuk melihat:
  - Deskripsi singkat dan deskripsi lengkap (markdown).
  - Rasional kegiatan (markdown).
  - Tujuan pembelajaran terstruktur.
  - Definisi KPI pengukuran.
  - Konsep-konsep anchor yang mendasari.
  - Item passport digital yang terkait.
  - Catatan safeguard (jika ada), ditampilkan dengan warna peringatan.
  - Prasyarat kegiatan lain (dengan tautan).
  - Sesi mendatang (upcoming instances) beserta detail waktu dan lokasi.

### Melihat Detail Sesi
- Membuka halaman publik sesi event spesifik (`/kegiatan/instance/[instanceId]`) untuk melihat informasi sesi dan ajakan masuk ke sistem.

## Performa & SEO
- Halaman ter-cache via ISR dengan revalidasi setiap 1 jam.
- Kegiatan global aktif di-pre-render saat build (`generateStaticParams`).
- Open Graph metadata tersedia di halaman katalog dan detail.
- Tampilan skeleton tersedia selama data dimuat (Suspense boundary).

## Cross-reference

Lihat [README.md](./README.md) untuk dokumentasi teknis modul ini.
