# Anonymous Report — Public Submission Module (M12)

Public anonymous reporting channel for incidents during pengaderan. No authentication required. No PII stored. Part of NAWASENA M12.

## Route Structure

| Route | File | Purpose |
|---|---|---|
| `/anon-report` | `page.tsx` | Landing — explains the channel and links to form |
| `/anon-report/form` | `form/page.tsx` | Report submission form |
| `/anon-report/success` | `success/page.tsx` | Post-submit success with tracking code |

## Data Flow

1. User visits `/anon-report` (landing) → reads the guarantee and how-it-works steps.
2. User navigates to `/anon-report/form` → fills out `SubmitForm`.
3. `SubmitForm` POSTs to the anonymous report API endpoint.
4. On success, user is redirected to `/anon-report/success?code=NW-XXXXXXXX`.
5. `SuccessPage` validates code format (`/^NW-[A-Z0-9]{8}$/`); invalid codes redirect back to `/anon-report`.
6. `SuccessBanner` displays the tracking code with copy/save instructions.

## Key Components

| Component | Source |
|---|---|
| `AnonymityNotice` | `src/components/anon-report/AnonymityNotice.tsx` |
| `SubmitForm` | `src/components/anon-report/SubmitForm.tsx` |
| `SuccessBanner` | `src/components/anon-report/SuccessBanner.tsx` |

## Form Fields (via `SubmitForm`)

The form captures: kohort/angkatan, category (`AnonCategory`), severity (`AnonSeverity`), and a free-text narrative. The API is responsible for assigning the tracking code; no name, email, or IP is persisted on the submission.

## Privacy Guarantees

- Form page sets `robots: { index: false, follow: false }` — not indexed by search engines.
- Success page also `robots: noindex`.
- Landing page header explicitly states: no name, email, or IP stored.
- Tracking code format: `NW-` + 8 uppercase alphanumeric characters.

## Rate Limiting

Rate limiting is applied at the API layer (`src/app/api/anon-reports/`) to prevent abuse without identifying users.

## Related API

- POST `/api/anon-reports` — submit a new report
- GET `/api/anon-reports/status/[code]` — retrieve allowlisted status fields by tracking code

## Cross-reference

See [FEATURES.md](./FEATURES.md) for the user-facing capability catalog.
For status lookup, see `/src/app/(WebsiteLayout)/anon-status/` [README](../anon-status/README.md).
