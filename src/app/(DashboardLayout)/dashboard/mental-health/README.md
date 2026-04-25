# Skrining Kesehatan Mental — M11

## Purpose

`/dashboard/mental-health` is the mental-health screening flow for MABA.
It implements a consent-gated PHQ-9 instrument with at-rest encryption,
a personal results history, and privacy controls for consent withdrawal.

## Routes

| File | Path | Type |
|---|---|---|
| `mental-health/consent/page.tsx` | `/…/consent` | Server component |
| `mental-health/consent/ConsentPageClient.tsx` | (client shell) | Client component |
| `mental-health/form/page.tsx` | `/…/form` | Client component |
| `mental-health/results/page.tsx` | `/…/results` | Client component |
| `mental-health/results/[id]/page.tsx` | `/…/results/<id>` | Client component |
| `mental-health/privacy/page.tsx` | `/…/privacy` | Client component |

## Consent Flow (consent/)

The consent page is a **server component** that reads
`src/content/mh-consent/v1.md` from the filesystem and passes the
rendered markdown to `ConsentPageClient`.

`ConsentPageClient` renders a scroll-gate: the "Setuju" button is disabled
until the user has scrolled to the bottom of the consent text. Consent
version is pinned to `'v1.0'` in the server component and transmitted to
the API when the user accepts.

- Accept → `POST /api/mental-health/consent` → redirect to `/…/form`
- Decline → redirect to `/dashboard`

## Screening Form (form/)

1. On mount, calls `GET /api/mental-health/consent` to verify an active
   consent record exists. If none, redirects to `/…/consent`.
2. Renders `PHQ9Form` (`src/components/mental-health/PHQ9Form`):
   - **One question per step** with a progress indicator at the top.
   - 9 questions total (PHQ-9 instrument).
   - Each answer is 0–3 (Not at all → Nearly every day).
3. On completion, `PHQ9Form` calls `POST /api/mental-health/submissions`.
4. The API scores the responses, derives a severity level
   (`GREEN` / `YELLOW` / `RED`), and stores both the raw score and
   individual answers encrypted via PostgreSQL `pgp_sym_encrypt` using a
   session-local encryption key (`app.mh_encryption_key`).
5. `ScreeningResult` is then shown inline with severity, interpretation,
   and optional emergency contact prompt if `immediateContact === true`.

## Encryption Model

All sensitive data is encrypted at rest using PostgreSQL pgcrypto:
- `rawScoreEncrypted` — JSON of the full score object
- Per-answer encrypted columns in `mh_screening_answers`

Decryption is only performed on demand by the assigned SAC counselor via
`GET /api/mental-health/referrals/<id>/decrypt`.  An audit log entry is
written **before** the decrypt query executes (fail-closed: if the audit
write fails, the decrypt does not proceed).  Only the assigned SAC
counselor can trigger a decrypt.

## Results History (results/)

Shows a list of the MABA's own screening events (metadata only):
instrument, phase label, severity badge, flagged status, and date.
**No scores and no answers are shown** to the MABA on this page.

Phase labels: `F1` (Awal Angkatan), `F4` (Akhir Angkatan),
`SELF_TRIGGERED` (Mandiri).

## Privacy Controls (privacy/)

Renders `PrivacyControls` (`src/components/mental-health/PrivacyControls`),
which lists active and withdrawn consents per cohort and allows the MABA to
withdraw consent. Also links to a data deletion request flow.

## Key Dependencies

- `src/components/mental-health/PHQ9Form` — one-per-step PHQ-9 form
- `src/components/mental-health/ScreeningResult` — result + severity display
- `src/components/mental-health/PrivacyControls` — consent withdrawal UI
- `src/components/mental-health/EmergencyBanner` — RED severity contact prompt
- `src/content/mh-consent/v1.md` — consent text (server-side read)
- `src/app/api/mental-health/submissions/route.ts` — scoring + encrypted insert
- `src/app/api/mental-health/referrals/[id]/decrypt/route.ts` — audit-first decrypt
- `src/components/shared/DynamicBreadcrumb`, `SkeletonCard`
- `src/lib/logger.ts` — structured logging in API handlers

## Related

- `FEATURES.md` — user-facing feature catalog
- M11 planning docs in `docs/modul/` for instrument scoring details
