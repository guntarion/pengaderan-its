# Fitur — Pergantian Kakak Asuh (M03)

Modul ini memungkinkan MABA mengajukan permohonan pergantian Kakak Asuh dan
memantau status pengajuan tersebut.

## Fitur Utama

### 1. Halaman Pengajuan (`/request`)
- Menampilkan informasi Kakak Asuh aktif saat ini (nama dan kohort).
- Formulir dengan kolom catatan opsional (maksimal 1.000 karakter).
- Gerbang kelayakan: apabila MABA belum memiliki Kasuh aktif, formulir diganti
  dengan pesan informatif tanpa tombol submit.
- Tombol dan label teks terkunci oleh kebijakan copy-lock (tidak dapat diubah
  tanpa persetujuan UX + BLM).

### 2. Pelacak Status Pengajuan (`/request/[id]`)
- Menampilkan detail pengajuan: catatan opsional, Kasuh lama, dan Kasuh baru
  (jika sudah terpenuhi).
- Status ditampilkan dengan ikon berwarna:
  - Menunggu (kuning) — menunggu keputusan
  - Disetujui (biru) — disetujui, belum dipasangkan ulang
  - Terpenuhi (hijau) — sudah dipasangkan ke Kasuh baru
  - Ditolak (merah) — tidak diproses
- Menampilkan nama resolver dan catatan resolusi apabila sudah diputuskan.
- Tombol kembali ke halaman pengajuan.

## Batasan
- Satu MABA hanya dapat mengajukan satu permohonan aktif dalam satu waktu.
- Pengajuan tidak dapat dicabut oleh MABA setelah dikirim.

---

Lihat juga: [README arsitektur](./README.md)
