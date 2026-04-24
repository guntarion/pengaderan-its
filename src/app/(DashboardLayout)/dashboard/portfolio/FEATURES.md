# Portfolio — Feature Catalog

**Audience**: Maba (primary), Kakak Kasuh (read-only via URL param), Pembina/Admin (bypass)

---

## F1 — Personal Portfolio Overview

**Route**: `/dashboard/portfolio`

A unified, read-only view of a Maba's complete NAWASENA journey. The page aggregates data from:
- **Time Capsule** — personal journal entries written during F2
- **Life Map** — SMART goals and milestone progress across 6 life areas
- **Passport** (future) — badge completion from M05 Passport Digital

The portfolio is cached for 5 minutes to ensure fast load times even with many goals and entries.

---

## F2 — Time Capsule Section

Shows up to 20 most recent published Time Capsule entries:
- Mood emoji (scale 1–5)
- Entry title or "Tanpa Judul" if untitled
- Publication date
- Share status badge (shared with Kakak Kasuh or private)
- First ~120 characters of entry body

**Summary stats** at the top of the section:
- Total published entries
- Number of entries shared with Kakak Kasuh

---

## F3 — Life Map Section

A responsive 2-column grid of all Life Map goals:
- Area label with emoji
- Goal text (full or truncated)
- Status badge (Aktif / Tercapai / Direvisi)
- M1/M2/M3 milestone row showing which checkpoints have been submitted

**Summary stats**:
- Total goals
- Active goals count
- Achieved goals count

---

## F4 — Passport Badge Section (Placeholder)

A progress bar showing badge completion from the M05 Passport Digital module.
- Currently displays a placeholder state (0/0) with a message that integration is coming
- Will be activated when M05 Passport Digital is fully integrated

---

## F5 — Print to PDF

A "Export PDF" button is present but currently disabled (with tooltip explaining to use browser print instead). The page includes `@media print` styles that:
- Hide the sidebar navigation and header gradient
- Expand content to full width
- Remove interactive buttons
- Preserve section headings and card layouts for clean print output

Using the browser's native print dialog (Ctrl+P / Cmd+P) produces a clean, printable portfolio.

---

## F6 — Kasuh View of Adik Asuh Portfolio

**Route**: `/dashboard/portfolio?userId=<mabaId>`

Kakak Kasuh can view their paired Adik Asuh's portfolio by navigating with `?userId=` appended. The portfolio is displayed in read-only mode (no action buttons).

Access is gated:
- Must have an active KasuhPair with the target Maba
- Cross-pair and cross-organization access returns an error
- Every Kasuh portfolio view is audit logged as `PORTFOLIO_VIEW_ACCESS`

The Kasuh sees only published Time Capsule entries and Life Map goals — the same data the Maba would see in their own portfolio.

---

## F7 — Empty State

When a Maba has no published Time Capsule entries and no Life Map goals, the portfolio page shows:
- A friendly empty state message
- Prompt to start writing Time Capsule entries and setting Life Map goals

---

## Performance

Portfolio data is cached for 5 minutes per user per cohort. After any mutation (creating/editing goals, submitting milestone updates, writing entries), the cache is automatically invalidated so the next portfolio load reflects the latest data.
