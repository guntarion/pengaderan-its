# Life Map — Feature Catalog

**Audience**: Maba (goal owner), Kakak Kasuh (read-only), Pembina/Admin (bypass)

---

## F1 — Life Area Overview

**Route**: `/dashboard/life-map`

A 6-tile grid showing one card per life area:

- **Kepribadian & Pertumbuhan** (violet)
- **Studi & Karir** (sky blue)
- **Finansial** (emerald)
- **Kesehatan** (rose)
- **Sosial & Komunitas** (amber)
- **Keluarga & Relasi** (orange)

Each tile shows:
- Number of active and achieved goals
- Most recent active goal snippet (first 60 chars)
- M1/M2/M3 milestone progress dots (filled = submitted)
- Button to add a new goal or view existing goals for that area

Clicking a tile navigates to the same page with `?area=AREA_VALUE` appended, revealing a filtered goal list below the overview grid.

---

## F2 — Goal List per Area

**Route**: `/dashboard/life-map?area=STUDI_KARIR`

When an area is selected:
- Shows a filterable list of goals (Active / Achieved / Adjusted)
- Each goal card shows: goal text excerpt, status badge, deadline, share status, milestone badges
- Empty state with direct link to create a goal for that area

---

## F3 — Create SMART Goal

**Route**: `/dashboard/life-map/new` (optionally `?area=AREA_VALUE` to pre-select)

A structured form enforcing SMART criteria:

| Field | Constraint |
|---|---|
| Area Kehidupan | Select from 6 areas |
| Deskripsi Goal | 20–500 chars, SMART format guidance |
| Ukuran Keberhasilan | 10–200 chars |
| Mengapa Penting | 20–300 chars |
| Target Deadline | Date picker, minimum 30 days from today |
| Catatan Keterjangkauan | Optional, max 200 chars |

A checkbox below the form lets the Maba share the goal with their paired Kakak Kasuh.

**Limits**: Maximum 5 active goals per life area per cohort period.

---

## F4 — Goal Detail View

**Route**: `/dashboard/life-map/:goalId`

Full detail of a single goal:
- All SMART fields displayed
- Status badge (Aktif / Tercapai / Direvisi) with color
- Deadline with overdue warning if past due and still ACTIVE
- Share status indicator (shared / private)
- M1/M2/M3 milestone progress row with checkmarks
- Each submitted milestone shows: progress text excerpt, percentage, submission date
- Edit link (7-day edit window) on individual milestone updates
- Link to the milestone update page when goal is ACTIVE

---

## F5 — Milestone Update Flow

**Route**: `/dashboard/life-map/:goalId/update`

Three-tab interface for M1, M2, M3 milestone checkpoints:

### Submitting an update
Each tab contains:
- **Perkembangan** — Free text (50–1,000 chars) describing progress
- **Persentase Pencapaian** — Slider 0–100% in 5% steps
- **Refleksi & Pelajaran** — Free text (50–1,000 chars) on lessons learned
- **Perbarui Status Goal** — Optional: mark goal as Tercapai or Direvisi

One update per milestone per goal. Duplicate submission returns HTTP 409.

### Editing an update
A submitted update can be edited within 7 days of submission. After the window closes, the update is locked and displayed in read-only mode.

### Milestone timing
- M1: First 14 days of F2
- M2: Days 42–56 of F2
- M3: Last 14 days of F2

Late submissions are flagged visually.

---

## F6 — Milestone Diff View

**Route**: `/dashboard/life-map/:goalId/update` (toggle link)

Side-by-side comparison of all three milestone updates:
- Shows M1, M2, M3 in a 3-column grid
- Each column: progress percentage with bar, first 150 chars of progress text
- Delta badge between milestones: green arrow up (+%) or red arrow down (–%)
- Only visible when at least one update exists

---

## F7 — Share with Kakak Kasuh

**Accessible from**: Goal form (on create) or goal detail (via API)

Toggle `sharedWithKasuh` on any individual goal:
- When toggled ON, the paired Kakak Kasuh receives a `LIFE_MAP_UPDATE_SHARED` in-app notification
- Toggle does not affect other goals
- Kasuh can only view goals where `sharedWithKasuh = true` and the KasuhPair is ACTIVE

---

## F8 — Kasuh Read View

**Route**: `/dashboard/kasuh/adik-asuh/:mabaId/time-capsule` (Life Map tab)

Kakak Kasuh sees:
- All Life Map goals where `sharedWithKasuh = true` for their paired Adik Asuh
- Milestone badges showing which milestones have been submitted
- Privacy notice banner reminding that this is shared by the Maba voluntarily
- Read-only — no edit, comment, or share buttons

Access is gated by an active KasuhPair. Cross-pair or cross-organization access returns HTTP 403.

---

## F9 — Milestone Reminder Notifications

**Automated** — Cron job at 08:00 WIB daily

- Sends `LIFE_MAP_MILESTONE_1_DUE`, `_2_DUE`, or `_3_DUE` notifications to Maba who have at least one ACTIVE goal and haven't submitted the current open milestone
- Sends `LIFE_MAP_MILESTONE_OVERDUE_REMINDER` to Maba who are 1–7 days past the milestone close date without submitting

---

## Status Reference

| Status | Meaning | Visual |
|---|---|---|
| ACTIVE | Goal in progress | Sky blue target icon |
| ACHIEVED | Goal successfully completed | Emerald checkmark |
| ADJUSTED | Goal revised/pivoted | Amber refresh icon |

## Life Area Reference

| Area Key | Display |
|---|---|
| PERSONAL_GROWTH | Kepribadian & Pertumbuhan |
| STUDI_KARIR | Studi & Karir |
| FINANSIAL | Finansial |
| KESEHATAN | Kesehatan |
| SOSIAL | Sosial & Komunitas |
| KELUARGA | Keluarga & Relasi |
