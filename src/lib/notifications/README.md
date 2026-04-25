# M15 — Notifications & Reminders Infrastructure

Infrastructure module that provides a centralized, multi-channel notification dispatcher for all other NAWASENA modules. Any module that needs to notify users — via Web Push, email, or future channels — calls `sendNotification()` from this module.

For the product-facing feature catalogue, see [FEATURES.md](./FEATURES.md).

---

## Purpose

M15 solves the cross-cutting concern of "how do we reach users reliably?" It provides:

- A rule engine with cron-driven audience resolution and idempotent execution.
- A multi-channel dispatcher (Web Push via `web-push`, email via Resend + React Email, WhatsApp stub).
- Template versioning so content can be updated without code deploys.
- Per-user channel preferences with CRITICAL override semantics.
- Redis rate limiting for `FORM_REMINDER` category with automatic KP escalation.
- A `verifyCronAuth` helper consumed by cron endpoints across all other modules.

---

## Architecture Decisions

### Single Public Entry Point

All notifications — whether from cron rules or ad-hoc module calls — go through one function:

```typescript
import { sendNotification } from '@/lib/notifications/send';

await sendNotification({
  userId,
  templateKey: 'SAFEGUARD_INCIDENT_RED',
  payload: { userName, incidentId },
  category: 'CRITICAL',
});
```

This ensures every send goes through preference resolution, rate limiting, template rendering, retry logic, and `NotificationLog` writes. Modules must never call channel implementations directly.

### CRITICAL Category Semantics

`CRITICAL` notifications bypass user opt-out preferences. `resolveChannels()` in `resolve-preferences.ts` returns `['PUSH', 'EMAIL']` with `criticalOverride: true` regardless of what the user has toggled off. All CRITICAL channels are dispatched in parallel via `Promise.allSettled`. Non-CRITICAL channels are dispatched sequentially with early exit on first success (primary channel wins; fallback only on failure).

This means `sendNotification()` with `category: 'CRITICAL'` has a worst-case execution time of (3 retries × 3 delays = ~36s per channel), so callers in M10, M11, M12 apply a 10-second `Promise.race` timeout and fall back to direct Nodemailer if M15 does not resolve in time.

### Template Versioning + Override Pattern

Templates have a parent (`NotificationTemplate`) and versioned content children (`NotificationTemplateVersion`). The parent holds `activeVersionId`. Publishing a new version updates only that pointer — old versions remain for historical log display.

Per-org customization: `renderTemplate()` first queries for `{ templateKey, organizationId }`. If not found, it falls back to `{ templateKey, organizationId: null }` (global). This allows an org to override subject/body copy without touching the global seed.

Variable substitution uses `{{variable}}` syntax handled by a simple regex replace in `render-template.ts`. Unknown variables are left as-is (not silently dropped) to surface missing payload keys.

### Audience Resolver Registry

Each cron rule has an `audienceResolverKey` string. `audience/resolver.ts` lazily loads the matching module from `src/lib/notifications/audience/`. This pattern keeps the resolver files independently testable and avoids loading all of them on startup.

`executeRuleForAllOrgs()` in `execute-rule.ts` iterates all active organizations and checks for an org-level override rule (`overridesRuleId`) before falling back to the global rule. This lets an org run a different schedule or audience without modifying the global rule.

### Idempotency at Two Levels

1. **Rule execution**: `executeRule()` accepts an `executionToken` (UUID). If a `NotificationRuleExecution` with that token already exists and is not `RUNNING`, execution is skipped. Cron endpoints generate the token as `{triggerSource}-{orgId}-{ruleId}-{date}`.
2. **Per-user send**: Before calling `sendNotification()` for a user in a chunk, `execute-rule.ts` checks for an existing `NotificationLog` with `status IN (SENT, DELIVERED)` for the same `ruleExecutionId + userId`. This handles partial-batch retries.

### Redis Rate Limiting for FORM_REMINDER

`rate-limit.ts` uses an ISO-week Redis key: `notif:ratelimit:{orgId}:{userId}:{templateKey}:{year}-W{week}`. TTL is 8 days (week + buffer). Max 3 sends per week per template per user. On the 4th attempt, `escalate: true` is returned and `escalateToKp()` is called — which sends a `KP_ESCALATION_MABA_SILENT` notification to the Maba's KP.

The implementation is fail-open: if Redis is unavailable, the notification is sent and `{ failOpen: true }` is returned.

### verifyCronAuth — Shared Helper

`src/lib/notifications/cron-auth.ts` exports `verifyCronAuth(req: NextRequest)`. It checks `Authorization: Bearer <CRON_SECRET>`. Any cron endpoint that does not require user authentication uses this helper:

```typescript
import { verifyCronAuth } from '@/lib/notifications/cron-auth';

export const GET = createApiHandler({
  auth: false,
  handler: async (req, { log }) => {
    verifyCronAuth(req); // throws ForbiddenError(403) if invalid
    // ... cron logic
  },
});
```

This helper is used by M05, M07, M09, M11, M12 cron routes in addition to M15's own cron routes.

### Resend Webhook — Svix Signature Verification

`src/app/api/webhooks/resend/route.ts` verifies the `svix-id / svix-timestamp / svix-signature` triple. Signature is HMAC-SHA256 over `{svix-id}.{svix-timestamp}.{rawBody}` with the `whsec_...`-prefixed secret. Timestamp is validated within a 5-minute window to prevent replay. On bounce/complaint, `emailBouncedAt` is set on `NotificationPreference`, which `resolveChannels()` checks to skip email for 30 days.

### Service Worker (public/sw.js)

