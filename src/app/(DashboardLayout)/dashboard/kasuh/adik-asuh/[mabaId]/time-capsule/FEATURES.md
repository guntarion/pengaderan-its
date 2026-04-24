# Kasuh Shared View — Feature Catalog

**Audience**: Kakak Kasuh (read-only), Pembina/Admin (bypass)

---

## F1 — Tabbed View: Time Capsule + Life Map

**Route**: `/dashboard/kasuh/adik-asuh/:mabaId/time-capsule`

A two-tab interface showing what the paired Adik Asuh has shared:

- **Time Capsule tab** — shared personal journal entries
- **Life Map tab** — shared SMART goals and milestone progress

Tab labels include live counts (e.g., "Time Capsule (12)" and "Life Map (5)").

---

## F2 — Privacy Notice Banner

At the top of the page, a notice banner informs the Kakak Kasuh that:
- The content shown was shared voluntarily by the Adik Asuh
- It should be treated as confidential mentorship information

---

## F3 — Shared Time Capsule Feed

The Time Capsule tab displays all entries where the Maba has enabled sharing:
- Mood emoji indicator
- Entry title (or "Tanpa Judul" for untitled entries)
- Publication date in Indonesian locale
- First ~200 characters of the entry body (plain text preview)
- Attachment count badge if files are attached

Paginated with 20 entries per page. Previous/Next navigation appears when there are multiple pages.

All content is read-only — no edit, comment, or delete buttons are shown.

---

## F4 — Shared Life Map Goals Feed

The Life Map tab displays all goals where the Maba has enabled sharing:
- Life area label with emoji
- Full goal text
- Status badge (Aktif / Tercapai / Direvisi)
- M1/M2/M3 milestone badges showing which progress updates have been submitted

All content is read-only.

---

## F5 — Access Gate

Access to this page is enforced at the API level:
- Kakak Kasuh must have an active KasuhPair with the target Maba
- Attempting to access another Maba's shared content returns an error
- Cross-organization access is blocked
- Every page load is recorded in the audit log

Admins (SUPERADMIN, PEMBINA, BLM, SATGAS, SC) bypass the pair requirement and can view any Maba's shared content.

---

## F6 — Dynamic Page Title

The page header shows "Catatan [Maba's Name]" using the Maba's full name fetched from the API. The breadcrumb trail also updates dynamically to reflect the current Maba's name.
