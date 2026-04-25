# Kegiatan — Katalog Fitur

**Pengguna**: MABA (RSVP + NPS), OC/SC/SUPERADMIN (manajemen via rute admin terpisah)

Lihat juga: [README.md](./README.md)

---

## F1 — Daftar Kegiatan

**Rute**: `/dashboard/kegiatan`

Halaman utama menampilkan seluruh kegiatan yang relevan dalam tiga tab:

- **Akan Datang** — kegiatan yang belum dimulai, diurutkan berdasarkan tanggal terdekat
- **Sedang Berlangsung** — kegiatan yang sedang dalam proses
- **Selesai** — kegiatan yang telah berakhir

Setiap tab menampilkan jumlah item di badge.

### Filter
- **Fase** — filter berdasarkan fase kegiatan (F0, F1, F2, dll.)
- **Kategori** — filter berdasarkan jenis kegiatan

### Kartu Kegiatan
Setiap kartu menampilkan:
- Nama kegiatan dan tanggal/waktu
- Lokasi
- Bar kapasitas (peserta terkonfirmasi / total kapasitas)
- Badge status RSVP pengguna (Terkonfirmasi / Waitlist / Belum RSVP)
- Tautan ke detail kegiatan

---

## F2 — Detail Kegiatan

**Rute**: `/dashboard/kegiatan/:instanceId`

Tampilan lengkap satu kegiatan:

- **Hero** — foto cover, nama kegiatan, tanggal, waktu, dan lokasi
- **Badge meta** — fase, kategori, status kegiatan
- **Jumlah peserta** — terkonfirmasi dan waitlist secara real-time
- **Daftar peserta** — nama peserta yang sudah RSVP terkonfirmasi (tanpa foto profil untuk privasi)
- **Tombol aksi NPS** — muncul setelah kegiatan selesai jika pengguna memiliki status HADIR dan belum mengisi NPS

---

## F3 — RSVP Kegiatan

Tersedia di halaman detail kegiatan:

### Konfirmasi Kehadiran
- Tombol "Konfirmasi Hadir" mengirimkan RSVP dengan status CONFIRMED
- Jika kapasitas penuh, status otomatis menjadi WAITLIST dengan nomor antrian

### Waitlist
- MABA yang masuk waitlist mendapatkan nomor posisi antrian
- Ketika peserta lain membatalkan RSVP-nya, MABA di posisi waitlist teratas otomatis dipromosikan ke CONFIRMED
- Promosi menggunakan kunci basis data (`pg_advisory_xact_lock`) untuk mencegah kondisi balapan

### Batalkan RSVP
- Tombol "Batalkan Kehadiran" tersedia bagi yang sudah RSVP
- Dialog konfirmasi muncul sebelum pembatalan
- Pembatalan CONFIRMED otomatis memicu promosi anggota waitlist pertama

### Status RSVP
| Status | Keterangan |
|---|---|
| CONFIRMED | Kehadiran terkonfirmasi, termasuk dalam hitungan kapasitas |
| WAITLIST | Dalam antrean; dipromosikan otomatis jika ada slot kosong |
| DECLINED | Membatalkan konfirmasi; tidak menempati kapasitas |

---

## F4 — Formulir Umpan Balik NPS

**Rute**: `/dashboard/kegiatan/:instanceId/nps`

Formulir tersedia setelah kegiatan selesai dan OC memicu notifikasi NPS:

- **Skor NPS** — nilai 0–10 (skala Net Promoter Score)
- **Komentar terbuka** — textarea untuk masukan kualitatif (opsional)
- Tombol kirim menonaktifkan diri saat memproses

### Tampilan Sudah Mengisi
Jika pengguna sudah pernah mengisi NPS untuk kegiatan yang sama:
- Halaman otomatis menampilkan `NPSAlreadySubmittedView`
- Menampilkan skor yang pernah dikirim dan tanggal pengiriman
- Tidak ada opsi edit (satu kali pengisian per kegiatan per pengguna)

---

## F5 — Notifikasi NPS

- Setelah OC menandai kegiatan sebagai selesai dan memicu NPS, seluruh peserta dengan kehadiran HADIR menerima notifikasi dalam aplikasi
- Notifikasi berisi tautan langsung ke `/dashboard/kegiatan/:instanceId/nps`
- Pemicu hanya berlaku satu kali per kegiatan (deduplikasi via `npsRequestedAt`)

---

## Kontrol Akses

| Fitur | MABA | OC | SC | SUPERADMIN |
|---|---|---|---|---|
| Lihat daftar kegiatan | Y | Y | Y | Y |
| RSVP / Batalkan | Y | Y | Y | Y |
| Isi NPS | Y (jika HADIR) | Y | Y | Y |
| Picu NPS (OC trigger) | — | Y | Y | Y |
| Kelola kapasitas | — | Y | Y | Y |
| Lihat agregat NPS | — | Y | Y | Y |
