# Landing Page — NAWASENA 2026

Public entry point for the NAWASENA Pengaderan ITS platform. Renders without authentication.

**Route**: `/` (via `src/app/landingpage/page.tsx`)
**Layout**: Standalone — wraps its own `Navbar` and `Footer` outside the `(WebsiteLayout)` group.

## Page Sections

1. **Hero** — Full-width banner with the NAWASENA 2026 title, a one-line platform description, and two CTAs: "Masuk Dashboard" (`/dashboard`) and "Lihat Katalog Kegiatan" (`/kegiatan`).
2. **Fitur Utama Platform** — Four feature cards advertising the key public-facing modules:
   - Katalog Kegiatan (`/kegiatan`)
   - Kesehatan Mental (`/mental-health`)
   - Laporan Anonim (`/anon-report`)
   - Cek Status Laporan (`/anon-status`)
3. **CTA Section** — Bottom call-to-action directed at new ITS students (MABA 2026) with a login button pointing to `/auth/login`.

## Key Components

| Component | Source |
|---|---|
| `Navbar` | `src/components/website/Navbar.tsx` |
| `Footer` | `src/components/website/Footer.tsx` |
| `Button`, `Card`, `CardHeader`, etc. | shadcn/ui (`src/components/ui/`) |

## Dependencies

- No API calls — entirely static/client-rendered.
- Lucide icons: `ArrowRight`, `BookOpen`, `Heart`, `ShieldAlert`, `ClipboardList`.
- `next/link` for all internal navigation.

## Gaps / Notes

- The page is currently a `'use client'` component with no server-side data fetching; it advertises modules without pulling live counts or status.
- Modules not yet surfaced in the feature cards: Passport Digital, Logbook KP, Pulse Journal, Triwulan Review. The hero paragraph mentions them in prose only.
- No Open Graph / `metadata` export — search engines and social previews receive no structured metadata from this route.

## Cross-reference

See [FEATURES.md](./FEATURES.md) for the user-facing capability catalog.
