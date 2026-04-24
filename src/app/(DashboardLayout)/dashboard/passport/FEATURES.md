# Passport Digital — Feature Catalog

**Module:** M05 — Passport Digital
**Roles:** MABA (submit), KP/KASUH/DOSEN_WALI/SC/SUPERADMIN (verify), SC/SUPERADMIN (admin)

---

## Maba Features

### 1. Passport Progress Dashboard
- Visual SVG progress ring showing overall completion percentage
- 4-stat grid: Terverifikasi / Menunggu / Ditolak / Belum Dimulai
- Stacked bar chart showing progress per dimension (Recharts)
- 11 dimension cards with mini progress bars and color-coded borders (green = done, amber = pending)
- Clicking a dimension card filters to that dimension's items

### 2. Dimension Item List
- Lists all passport items for a selected dimension
- Shows current submission status (badge: VERIFIED / PENDING / REJECTED / CANCELLED / NOT_STARTED)
- "Ajukan" CTA for new submissions; "Kirim Ulang" for rejected/cancelled

### 3. Item Detail Page
- Shows item name, dimension, evidence type, and description
- Displays active entry status with verifier name and submission date
- Shows rejection reason when status is REJECTED
- Renders attached evidence (image viewer or PDF iframe)
- Lists resubmission history chain (previous attempts)
- "Batalkan" button to cancel PENDING entry (with confirmation)
- "Kirim Ulang Bukti" CTA after rejection

### 4. Evidence Submission (5 types)
- **Foto (FOTO):** Camera capture with `capture="environment"`, client-side compression (browser-image-compression, max 1MB, 1920px), presigned S3 upload
- **Tanda Tangan (TANDA_TANGAN):** Verifier selection dropdown + optional notes — verifier reviews and approves manually
- **File (FILE):** PDF/JPEG/PNG upload up to 5MB via presigned S3 URL
- **QR Scan (QR_STAMP):** Camera-based QR scanner — auto-verifies on valid scan (BarcodeDetector API + @zxing fallback for Safari)
- **Logbook (LOGBOOK):** Stub — shows coming soon message (M04 integration pending)
- **Absensi (ATTENDANCE):** Stub — not yet available

### 5. Resubmission
- After rejection or cancellation, MABA can resubmit
- New entry links to previous entry via `previousEntryId` chain
- History chain visible on item detail page

---

## Verifier Features

### 6. Review Queue
- Filterable, sortable table of PENDING passport entries assigned to the verifier
- Color-coded waiting time (amber >= 3 days, red >= 7 days)
- Search by student name
- Real-time badge count in sidebar (polled every 30 seconds)

### 7. Entry Review Panel
- Shows student name, item, evidence type, submission date
- Displays student notes in info box
- Renders evidence (photo with zoom, PDF in iframe)
- Approve button (green) + Reject button (red) in sticky thumb zone
- Keyboard shortcuts: **A** = approve, **R** = open reject modal
- Reject modal requires minimum 10-character reason
- Idempotency guard: double-clicks safely ignored (Redis TTL lock)

---

## Admin / SC Features

### 8. Cohort Progress Dashboard
- Aggregated stats: total MABA, completed (100%) count, verified/pending totals
- Stacked bar chart across all 11 dimensions for the cohort
- "Stuck MABA" list: students without activity in a dimension (with nudge button)
- "Silent Verifier" list: verifiers with large pending queues (with nudge button)
- Quick links to QR Generator, SKEM Export, Override Entry

### 9. QR Session Generator
- Form: select item, name event, set TTL (30 min to 24h), set max scan count
- Generates HMAC-SHA256 signed QR URL
- Renders QR code image (sky-blue on white, 300x300px)
- Print QR with event name and expiry time
- Download QR as PNG
- Lists active sessions with scan count / max scans
- Revoke button with confirmation to invalidate a session

### 10. SKEM CSV Export
- Preview first 20 rows as a table
- Shows row count and SHA-256 checksum of the full export
- Downloads full CSV for SIM SKEM ITS upload
- Each export creates an audit log entry (SKEM_EXPORT_GENERATED)
- Warning notice about exporting only VERIFIED items

### 11. Override Entry
- Search by student name, NRP, or item name
- Select entry from results
- Choose target status: VERIFIED / REJECTED / CANCELLED
- Requires minimum 20-character reason
- Full audit trail via NawasenaAuditLog

---

## Automation Features

### 12. Escalation Cron (Nightly 03:00 WIB)
- Queries PENDING entries older than 7 days
- Resolves escalation target: KASUH's KP coordinator / KP or DOSEN_WALI → first SC
- Updates `escalatedToUserId` with Redis idempotency lock (5 min TTL)
- Sends M15 notification to escalation target
- Audit log: PASSPORT_ESCALATION

### 13. Signed URL Auto-Refresh
- Evidence images and PDFs accessed via 15-minute presigned S3 URLs
- `EvidenceViewer` component auto-refreshes URL if tab was inactive for more than 10 minutes
- Manual refresh button visible below the image

---

## Access Control

| Feature | MABA | KP | KASUH | DOSEN_WALI | SC | SUPERADMIN |
|---|---|---|---|---|---|---|
| View own passport | Y | Y | Y | Y | Y | Y |
| Submit evidence | Y | Y | Y | Y | Y | Y |
| Verifier queue | — | Y | Y | Y | Y | Y |
| Approve/Reject | — | Y | Y | Y | Y | Y |
| View all entries | — | — | — | — | Y | Y |
| QR Generator | — | — | — | — | Y | Y |
| SKEM Export | — | — | — | — | Y | Y |
| Override Entry | — | — | — | — | Y | Y |
| Escalation trigger | — | — | — | — | Y | Y |
