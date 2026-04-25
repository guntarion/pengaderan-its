# Kegiatan (Event RSVP + NPS) — Architecture Reference

**Module**: M06 — Event Instance & RSVP
**Routes**: `/dashboard/kegiatan/*`
**Roles**: MABA (RSVP + NPS), OC/SC/SUPERADMIN (management via separate admin routes)

See also: [FEATURES.md](./FEATURES.md)

---

## Directory Structure

```
src/app/(DashboardLayout)/dashboard/kegiatan/
├── page.tsx                        — Tabbed listing (Upcoming / Ongoing / Past)
└── [instanceId]/
    ├── page.tsx                    — Instance detail + RSVP action + attendee list
    └── nps/
        └── page.tsx                — Post-event NPS feedback form

src/app/api/event/
├── instances/
│   ├── route.ts                    — GET: listing for MABA (tabbed, filtered, cached 300s)
│   └── [id]/
│       ├── route.ts                — GET: instance detail with RSVP status
│       ├── oc/route.ts             — OC-only: update status, trigger NPS
│       └── rsvp-list/route.ts     — GET: confirmed attendee list
├── rsvp/
│   ├── route.ts                    — POST: create/update RSVP
│   └── [id]/route.ts               — DELETE: decline RSVP
└── nps/
    └── [instanceId]/
        ├── me/route.ts             — GET: check existing NPS submission
        └── route.ts                — POST: submit NPS response

src/lib/event/
├── services/
│   ├── instance.service.ts         — getListingForMaba(), getInstanceDetail(), getInstanceDetailOC()
│   ├── rsvp.service.ts             — createOrUpdateRSVP(), declineRSVP() (pg advisory lock)
│   ├── nps.service.ts              — submitNPS(), getNPSByUser(), getNPSAggregate()
│   └── nps-trigger.ts              — triggerNPSForInstance() (dedup via npsRequestedAt)
├── cache/                          — Redis helpers for instance listing TTL
└── broadcast.ts                    — Real-time broadcast stubs

src/components/event/
├── InstanceListTabs.tsx            — Upcoming / Ongoing / Past tab bar with counts
├── InstanceCard.tsx                — Summary card: title, date, capacity bar, RSVP badge
├── InstanceFilter.tsx              — Fase + Kategori dropdowns
├── InstanceDetailHero.tsx          — Cover image, title, date/time, location banner
├── InstanceMetaBadges.tsx          — Fase, Kategori, status badges
├── RSVPButton.tsx                  — CONFIRMED / WAITLIST / DECLINED toggle button
├── RSVPListView.tsx                — Confirmed attendee list (name + avatar)
├── RSVPStatusBadge.tsx             — Color-coded RSVP status pill
├── NPSForm.tsx                     — 0–10 score + open-text feedback form
├── NPSAlreadySubmittedView.tsx     — Read-only confirmation after NPS submitted
├── NPSAggregateCards.tsx           — OC/Admin: score distribution cards
└── NPSHistogram.tsx                — OC/Admin: Recharts histogram
```

---

## Data Flow

### Listing Page
```
page.tsx → GET /api/event/instances?tab=upcoming&fase=all&kategori=all
         → instance.service.getListingForMaba()
         → withCache('event:listing:{userId}:{hash}', 300, prisma.kegiatanInstance.findMany)
         → returns { upcoming[], ongoing[], past[] } with myRsvp per entry
```

### Instance Detail + RSVP Status
```
[instanceId]/page.tsx → Promise.all([
    GET /api/event/instances/:id,          — detail + confirmedCount + waitlistCount
    GET /api/event/nps/:instanceId/me,     — canNPS flag
    GET /api/event/instances/:id/rsvp-list — confirmed attendee names
  ])
```

### RSVP Create / Update
```
RSVPButton → POST /api/event/rsvp  { instanceId, action: 'confirm'|'decline' }
           → rsvp.service.createOrUpdateRSVP()
             → if capacity == null OR confirmedCount < capacity → CONFIRMED
             → else → WAITLIST (waitlistPosition assigned)
           → audit log RSVP_CREATED / RSVP_UPDATED
           → invalidate listing cache
```

### Decline + Waitlist Promotion
```
RSVPButton (decline) → DELETE /api/event/rsvp/:id
                     → rsvp.service.declineRSVP()
                       → pg_advisory_xact_lock on instanceId (prevent concurrent promote)
                       → SERIALIZABLE isolation
                       → mark user DECLINED
                       → if was CONFIRMED: promote top WAITLIST user → CONFIRMED
                     → audit log RSVP_DECLINED + RSVP_WAITLIST_PROMOTE
```

### NPS Submission
```
nps/page.tsx → GET /api/event/nps/:instanceId/me  (already submitted?)
             → if submitted: NPSAlreadySubmittedView
             → else: NPSForm (score 0–10 + open text)
             → POST /api/event/nps/:instanceId
             → nps.service.submitNPS()
             → audit log NPS_SUBMITTED
```

### NPS Trigger (OC)
```
OC dashboard → POST /api/event/instances/:id/oc { action: 'trigger_nps' }
             → nps-trigger.triggerNPSForInstance()
               → checks npsRequestedAt (dedup guard)
               → for each HADIR attendee: sendNotification(NPS_REQUESTED)
               → sets npsRequestedAt
```

---

## Key Business Rules

| Rule | Implementation |
|---|---|
| Capacity enforcement | `confirmedCount < capacity` at RSVP creation; null capacity = unlimited |
| Waitlist FIFO | `waitlistPosition` assigned sequentially; top position promoted on decline |
| Concurrent decline safety | `pg_advisory_xact_lock(instanceId)` + SERIALIZABLE transaction |
| NPS dedup | `npsRequestedAt` field — trigger skips if already set |
| NPS access gate | `canNPS` flag from `/api/event/nps/:instanceId/me` (attendee + post-event only) |
| One NPS per user | Unique constraint on `(instanceId, userId)` in `EventNPS` table |

---

## Caching Strategy

| Key Pattern | TTL | Invalidation |
|---|---|---|
| `event:listing:{userId}:{filterHash}` | 300s | After RSVP create/decline |

---

## Guides Followed

- `api-patterns-guide.md` — `createApiHandler`, `ApiResponse`, `validateBody`
- `ui-components-guide.md` — `toast` from `@/lib/toast`, `useConfirm`, skeletons
- `structured-logging-guide.md` — `createLogger('event:rsvp')`, `ctx.log` in handlers
- `theme-guide.md` — sky/blue gradient, `rounded-2xl` cards, dark mode variants
- `caching-webhook-guide.md` — `withCache` for listing, `invalidateCache` after mutations
- `security-compliance-guide.md` — `auditLog.record()` for RSVP and NPS events
