# Pakta Digital — Alur Penandatanganan (M01)

Module ini mengimplementasikan alur penandatanganan pakta digital NAWASENA.
Tidak ada `page.tsx` di root folder; entry point adalah `/pakta/sign/[type]`.

See feature catalog: `/src/app/(DashboardLayout)/pakta/FEATURES.md`

---

## Subroutes

| Path | Step | Keterangan |
|---|---|---|
| `sign/[type]/` | 1 — Baca & Akui | Baca dokumen pakta + 3 checkbox acknowledgment |
| `sign/[type]/quiz/` | 2 — Post-test | Kuis pemahaman; passing score dikonfigurasi per versi |
| `sign/[type]/confirm/` | 3 — Konfirmasi | Tanda tangan digital final dengan ringkasan skor |
| `sign/[type]/reject/` | — Tolak | Formulir alasan penolakan pakta |

`[type]` adalah jenis pakta (mis. `MABA`, `KASUH`) yang dikodekan dalam URL.

## Alur UX

```
/pakta/sign/[type]
  → Tampilkan konten pakta (Markdown, rendered)
  → 3 checkbox acknowledgment (semua harus dicentang)
  → Tombol "Lanjut" → /pakta/sign/[type]/quiz?versionId=&passingScore=
      → Kuis N soal pilihan ganda
      → Skor >= passingScore → /pakta/sign/[type]/confirm?versionId=&score=
          → Review + konfirmasi tanda tangan → POST /api/pakta/sign
      → Skor < passingScore → tampilkan skor, izinkan coba ulang
  → Tombol "Tolak" → /pakta/sign/[type]/reject?versionId=
      → Isi alasan → POST /api/pakta/reject
```

## Versi & Re-sign

- Versi pakta aktif diambil dari `GET /api/pakta/current?type=` (server memilih versi terbaru aktif).
- Jika admin mempublikasikan versi baru, status MABA yang sudah menandatangani akan direset sehingga alur tanda tangan ulang dipicu saat login berikutnya.
- `versionId` diteruskan antar halaman melalui query string untuk memastikan konsistensi versi selama satu sesi penandatanganan.

## Key Components & Dependencies

- `PaktaMarkdownRenderer` (internal) — render konten Markdown pakta
- `PaktaQuizComponent` (internal) — komponen kuis pilihan ganda
- `createLogger('pakta-sign-page')`, `createLogger('pakta-quiz-page')` — logging terstruktur
- `toast` dari `@/lib/toast` — feedback error
- API routes: `src/app/api/pakta/`

## Roles

Alur `/pakta/sign/` dapat diakses oleh semua pengguna yang diwajibkan menandatangani pakta
(terutama `MABA`). Tidak ada guard role eksplisit di sisi halaman; kewajiban ditentukan oleh
`UserStatus.PENDING_PAKTA` yang dicek di middleware auth.
