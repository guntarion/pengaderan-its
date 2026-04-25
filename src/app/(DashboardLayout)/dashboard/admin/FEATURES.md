# Fitur — Admin Dashboard (Analitik Kaderisasi)

Dokumentasi fitur yang tersedia bagi pengguna dengan peran Administrator pada
area `/dashboard/admin/`. Area ini berfokus pada analitik data kaderisasi,
berbeda dari panel fondasi sistem di `/admin/`.

## Analitik Mental Health (M11)

### Agregat Distribusi Risiko

Halaman `/mental-health/aggregate` memungkinkan Administrator memilih angkatan
(cohort) dan fase pemeriksaan, lalu melihat distribusi tingkat risiko mental
health (`low`, `moderate`, `high`, `very-high`) dalam bentuk bar chart.

**Perlindungan Privasi (Cell-Floor)**
Sel dengan jumlah peserta kurang dari 5 ditampilkan sebagai `"<5"` — diterapkan
di sisi server sebelum data dikirim ke klien. Hal ini mencegah identifikasi
individu melalui angka kecil.

**Ekspor Data**
Tombol "Export CSV" mengunduh data agregat yang sama (termasuk masking `<5`)
dalam format spreadsheet untuk kebutuhan pelaporan internal.

### Matriks Transisi Risk-Level

Halaman `/mental-health/aggregate/transition` menampilkan berapa peserta yang
berpindah antara kategori risiko dari satu fase ke fase berikutnya
(misalnya `moderate` → `low` setelah intervensi). Matriks ini membantu
Administrator dan tim SAC mengevaluasi dampak program dukungan kesehatan jiwa.

### Batasan Akses
Kedua halaman hanya dapat diakses oleh pengguna dengan role `ADMIN` atau
`SUPERADMIN`. Data yang ditampilkan bersifat kohort-agregat — tidak ada akses
ke hasil screening individual dari halaman ini.