The same Service Worker file handles two concerns:
- **M15 Web Push**: `push` and `notificationclick` event handlers.
- **M04 Background Sync**: `sync` event with tag `pulse-sync`, which messages open clients to flush the offline queue.

The SW is registered lazily by `usePushSubscription.subscribe()` on the first push opt-in. It is not pre-registered in the root layout to avoid unnecessary SW overhead for users who never opt in.

---

## Patterns & Conventions

### Logging

Every file in `src/lib/notifications/` uses `createLogger('notifications:<module>')`. The `send.ts` creates a child logger per call: `log.child({ userId, templateKey, category, requestId })`. No `console.log` anywhere in M15.

### Channel Interface

All channel implementations implement `NotificationChannel` from `types.ts`:

```typescript
interface NotificationChannel {
  readonly type: ChannelType;
  isAvailable(userId: string, prefs: UserPreferences): Promise<boolean>;
  send(target: ChannelTarget, rendered: RenderedTemplate, ctx: SendContext): Promise<ChannelResult>;
}
```

`send()` must never throw — it returns `ChannelResult.status` instead. Throwing propagates to the retry loop in `send.ts`.

### Admin Routes

All admin API routes under `src/app/api/notifications/admin/` are guarded with `roles: ['SC', 'SUPERADMIN']` via `createApiHandler`. Cron routes use `auth: false` + `verifyCronAuth()`.

---

## Gotchas

- **VAPID keys must be set** as both `VAPID_PUBLIC_KEY` (server) and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (client). If only one is set, the push subscription registration silently fails with a toast error.
- **WhatsApp is a stub** — `WhatsAppStubChannel.send()` returns `{ status: 'NOT_IMPLEMENTED' }`. The enum value `WHATSAPP` exists in the schema and seed, but no actual delivery is wired.
- **`IN_APP` channel** is in the `ChannelType` enum but has no channel implementation. `resolveChannels()` silently skips it. It is reserved for a future in-app notification feed.
- **`executeRuleForAllOrgs` uses date-based token** (`{date}` as `YYYY-MM-DD`). If a cron job fires twice in the same calendar day (e.g., due to Vercel retry), the second run is skipped by the idempotency check. This is intentional.
- **Template rendering for email** returns `reactComponent: 'src/emails/ComponentName'` as a path string. The email channel (`channels/email.ts`) dynamically imports that path and calls `@react-email/render`. If the component path is wrong, the email channel falls back to `fallbackHtml`.
- **Button variant="outline" on colored backgrounds** — the admin notifications UI uses sky-colored tab backgrounds. When adding new buttons, add `bg-transparent` to prevent the default white `bg-background` from obscuring white text.

---

## Dependencies

### Depends On

- `@/utils/prisma` — all database reads/writes
- `@/lib/redis` — rate-limit counters (`isRedisConfigured()`, `getRedisClient()`)
- `@/lib/api` — `createApiHandler`, `ApiResponse`, `ForbiddenError`
- `@/lib/logger` — `createLogger`
- `web-push` — VAPID-authenticated push to browser endpoints
- `resend` — transactional email delivery
- `@react-email/render` — renders React Email components to HTML
- M03 KPGroup structure — `escalateToKp()` queries KP users in the same cohort (simplified; full M03 integration pending)

### Depended By

All modules that send user notifications import from this module:

| Module | What it calls |
|--------|---------------|
| M04 Pulse Journal | cron `maba-pulse-daily`, `maba-journal-saturday/sunday` via rule engine |
| M05 Passport Digital | `verifyCronAuth` for cron routes; `sendNotification` for passport escalation |
| M06 Event Instance | `sendNotification` after event lifecycle transitions (cancellation broadcast, NPS trigger) |
| M07 Time Capsule | `sendNotification` for milestone reminders + share-toggle alerts |
| M08 Event Execution | `sendNotification` for evaluation-overdue alerts |
| M09 KP/Kasuh Logbook | `verifyCronAuth`; rule-seeded reminders; `sendNotification` in cascade processor |
| M10 Safeguard | `sendNotification` with `category: 'CRITICAL'` + 10s timeout + nodemailer fallback |
| M11 Mental Health | `sendNotification` for SAC referral + coordinator escalation |
| M12 Anonymous Channel | `sendNotification` for BLM/Satgas alert on new report |
| M14 Triwulan | `sendNotification` for sign-off reminders |

---

## Security Considerations

- **RLS**: `notification_logs`, `notification_preferences`, `notification_subscriptions` have Row Level Security policies scoped to `organizationId`.
- **PII in logs**: `NotificationLog.metadata` must not contain user names, scores, or message content. Only opaque IDs and counts are stored.
- **Unsubscribe tokens**: `NotificationPreference.unsubscribeToken` is a UUID included in email footers. The `GET /api/notifications/unsubscribe?token=...` endpoint is unauthenticated — any request with a valid token can unsubscribe. Token is not rotated after use (by design — one-click unsubscribe must not require login).
- **CRON_SECRET**: Must be kept secret. Vercel injects it automatically; manual "Run Now" from admin UI also sends it. Rotating the secret requires updating `vercel.json` environment and redeploying.

---

## Related

- Schema: `prisma/schema/nawasena_notifications.prisma`
- Lib: `src/lib/notifications/`
- Admin UI: `src/app/(DashboardLayout)/admin/notifications/`
- User settings: `src/app/(DashboardLayout)/settings/notifications/`
- Service Worker: `public/sw.js`
- React Email templates: `src/emails/`
- Seed: `prisma/seed/notifications-templates.ts`, `notifications-rules.ts`, `notifications-preferences.ts`
- Planning: `docs/modul/15-notifications-reminders/`
