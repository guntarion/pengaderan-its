# Fitur Pakta Digital — NAWASENA (M01)

Katalog fitur modul penandatanganan pakta digital.
Dokumentasi teknis: `/src/app/(DashboardLayout)/pakta/README.md`

---

## Membaca Dokumen Pakta

- Menampilkan isi dokumen pakta dalam format teks yang terformat (Markdown rendered).
- Menampilkan judul dan nomor versi dokumen yang sedang ditandatangani.
- Konten pakta diambil secara otomatis berdasarkan jenis pakta dan versi aktif terkini.

## Konfirmasi Tiga Pernyataan

- Pengguna wajib mencentang tiga pernyataan pengakuan sebelum dapat melanjutkan.
- Tombol "Lanjut" hanya aktif setelah ketiga checkbox dicentang.

## Post-test Pemahaman

- Setelah membaca dan mengakui dokumen, pengguna mengerjakan kuis pilihan ganda.
- Skor minimum (passing score) dikonfigurasi per versi dokumen pakta oleh admin.
- Jika skor tidak mencapai minimum, pengguna dapat mencoba kuis ulang.
- Skor yang diraih diteruskan ke halaman konfirmasi sebagai catatan.

## Konfirmasi dan Tanda Tangan Digital

- Halaman ringkasan menampilkan judul dokumen, nomor versi, dan skor kuis.
- Pengguna mengonfirmasi tanda tangan digital secara final.
- Tanda tangan tercatat di basis data dengan timestamp dan ID versi dokumen.

## Penolakan Pakta

- Pengguna dapat memilih untuk menolak menandatangani pakta.
- Formulir penolakan meminta alasan yang dicatat untuk keperluan tindak lanjut.

## Versi dan Pembaruan Dokumen

- Sistem mendukung banyak versi dokumen pakta.
- Ketika admin mempublikasikan versi baru, pengguna yang sudah menandatangani versi lama
  diwajibkan menandatangani ulang versi terbaru.
- Konsistensi versi dijaga selama satu sesi penandatanganan menggunakan parameter `versionId`.
