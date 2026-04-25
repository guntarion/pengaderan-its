# M11 — Mental Health Screening

> Modul PRIVACY-CRITICAL untuk deteksi dini kondisi psikologis Maba, referral otomatis ke SAC, dan analitik agregat anonim.
> Lihat juga: [FEATURES.md](./FEATURES.md) untuk katalog fitur berbasis peran.

---

## Daftar Isi

1. [Gambaran Umum](#1-gambaran-umum)
2. [Arsitektur Tinggi](#2-arsitektur-tinggi)
3. [Schema Database](#3-schema-database)
4. [Lapisan Enkripsi (pgcrypto)](#4-lapisan-enkripsi-pgcrypto)
5. [Row-Level Security — 3 Pathway](#5-row-level-security--3-pathway)
6. [Append-Only Immutability](#6-append-only-immutability)
7. [Logger Redactor](#7-logger-redactor)
8. [RLS Helpers](#8-rls-helpers)
9. [Scoring Library](#9-scoring-library)
10. [Auto-Referral SAC (createReferralForRED)](#10-auto-referral-sac-createreferralforred)
11. [Escalation Cron](#11-escalation-cron)
12. [SAC Dashboard — Decrypt-on-Demand](#12-sac-dashboard--decrypt-on-demand)
13. [Aggregate & Cell-Floor](#13-aggregate--cell-floor)
14. [Retention & Research Opt-In](#14-retention--research-opt-in)
15. [Consent Flow](#15-consent-flow)
16. [API Routes](#16-api-routes)
17. [Frontend Pages & Komponen](#17-frontend-pages--komponen)
18. [Email Templates (M15)](#18-email-templates-m15)
19. [Runbooks Operasional](#19-runbooks-operasional)
20. [Keputusan Arsitektur Kunci](#20-keputusan-arsitektur-kunci)
21. [Alur Data End-to-End](#21-alur-data-end-to-end)
22. [Go-Live Gating Items](#22-go-live-gating-items)

---

## 1. Gambaran Umum

M11 menambahkan **lapisan vault** di atas platform NAWASENA untuk mengelola data kesehatan mental (kategori khusus UU PDP pasal 4 ayat 2). Prinsip utama:

- **Privacy-by-design** — default deny, opt-in eksplisit, minimal data exposure di tiap view.
- **Care, not compliance-theater** — setiap Maba yang butuh dukungan terdeteksi dan terhubung ke SAC dalam 72 jam.
- **No stigma language** — copy Maba-facing deskriptif, bukan label warna/numerik.
- **Audit everything** — setiap akses data sensitif tercatat immutable di `MHAccessLog`.
- **Zero AI** — scoring PHQ-9 pure TypeScript lokal, tidak ada external API call.

Posisi dalam ekosistem NAWASENA:

| Modul | Hubungan |
|---|---|
| M01 Foundation | Inherits `createApiHandler`, JWT session, `organizationId` tenant context |
| M03 Struktur Angkatan | `KPGroupMember` dipakai untuk resolve KP dari Maba (support alert anonim) |
| M10 Safeguard | Cross-refer MANUAL oleh SAC bila ada risiko safety; tidak ada cascade otomatis |
| M15 Notifications | `sendNotification` dipakai untuk MH_REFERRAL_SAC (CRITICAL), MH_ESCALATION_COORDINATOR (CRITICAL), MH_SUPPORT_ALERT_KP (NORMAL/anonim) |

---

## 2. Arsitektur Tinggi

```
Maba Browser
  └─ ConsentScreen (scroll-gate + checkbox)
       └─ POST /api/mental-health/consent
  └─ PHQ9Form (one-item-per-step)
       └─ POST /api/mental-health/submissions
            └─ withMHContext(actor, tx => {
                 SET LOCAL app.current_user_id
                 SET LOCAL app.mh_encryption_key
                 INSERT ... pgp_sym_encrypt(rawScore, current_setting(...))
                 scorePHQ9(answers) → severity
                 if severity === 'RED' → createReferralForRED(tx)
               })

createReferralForRED
  ├─ assignSACRoundRobin (SELECT FOR UPDATE SKIP LOCKED)
  ├─ INSERT MHReferralLog (idempotent — unique screeningId)
  ├─ INSERT MHReferralTimeline (CREATED entry)
  ├─ sendNotification(MH_REFERRAL_SAC → SAC, CRITICAL, M15)
  └─ sendNotification(MH_SUPPORT_ALERT_KP → KP, NORMAL anonim, M15)

Vercel Cron (0 * * * *) — m11-escalation
  └─ Find PENDING referrals past slaDeadlineAt
       └─ UPDATE escalatedAt + sendNotification(MH_ESCALATION_COORDINATOR, CRITICAL)

Vercel Cron (0 2 1 * *) — m11-retention-purge
  └─ Hard-delete ARCHIVED cohort data older than 6 months
       (excludes MHResearchConsent opt-in users)

SAC Browser
  └─ GET /api/mental-health/referrals (queue)
  └─ GET /api/mental-health/referrals/[id] (metadata, no decrypt)
  └─ GET /api/mental-health/referrals/[id]/decrypt (trigger decrypt + audit)
       └─ withMHContext(sac, tx => {
            recordMHAccess(DECRYPT_ANSWERS)  ← audit FIRST
            pgp_sym_decrypt(rawScoreEncrypted, ...)
          })

Admin Browser
  └─ GET /api/mental-health/aggregate
       └─ withMHBypass(admin, reason, tx => {
            recordMHAccess(BYPASS_RLS)  ← audit FIRST or rollback
            aggregateSeverityPerKPGroup() → cell-floor 5
          })
```

---

## 3. Schema Database

File: `prisma/schema/nawasena_mental_health.prisma`

### 8 Model

| Model | Deskripsi | Kolom Sensitif |
|---|---|---|
| `MHScreening` | Satu submission PHQ-9/GAD-7/DASS-21 per Maba per cohort per fase | `rawScoreEncrypted bytea` |
| `MHScreeningAnswer` | Per-item answer encrypted | `answerValueEncrypted bytea` |
| `MHReferralLog` | Auto-referral ke SAC saat severity RED | `resolutionNoteEncrypted bytea?` |
| `MHReferralTimeline` | Append-only history setiap status change/reassign/escalation | `payloadEncrypted bytea?` |
| `MHAccessLog` | Immutable audit log semua akses data MH | — (metadata only, no PII) |
| `MHConsentRecord` | Persetujuan Maba per cohort per consent version | — |
| `MHResearchConsent` | Opt-in research (retention 2 tahun) | — |
| `MHDeletionRequest` | User-request deletion dengan 7-hari grace period | — |

### 6 Enum

| Enum | Values |
|---|---|
| `MHInstrument` | PHQ9, GAD7, DASS21 |
| `MHSeverity` | GREEN, YELLOW, RED |
| `MHScreeningPhase` | F1, F4, SELF_TRIGGERED |
| `MHReferralStatus` | PENDING, IN_PROGRESS, RESOLVED, REASSIGNED, TAKEN_OVER, CANCELLED |
| `MHAccessAction` | READ_META, DECRYPT_SCORE, DECRYPT_ANSWERS, DECRYPT_NOTE, STATUS_CHANGE, EXPORT_AGGREGATE, BYPASS_RLS, CONSENT_RECORDED, CONSENT_WITHDRAWN, DATA_DELETED, KEY_ROTATED, AUDIT_REVIEW |
| `MHConsentStatus` | GRANTED, WITHDRAWN, EXPIRED_VERSION |

### Flag Tambahan di User (`nawasena_auth.prisma`)

```prisma
isSACCounselor      Boolean @default(false)
isPoliPsikologiCoord Boolean @default(false)
@@index([organizationId, isSACCounselor])
```

### 13 AuditAction di `nawasena_audit.prisma`

`MH_SCREENING_SUBMITTED`, `MH_REFERRAL_CREATED`, `MH_REFERRAL_STATUS_CHANGED`, `MH_REFERRAL_REASSIGNED`, `MH_REFERRAL_ESCALATED`, `MH_CONSENT_GRANTED`, `MH_CONSENT_WITHDRAWN`, `MH_DELETE_REQUESTED`, `MH_RETENTION_DELETED`, `MH_RESEARCH_OPT_IN`, `MH_KEY_ROTATED`, `MH_AGGREGATE_EXPORTED`, `MH_M10_CROSS_REFERRED`

### Partial Indexes Kritis

- `mh_referral_overdue` — referrals PENDING past deadline (mendukung escalation cron)
- `mh_screening_active_cohort_severity` — screening aktif per cohort (mendukung aggregate)

---

## 4. Lapisan Enkripsi (pgcrypto)

File: `src/lib/mh-screening/encryption.ts`

Enkripsi dilakukan di **DB layer** menggunakan pgcrypto `pgp_sym_encrypt` / `pgp_sym_decrypt`. Key tidak pernah ada di application memory saat encrypt — di-set via session variable dalam transaction:

```sql
-- Encrypt (dalam INSERT)
pgp_sym_encrypt(${value}::text, current_setting('app.mh_encryption_key'))

-- Decrypt (dalam SELECT, hanya via helper audited)
pgp_sym_decrypt("rawScoreEncrypted", current_setting('app.mh_encryption_key'))::text
```

Key management:
- `MH_ENCRYPTION_KEY` environment variable (Vault di production, `.env.local` di dev)
- Field `encryptionKeyVersion` (default 1) di `MHScreening`, `MHScreeningAnswer`, `MHReferralLog`, `MHReferralTimeline` untuk tracking rotasi key
- Rotation: script idempotent batch re-encrypt (dekripsi dengan old key, enkripsi dengan new key, update `encryptionKeyVersion`)
- Runbook: `docs/runbooks/mh-key-rotation.md`

---

## 5. Row-Level Security — 3 Pathway

Diaktifkan via `ENABLE ROW LEVEL SECURITY` di migration SQL untuk semua 8 tabel MH. Tiga pathway akses resmi:

| Pathway | Policy | Kondisi |
|---|---|---|
| Self | `mh_screening_self_read` | `userId = current_setting('app.current_user_id')` |
| SAC Assigned | `mh_screening_sac_read` | Exists `MHReferralLog` dimana `referredToId = current_user_id` AND status IN (PENDING, IN_PROGRESS) |
| Coordinator | `mh_screening_coordinator_read` | `referral.escalatedAt IS NOT NULL` AND `current_setting('app.is_poli_psikologi_coordinator') = true` |
| Bypass (maintenance) | `mh_screening_bypass` | `current_setting('app.bypass_rls') = true` — hanya via `withMHBypass` helper dengan audit mandatory |

Default behavior tanpa session var: **deny all** (fail-closed).

---

## 6. Append-Only Immutability

`MHAccessLog` dan `MHReferralTimeline` tidak punya endpoint PATCH/DELETE. Immutability ditegakkan di dua layer:

1. **RLS policy**: `FOR UPDATE USING false` + `FOR DELETE USING false`
2. **Postgres GRANT**: `REVOKE UPDATE, DELETE ON mh_access_logs, mh_referral_timelines FROM app_runtime_role`

`MHAccessLog` tidak memiliki kolom `updatedAt` (by design).

---

## 7. Logger Redactor

File: `src/lib/logger-mh-redactor.ts`

Allowlist-based — semua field yang belum masuk allowlist diREDACT default. Field yang selalu diREDACT:

```
rawScore, rawScoreEncrypted, answers, answerValue, answerValueEncrypted,
resolutionNote, resolutionNoteEncrypted, phq9Answers, gad7Answers, dass21Answers
```

Pattern:
```typescript
import { createMHRedactingLogger } from '@/lib/logger-mh-redactor';
const log = createMHRedactingLogger(createLogger('mh-submissions'));
// log.info('Submitted', { userId, severity }) → safe (severity = enum, not PII)
// log.info('Answers', { answers: [...] }) → { answers: '[REDACTED]' }
```

Coverage: 16 unit tests (`src/lib/mh-screening/__tests__/logger-mh-redactor.test.ts`).

---

## 8. RLS Helpers

File: `src/lib/mh-screening/rls-helpers.ts`

### `withMHContext(actor, fn)`

Membuka transaction, SET LOCAL session vars untuk akses Maba/SAC normal:

```typescript
await withMHContext({ id: user.id }, async (tx) => {
  // tx sekarang punya app.current_user_id + app.mh_encryption_key
  const screening = await tx.$queryRaw`SELECT ...`;
});
```

### `withMHBypass(actor, reason, fn)`

Hanya untuk maintenance/aggregate. **Audit mandatory SEBELUM bypass diapply.** Jika `recordMHAccess` gagal insert → transaction rollback → bypass tidak terjadi (fail-closed).

```typescript
await withMHBypass({ id: admin.id, role: admin.role }, 'aggregate query', async (tx) => {
  // Audit entry sudah ada; app.bypass_rls = true
});
```

Unit tests: 5 test cases `rls-helpers.test.ts`, termasuk skenario rollback jika audit gagal.

### `recordMHAccess(tx, options)`

File: `src/lib/mh-screening/access-log.ts`

Helper transaction-bound untuk INSERT ke `MHAccessLog`. Dipanggil dalam transaction yang sama dengan operasi sensitif — tidak boleh dipanggil di luar transaction.

```typescript
await recordMHAccess(tx, {
  actorId: sac.id,
  actorRole: sac.role,
  action: 'DECRYPT_ANSWERS',
  targetType: 'MHScreeningAnswer',
  targetId: screeningId,
  targetUserId: maba.id,
});
```

---

## 9. Scoring Library

File: `src/lib/mh-scoring/phq9.ts`

Pure function, zero external call, data tidak pernah meninggalkan server:

```typescript
export function scorePHQ9(answers: number[]): PHQ9Result
// Throws jika answers.length !== 9 atau nilai tidak integer 0-3
```

Threshold:
- 0-4: GREEN (Minimal)
- 5-9: YELLOW (Mild)
- 10-14: YELLOW (Moderate)
- 15-19: RED (Moderately Severe)
- 20-27: RED (Severe)
- **Item #9 (index 8) > 0**: override RED + `immediateContact = true` (SLA 24 jam)

Coverage: 24 unit tests `phq9.test.ts` — 100% boundary coverage termasuk item #9 override, threshold edges, dan invalid input rejection.

Dispatcher: `src/lib/mh-scoring/index.ts` — registry pattern; GAD-7 dan DASS-21 di-stub "not yet implemented" (V2/V3).

---

## 10. Auto-Referral SAC (createReferralForRED)

File: `src/lib/mh-screening/referral.ts`

Dipanggil di dalam `withMHContext` transaction setelah submission RED:

```
createReferralForRED(tx, { userId, organizationId, immediateContact, cohortId })
  1. assignSACRoundRobin(tx, organizationId)
     → SELECT users WHERE isSACCounselor=true ORDER BY pending_count ASC
       FOR UPDATE OF u SKIP LOCKED LIMIT 1
  2. INSERT MHReferralLog (idempotent — unique constraint screeningId)
     slaDeadlineAt = now() + (immediateContact ? 24h : 72h)
  3. INSERT MHReferralTimeline (action='CREATED')
  4. sendNotification('MH_REFERRAL_SAC', [sacId], CRITICAL)   ← M15
  5. resolveKPForMaba(userId) → kpId via KPGroupMember
     sendNotification('MH_SUPPORT_ALERT_KP', [kpId], NORMAL)  ← anonim, no Maba PII
```

Idempotency: `@@unique([screeningId])` pada `MHReferralLog` — double-call return existing (tidak double-create).

Race condition mitigation: `SELECT FOR UPDATE SKIP LOCKED` pada SAC assignment.

---

## 11. Escalation Cron

File: `src/app/api/cron/m11-escalation/route.ts`
Schedule: `0 * * * *` (setiap jam, vercel.json)

Logika:
```
Find MHReferralLog WHERE status=PENDING AND slaDeadlineAt < now() AND escalatedAt IS NULL
→ UPDATE escalatedAt = now()
→ INSERT MHReferralTimeline (action='ESCALATED')
→ sendNotification('MH_ESCALATION_COORDINATOR', [poliPsikologiCoordIds], CRITICAL)
```

`immediateContact=true` → SLA 24 jam (cron jalan setiap jam, granularity acceptable).

---

## 12. SAC Dashboard — Decrypt-on-Demand

Direktori: `src/app/(DashboardLayout)/dashboard/sac/screening-queue/`

Prinsip: metadata tampil tanpa dekripsi (severity enum, timestamps, status). Dekripsi jawaban/skor hanya saat SAC klik tombol "Lihat Detail" — setiap klik menghasilkan audit entry.

Flow:
```
GET /api/mental-health/referrals          → SACQueueTable (metadata only)
GET /api/mental-health/referrals/[id]     → SACCaseDetail (metadata + timeline)
GET /api/mental-health/referrals/[id]/decrypt
  → withMHContext(sac) { recordMHAccess(DECRYPT_ANSWERS) → pgp_sym_decrypt }
```

API routes tersedia:
- `GET/PATCH referrals/[id]/status` — status transition + timeline entry
- `POST referrals/[id]/note` — encrypted SAC note
- `POST referrals/[id]/reassign` — pindah SAC dengan timeline entry
- `POST referrals/[id]/m10-refer` — manual cross-refer ke M10 Safeguard (dengan consent dialog)

---

## 13. Aggregate & Cell-Floor

File: `src/lib/mh-screening/aggregate.ts`

Cell-floor 5 ditegakkan **server-side**; tidak bisa dibypass via UI filter. Cell dengan `count < 5` → `{ count: null, masked: true }` — UI menampilkan `"<5"`.

```typescript
export async function aggregateSeverityPerKPGroup(
  actor, cohortId, phase, minCellSize = 5
): Promise<AggregateRow[]>

export async function aggregateTransitionF1F4(
  actor, cohortId
): Promise<TransitionRow[]>
```

Caching: `withCache(CACHE_KEYS.all('mh-aggregate-' + cohortId + '-' + phase), CACHE_TTL.SHORT)` — TTL 5 menit, cache key per (cohortId, phase). Data individual tidak pernah di-cache.

CSV export (`/api/mental-health/aggregate/export`) juga apply cell-floor + audit entry `EXPORT_AGGREGATE`.

---

## 14. Retention & Research Opt-In

Cron: `src/app/api/cron/m11-retention-purge/route.ts`
Schedule: `0 2 1 * *` (tanggal 1 tiap bulan, pukul 02:00)

Logic:
```
cutoff = now() - 6 months
archivedCohorts = Cohort WHERE status=ARCHIVED AND archivedAt < cutoff
for each cohort:
  excludedUserIds = MHResearchConsent WHERE cohortId = cohort.id AND retentionExtendedUntil > now()
  DELETE MHScreening WHERE cohortId AND userId NOT IN excludedUserIds
  (MHScreeningAnswer + MHReferralLog cascade via FK)
  (MHAccessLog retained — 10 tahun)
```

Dry-run mode: `?dry_run=true` — log target tanpa delete.

Research opt-in (`POST /api/mental-health/research-consent`): extends retention 2 tahun via `MHResearchConsent.retentionExtendedUntil`.

User deletion request (`POST /api/mental-health/delete-request`): grace 7 hari, diblock jika ada active RED referral.

Runbooks:
- `docs/runbooks/mh-key-rotation.md`
- `docs/runbooks/mh-breach-response.md`
- `docs/runbooks/mh-deletion-request-processing.md`
- `docs/runbooks/mh-retention-cron-maintenance.md`

---

## 15. Consent Flow

File: `src/components/mental-health/ConsentScreen.tsx`
API: `src/app/api/mental-health/consent/route.ts`

Fitur consent screen:
- Scroll-gate: checkbox tidak bisa dicentang sebelum konten di-scroll sampai bawah
- Full consent text (`src/content/mh-consent/v1.md`) tersedia via modal
- Consent version disimpan di `MHConsentRecord.consentVersion`
- Withdrawal kapan saja via Privacy Controls (`/dashboard/mental-health/privacy`)
- `MHConsentStatus.EXPIRED_VERSION` diset otomatis jika consent text berubah versi

---

## 16. API Routes

Base path: `src/app/api/mental-health/`

| Method | Path | Role | Keterangan |
|---|---|---|---|
| POST | `/consent` | MABA | Record consent (MABA only) |
| DELETE | `/consent` | MABA | Withdraw consent |
| POST | `/submissions` | MABA | Submit PHQ-9 + auto-refer if RED |
| GET | `/submissions` | MABA | Own submissions list |
| GET | `/submissions/[id]` | MABA/SAC | Own detail; SAC via referral |
| GET | `/referrals` | SAC | Queue (isSACCounselor check) |
| GET | `/referrals/[id]` | SAC | Case metadata |
| GET | `/referrals/[id]/decrypt` | SAC | Decrypt answers (audited) |
| PATCH | `/referrals/[id]/status` | SAC | Status transition |
| POST | `/referrals/[id]/note` | SAC | Encrypted note |
| POST | `/referrals/[id]/reassign` | SAC/Coord | Reassign to other SAC |
| POST | `/referrals/[id]/m10-refer` | SAC | Manual cross-refer to M10 (consent required) |
| GET | `/aggregate` | SC/Pembina/BLM/SUPERADMIN | Aggregate heatmap (cell-floor 5) |
| GET | `/aggregate/export` | SUPERADMIN | CSV export (cell-floor 5 + audit) |
| POST | `/delete-request` | MABA | Request deletion (7-day grace) |
| POST | `/research-consent` | MABA | Opt-in research (2-year retention) |
| GET | `/superadmin/audit-log` | SUPERADMIN | Query audit log (audits itself) |

Semua routes menggunakan `createApiHandler` dari `@/lib/api`. Tidak ada `NextResponse.json()` langsung.

---

## 17. Frontend Pages & Komponen

### MABA (`src/app/(DashboardLayout)/dashboard/mental-health/`)

| Path | Komponen | Deskripsi |
|---|---|---|
| `/consent` | `ConsentScreen` | Scroll-gate consent flow |
| `/form` | `PHQ9Form` + `EmergencyBanner` | One-item-per-step PHQ-9 |
| `/results` | `ScreeningResult` | History daftar hasil (label deskriptif, non-numerik) |
| `/results/[id]` | `ScreeningResult` | Detail hasil |
| `/privacy` | `PrivacyControls` | Withdraw consent + research opt-in + deletion request |

### SAC (`src/app/(DashboardLayout)/dashboard/sac/screening-queue/`)

| Path | Komponen | Deskripsi |
|---|---|---|
| `/` | `SACQueueTable` | DataTable referrals dengan SLA countdown |
| `/[id]` | `SACCaseDetail` | Detail case + timeline, decrypt-on-demand |
| `/[id]/follow-up` | `SACFollowUpForm` | Note encrypted + status transition |

### Admin (`src/app/(DashboardLayout)/dashboard/admin/mental-health/`)

| Path | Komponen | Deskripsi |
|---|---|---|
| `/aggregate` | `AggregateChart` | Severity distribution per KP-Group (masked `<5`) |
| `/aggregate/transition` | `TransitionChart` | F1→F4 delta matrix |

### Superadmin (`src/app/(DashboardLayout)/dashboard/superadmin/mh-audit/`)

| Path | Komponen | Deskripsi |
|---|---|---|
| `/` | `AuditLogViewer` | Query + filter audit log (setiap query audit log juga dicatat) |

### Website Publik (`src/app/(WebsiteLayout)/mental-health/`)

| Path | Keterangan |
|---|---|
| `/` | Educational hub — self-care, help-seeking, hotlines, FAQ |
| `/self-care` | Artikel self-care berbasis evidence |
| `/help-seeking` | Cara menghubungi SAC + hotline 119 ext 8 |
| `/faq` | Anti-stigma FAQ |

---

## 18. Email Templates (M15)

Semua template di `src/emails/`:

| File | Category | Penerima | Catatan |
|---|---|---|---|
| `MhReferralSac.tsx` | CRITICAL | SAC assigned | No Maba PII — cohort/kpGroup ref only |
| `MhSupportAlertKp.tsx` | NORMAL | KP terkait | Anonim — no Maba name/ID |
| `MhEscalationCoordinator.tsx` | CRITICAL | Poli Psikologi Coord | Referral ID + anonymous Maba ref |
| `MhImmediateContact.tsx` | CRITICAL | SAC | Khusus `immediateContact=true` (item #9) |
| `MhRetentionWarning.tsx` | NORMAL | Maba | 14 hari sebelum data purge |

---

## 19. Runbooks Operasional

Semua runbooks di `docs/runbooks/`:

| File | Kapan Digunakan |
|---|---|
| `mh-key-rotation.md` | Annual key rotation; juga bila key compromise |
| `mh-breach-response.md` | Bila terjadi unauthorized access / plaintext leak terdeteksi |
| `mh-deletion-request-processing.md` | Saat admin memproses `MHDeletionRequest` |
| `mh-retention-cron-maintenance.md` | Troubleshoot/monitor monthly retention purge |

---

## 20. Keputusan Arsitektur Kunci

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Encryption | pgcrypto column-level (DB layer) | Simple, session-var-controlled, centralized auditability; key tidak pernah di app memory saat encrypt |
| RLS | 3-pathway (self/SAC/coordinator) + bypass dengan audit mandatory | Fail-closed default; bypass tidak bisa terjadi tanpa audit entry |
| Scoring | Pure TypeScript lokal | Data tidak boleh keluar server; 100% testable; zero external dependency |
| SAC assignment | Round-robin via SELECT FOR UPDATE SKIP LOCKED | Mencegah race condition tanpa queue worker kompleks |
| Escalation | Cron 1-jam | SLA 72h → granularity 1h acceptable; simpler dari queue worker |
| Caching | NO pada data individual; YES pada aggregate (TTL 5 menit) | Privacy > performance; aggregate safely shareable |
| M10 cascade | Manual oleh SAC (bukan otomatis) | Purpose limitation UU PDP; MH ≠ safety incident |
| Aggregate | Cell-floor 5 server-side | Re-identification prevention; tidak bisa dibypass via filter UI |
| Audit log | Append-only via RLS policy + REVOKE | Standar forensik; immutable evidence trail |
| Retention | 6 bulan post-cohort archived; research opt-in 2 tahun | Data minimization UU PDP; research exception explicit consent |
| Logger | Allowlist-based redactor (default REDACT) | Fail-closed terhadap field baru yang belum allowlisted |

---

## 21. Alur Data End-to-End

```
1. MABA buka /dashboard/mental-health
   → cek MHConsentRecord aktif
   → bila tidak ada: redirect ke /consent

2. Consent flow
   → scroll full text → centang checkbox → POST /api/mental-health/consent
   → MHConsentRecord GRANTED + MH_CONSENT_GRANTED audit

3. Submit PHQ-9
   → PHQ9Form one-item-per-step (9 langkah)
   → POST /api/mental-health/submissions
   → withMHContext: SET LOCAL session vars
   → scorePHQ9(answers) → severity
   → INSERT MHScreening (rawScoreEncrypted) + MHScreeningAnswer (per-item encrypted)
   → MH_SCREENING_SUBMITTED audit
   → if RED: createReferralForRED → MHReferralLog + M15 notif

4. Result display
   → ScreeningResult: label deskriptif (bukan angka)
   → EmergencyBanner jika immediateContact=true

5. SAC receives M15 CRITICAL notif
   → SACQueueTable: metadata tanpa decrypt
   → Klik case → SACCaseDetail (metadata + timeline)
   → Klik "Lihat Jawaban" → GET /decrypt → audit DECRYPT_ANSWERS → plaintext di browser

6. SAC follow-up
   → SACFollowUpForm: encrypted note + status transition
   → MHReferralTimeline entry per action
   → RESOLVED: MH_REFERRAL_STATUS_CHANGED audit

7. Escalation (bila SLA miss)
   → Vercel Cron setiap jam
   → UPDATE escalatedAt → M15 CRITICAL ke Poli Psikologi coordinator
   → Coordinator akses via pathway 3 RLS (escalatedAt IS NOT NULL)

8. Retention purge (bulanan)
   → Vercel Cron tanggal 1 tiap bulan
   → DELETE data cohort ARCHIVED > 6 bulan (kecuali research opt-in)
   → MH_RETENTION_DELETED audit
   → MHAccessLog tetap (10 tahun)
```

---

## 22. Go-Live Gating Items

Item berikut adalah **prasyarat production go-live** dan bersifat external action (bukan kode):

| Item | PIC | Status |
|---|---|---|
| DPIA per UU PDP pasal 25 | DPO ITS | Deferred |
| MOU dengan SAC ITS | Kepala SAC + Dekan | Deferred |
| MOU dengan Poli Psikologi ITS | Koordinator Poli + BLM | Deferred |
| Legal review consent text v1 | Legal ITS | Deferred |
| Poli Psikologi sign-off content edukatif | Poli Psikologi | Deferred |
| HIMPSI endorsement (atau equivalent) | BLM + SC | Deferred |
| Penetration test (0 critical/high findings) | External auditor | Deferred |
| Training KP pre-cohort | SC/BLM | Deferred |
| Dead-man switch monitoring | DevOps | Deferred |
| Pilot cohort review | SC + SAC | Deferred |

Fitur `M11_ENABLED=true` di environment production hanya diset setelah semua item di atas selesai.

---

Lihat [FEATURES.md](./FEATURES.md) untuk katalog fitur per peran pengguna.
Lihat [08-master-checklist.md](./08-master-checklist.md) untuk status implementasi detail.
