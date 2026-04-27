# Nawasena — Sistem Kaderisasi Digital ITS

Platform manajemen kaderisasi (pengaderan) untuk mahasiswa baru (MABA) Institut Teknologi Sepuluh Nopember (ITS). Menggantikan alur pengaderan manual dengan sistem digital terintegrasi yang mencakup seluruh siklus — dari pakta awal hingga evaluasi triwulan.

## Tentang Proyek

**Nawasena** adalah sistem kaderisasi berbasis web yang dirancang untuk mendukung proses onboarding MABA ITS secara terstruktur, transparan, dan terukur. Sistem ini mengelola:

- **Pakta Digital** — penandatanganan komitmen awal MABA secara digital
- **Pulse Journal Harian** — jurnal refleksi harian dengan analisis sentimen berbasis AI
- **Passport Digital** — rekam jejak aktivitas dan pencapaian MABA
- **Event & RSVP** — manajemen kehadiran acara pengaderan
- **KP-KASUH Logbook** — catatan bimbingan antara MABA dan pendamping
- **Mental Health Screening** — skrining kesehatan mental berkala
- **Anonymous Channel** — kanal pelaporan insiden anonim (safeguard)
- **Triwulan Sign-off** — evaluasi dan pengesahan kuartalan
- **Dashboard Multi-Role** — dasbor terpadu untuk berbagai peran (MABA, KP, KASUH, OC, SC, dll.)

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 15 + App Router + TypeScript |
| UI | Tailwind CSS, Radix UI, shadcn/ui |
| Auth | NextAuth.js (Google OAuth + credentials) |
| Database | PostgreSQL (Prisma ORM) + MongoDB (legacy) |
| AI | QWEN (primary), DeepSeek (fallback), Perplexity (web search) |
| Cache | Upstash Redis |
| Storage | DigitalOcean Spaces / AWS S3 |
| Testing | Vitest (unit) + Playwright (E2E) |

## Peran Pengguna

`MABA` · `KP` · `KASUH` · `OC` · `ELDER` · `SC` · `PEMBINA` · `BLM` · `SATGAS` · `ALUMNI` · `DOSEN_WALI` · `SUPERADMIN`

## Memulai

```bash
# Install dependensi
npm install

# Setup environment variables
cp .env.example .env.local
# Isi DATABASE_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, dst.

# Jalankan migrasi database
npx prisma migrate dev

# Seed data awal
npm run seed

# Jalankan development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

## Perintah Penting

```bash
npm run dev            # Development server
npm run build          # Build production
npm run check          # Lint + type-check
npm test               # Unit tests (Vitest)
npm run test:e2e       # E2E tests (Playwright)
npm run seed           # Seed database
npx prisma studio      # GUI database
npx prisma migrate dev # Buat & terapkan migrasi baru
```

## Struktur Modul (M01–M15)

Setiap modul didokumentasikan di `docs/modul/` dan memiliki schema Prisma tersendiri di `prisma/schema/nawasena_*.prisma`.

## Environment Variables

Lihat `.env.example` untuk daftar lengkap. Variabel wajib:

- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `DATABASE_URL` (PostgreSQL)
- `QWEN_API_KEY` / `DEEPSEEK_API_KEY`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
