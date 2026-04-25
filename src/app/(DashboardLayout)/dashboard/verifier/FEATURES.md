# Fitur Passport Verifier

Katalog fitur yang tersedia bagi pengguna dengan peran KP, KASUH, SC, dan SUPERADMIN.

## 1. Antrian Verifikasi

- Daftar semua entri passport MABA yang menunggu keputusan (status PENDING)
- Informasi per baris: nama MABA, NRP, nama item passport, dimensi, tipe bukti, lama menunggu (hari)
- Catatan dari MABA turut ditampilkan untuk konteks

## 2. Badge Count Antrian

- Badge jumlah entri PENDING diperbarui otomatis setiap 30 detik tanpa reload halaman
- Badge menghilang otomatis jika antrian kosong

## 3. Tampilan Bukti

- Pratinjau langsung file bukti (gambar, PDF) yang diunggah MABA dari S3/Spaces
- Signed URL dengan masa berlaku terbatas untuk keamanan akses

## 4. Approve Satu Klik

- Tombol persetujuan di panel review, atau tekan keyboard `A`
- Konfirmasi otomatis dengan notifikasi ke MABA setelah disetujui
- Idempotent — klik berulang tidak menghasilkan pemrosesan ganda

## 5. Penolakan dengan Alasan

- Tekan `R` atau klik tombol Tolak untuk membuka modal alasan penolakan
- Alasan minimal 10 karakter untuk memastikan umpan balik yang bermakna bagi MABA
- Notifikasi penolakan dikirim ke MABA secara otomatis

## 6. Keyboard Shortcuts

- `A` — setujui entri yang sedang ditampilkan
- `R` — buka modal penolakan

## 7. SC Override

- SC dapat mengubah paksa status entri yang sudah diputuskan
- Alasan override wajib diisi minimal 20 karakter
- Setiap override dicatat dalam audit trail

## 8. Filter Antrian

- Filter berdasarkan dimensi passport
- Filter berdasarkan nama MABA

## Referensi Teknis

- Arsitektur: lihat `README.md` di folder ini
- Service layer: `src/lib/passport/README.md`
- Fitur service layer: `src/lib/passport/FEATURES.md`
