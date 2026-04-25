# Fitur Settings — NAWASENA (M15)

Katalog fitur halaman pengaturan pengguna.
Dokumentasi teknis: `/src/app/(DashboardLayout)/settings/README.md`

---

## Preferensi Notifikasi

- Melihat seluruh aturan notifikasi (rule) yang berlaku untuk peran pengguna.
- Memilih saluran pengiriman yang diinginkan per rule: in-app, email, atau push notification.
- Menonaktifkan rule notifikasi tertentu sepenuhnya tanpa memengaruhi rule lain.

## Push Notification

- Banner permintaan izin push ditampilkan jika browser mendukung Web Push dan pengguna
  belum memberikan izin.
- Tombol "Aktifkan Push Notification" memandu pengguna melalui dialog izin browser.
- Setelah berlangganan, subscription disimpan ke server untuk pengiriman notifikasi server-side.

## Toggle Push Global

- Satu toggle untuk mengaktifkan atau menonaktifkan semua push notification sekaligus.
- Menonaktifkan toggle tidak mencabut subscription browser — pengguna dapat mengaktifkan kembali
  tanpa harus meminta izin ulang.

## Opt-out Per Saluran

- Setiap rule notifikasi dapat dikonfigurasi secara terpisah.
- Pengguna dapat memilih hanya menerima notifikasi tertentu melalui saluran pilihan mereka
  (mis. hanya in-app, tanpa email).
