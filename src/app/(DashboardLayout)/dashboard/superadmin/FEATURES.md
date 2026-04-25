# Fitur Dashboard SUPERADMIN

**Peran pengguna**: SUPERADMIN  
**Modul terkait**: M11 (Mental Health Screening), M12 (Kanal Anonim)

Panduan teknis: [README.md](./README.md)

---

## 1. Audit Log Akses Laporan Anonim (M12)

Tampil di `/dashboard/superadmin/anon-audit`.

- Menampilkan log lengkap setiap akses ke laporan anonim: siapa mengakses laporan apa, kapan, dari IP mana, tindakan apa yang dilakukan (READ, STATUS_CHANGE, DOWNLOAD_ATTACHMENT, BULK_DELETE, dll.).
- Data ditampilkan dalam tabel yang dapat diurutkan dan disaring.
- Log dihasilkan secara otomatis oleh seluruh endpoint anon-report melalui fungsi `recordAnonAccess()` yang dijalankan dalam transaksi database yang sama dengan operasinya.
- Tidak ada peran lain selain SUPERADMIN yang dapat mengakses halaman ini.

---

## 2. Editor Kamus Kata Kunci (M12)

Tampil di `/dashboard/superadmin/anon-keywords`.

### Dua kelompok kata kunci yang dapat dikonfigurasi:

**severe_keywords (Kata Kunci Kritis)**
- Apabila laporan anonim mengandung salah satu kata kunci ini, sistem secara otomatis menaikkan tingkat keparahan laporan ke level `CRITICAL`.
- Memicu alur eskalasi cepat tanpa menunggu tinjauan manual BLM.

**filtered_keywords (Kata Kunci Filter)**
- Laporan yang mengandung kata kunci ini ditandai untuk kemungkinan penolakan sebagai laporan bermutu rendah atau spam.

### Cara penggunaan:
- Setiap kelompok kata kunci diedit dalam area teks terpisah, satu kata kunci per baris.
- Jumlah kata kunci aktif ditampilkan secara langsung saat mengedit.
- Tombol "Simpan" tersedia per kelompok — perubahan tidak aktif hingga disimpan secara eksplisit.
- Setiap penyimpanan dicatat dalam audit log umum (M01).

---

## 3. Audit Log Mental Health (M11)

Tampil di `/dashboard/superadmin/mh-audit`.

- Menampilkan log audit seluruh aktivitas terkait skrining kesehatan mental: siapa mendekripsi data skrining, kapan, dan tindakan apa yang diambil terhadap referral.
- Dapat disaring berdasarkan jenis aksi, termasuk `AUDIT_REVIEW`.

### Pola Self-Audit (AUDIT_REVIEW)

Setiap kali SUPERADMIN membuka atau melakukan kueri pada halaman ini, sistem secara otomatis mencatat entri baru dengan aksi `AUDIT_REVIEW` ke dalam log yang sama. Artinya:
- Audit log itu sendiri diaudit.
- SUPERADMIN tidak dapat melihat data audit tanpa meninggalkan jejak akses.
- Pemberitahuan tentang pencatatan ini ditampilkan di bagian atas halaman.

---

## 4. Keamanan dan Akses

- Seluruh halaman di `/dashboard/superadmin/` dibatasi hanya untuk peran `SUPERADMIN`.
- Akses oleh peran lain akan ditolak oleh middleware `createApiHandler` di sisi API.
- Bootstrap SUPERADMIN dilakukan melalui daftar email di variabel `SUPERADMIN_EMAILS` yang diterapkan ulang setiap login.
