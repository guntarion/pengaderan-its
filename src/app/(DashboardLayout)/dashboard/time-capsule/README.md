# Time Capsule — Architecture Reference

**Module**: M07 — Time Capsule & Personal Life Map (Time Capsule portion)
**Routes**: `/dashboard/time-capsule/*`
**Roles**: MABA (write + read own), KASUH (read shared entries via adik-asuh route), SUPERADMIN/PEMBINA/SC (bypass)

See also: [FEATURES.md](./FEATURES.md)

---

## Directory Structure

```
src/app/(DashboardLayout)/dashboard/time-capsule/
├── page.tsx              — Entry list (filterable by mood, share status, search)
├── new/
│   └── page.tsx          — Create new entry with draft recovery
└── [entryId]/
    └── page.tsx          — Entry detail + edit if within 24h window

src/app/api/time-capsule/
├── route.ts              — GET (paginated list), POST (create entry)
├── draft/route.ts        — GET/PUT draft persistence (backend backup)
├── upload-url/route.ts   — POST: presigned S3 URL for attachment upload
├── attachment-confirm/route.ts — POST: confirm uploaded attachment
└── [entryId]/
    ├── route.ts          — GET (detail), PATCH (update within window), DELETE
    ├── share/route.ts    — PATCH: toggle sharedWithKasuh
    └── attachment/route.ts — DELETE: remove attachment

src/lib/time-capsule/
├── service.ts            — createEntry, updateEntry, getEntry, listEntries, deleteEntry
├── edit-window.ts        — isEditable(), computeEditableUntil(), getRemainingEditTime()
├── share-resolver.ts     — assertCanReadEntry (share gate for Kasuh access)
└── attachment-service.ts — confirmAttachment, deleteAttachment, listAttachments

src/lib/auto-save/
└── index.ts              — useAutoSave hook (localStorage 1s debounce + backend 5s)
                            clearLocalDraft(), readLocalDraft()

src/components/time-capsule/
├── TimeCapsuleEditor.tsx  — Markdown textarea + mood selector + share toggle
├── TimeCapsulePreview.tsx — Rendered markdown view with mood + metadata
├── MoodSelector.tsx       — 1–5 mood scale with emoji; getMoodEmoji(), getMoodLabel()
├── ShareToggleConfirm.tsx — Confirm dialog before sharing with Kasuh
├── AttachmentUploader.tsx — Presigned S3 upload UI
└── AttachmentGallery.tsx  — Image/file thumbnail grid
```

---

## Data Flow

### Create Entry
```
new/page → useAutoSave (localStorage key 'tc-draft-new')
         → POST /api/time-capsule
         → service.createEntry (prisma.timeCapsuleEntry.create)
         → invalidatePortfolio(userId, cohortId)
         → audit log TIME_CAPSULE_CREATE
         → clearLocalDraft('tc-draft-new')
```

### Edit Entry (within 24h)
```
[entryId]/page detects isEditable(entry) → shows TimeCapsuleEditor
              → PATCH /api/time-capsule/:entryId
              → edit-window.isEditable checks editableUntil > now
              → service.updateEntry
              → invalidatePortfolio
              → audit log TIME_CAPSULE_UPDATE
```

### Share Toggle
```
TimeCapsuleEditor sharedWithKasuh checkbox → ShareToggleConfirm dialog
  → PATCH /api/time-capsule/:entryId/share
  → flip sharedWithKasuh flag
  → sendNotification(TIME_CAPSULE_SHARED) to Kasuh when toggling ON
  → audit log TIME_CAPSULE_SHARE_TOGGLE
  → invalidatePortfolio
```

### Draft Auto-Save
```
useAutoSave:
  - localStorage: debounced 1s after value change (instant recovery on crash)
  - backend: debounced 5s, PUT /api/time-capsule/draft
  - On mount: compares localStorage timestamp vs backend draft timestamp → latest wins
  - clearLocalDraft() called after successful publish
```

---

## Key Business Rules

| Rule | Implementation |
|---|---|
| 24h edit window | `editableUntil = publishedAt + 24h`, checked in `isEditable()` |
| Draft recovery on mount | `readLocalDraft()` vs backend draft; latest timestamp wins |
| Share gate for Kasuh | `sharedWithKasuh = true` + active KasuhPair required |
| Attachment after publish | Upload via presigned S3 URL then confirm via attachment-confirm route |
| Portfolio invalidation | Fire-and-forget after create, update, share toggle |

---

## Key Dependencies

| Dependency | Purpose |
|---|---|
| `@/lib/auto-save` | `useAutoSave` hook — dual-layer draft (localStorage + backend) |
| `@/lib/time-capsule/edit-window` | `isEditable()`, `computeEditableUntil()`, `getRemainingEditTime()` |
| `@/lib/portfolio/cache` | `invalidatePortfolio()` after every mutation |
| `@/lib/toast` | `toast.success()`, `toast.apiError()` |
| `date-fns` | Entry date formatting with `id` locale |
| M15 `sendNotification` | Notify Kasuh on share toggle ON |

---

## Caching Strategy

| Key Pattern | TTL | Invalidation |
|---|---|---|
| `portfolio:{userId}:{cohortId}` | 300s | After entry create / update / share toggle |

The entry list itself is not separately cached — it reads directly from PostgreSQL. Portfolio composer caches the aggregated result.

---

## Guides Followed

- `api-patterns-guide.md` — `createApiHandler`, `ApiResponse`, `validateBody`
- `ui-components-guide.md` — `useConfirm` (delete confirm), `toast` from `@/lib/toast`, skeletons
- `structured-logging-guide.md` — `createLogger('time-capsule:service')`, `ctx.log` in handlers
- `theme-guide.md` — sky/blue gradient header, `rounded-2xl` cards, dark mode variants
- `caching-webhook-guide.md` — `invalidatePortfolio()` wraps `invalidateCache`
- `security-compliance-guide.md` — `auditLog.record()` for all mutations
