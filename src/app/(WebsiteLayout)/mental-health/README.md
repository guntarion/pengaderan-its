# Mental Health Hub — Public Module (M11)

Public educational hub for mental health resources. No authentication required. No personal data collected. Part of NAWASENA M11.

## Route Structure

| Route | File | Purpose |
|---|---|---|
| `/mental-health` | `page.tsx` | Hub landing — links to all sub-pages |
| `/mental-health/self-care` | `self-care/page.tsx` | Daily self-care tips (markdown) |
| `/mental-health/help-seeking` | `help-seeking/page.tsx` | How to seek help + hotlines |
| `/mental-health/faq` | `faq/page.tsx` | Anti-stigma FAQ (markdown) |

## Content Architecture

All sub-pages (self-care, help-seeking, faq) render static markdown files from `src/content/mh-resources/`:

| Page | Markdown File |
|---|---|
| Self-care | `self-care.md` |
| Help-seeking | `help-seeking.md` |
| FAQ | `faq-anti-stigma.md` |

Content is read via Node `fs.readFileSync` at request time (server components). Rendered with `react-markdown` + `remark-gfm`.

## Hub Page (`page.tsx`)

Four resource cards, each with a distinct color identity:
- **Perawatan Diri** — teal gradient (`/mental-health/self-care`)
- **Cara Mencari Bantuan** — sky/blue gradient (`/mental-health/help-seeking`)
- **FAQ Anti-Stigma** — violet/purple gradient (`/mental-health/faq`)
- **Kontak Darurat** — rose/red gradient (links directly to `/mental-health/help-seeking#hotlines`)

Footer notice confirms: no personal data is collected from this section.

## Key Details

- Hotline 119 ext 8 (Into The Light / Kemenkes) referenced in `help-seeking.md`.
- SAC ITS contact information in `help-seeking.md`.
- Poli Psikologi ITS contact in `help-seeking.md`.
- All pages include dark mode variants (`dark:` Tailwind classes throughout).
- SEO metadata present on all four pages.
- Screening feature (M11 dashboard module) requires login — the hub page explicitly directs users to sign in for that.

## Dependencies

- `react-markdown`, `remark-gfm` — markdown rendering
- `src/content/mh-resources/` — static markdown content files
- No API routes, no Prisma queries, no auth

## Cross-reference

See [FEATURES.md](./FEATURES.md) for the user-facing capability catalog.
