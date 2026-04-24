-- M11: Mental Health Screening — Privacy-Critical
-- Created: 2026-04-25
--
-- Includes:
--   1. pgcrypto extension
--   2. New enums (6)
--   3. New tables (8)
--   4. ALTER TABLE users ADD COLUMN isSACCounselor, isPoliPsikologiCoord
--   5. ALTER ENUM AuditAction ADD 13 MH_* values
--   6. Row-Level Security policies
--   7. Partial indexes
--   8. Immutability grants

-- Step 1: Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 2: New enums

CREATE TYPE "MHInstrument" AS ENUM ('PHQ9', 'GAD7', 'DASS21');
CREATE TYPE "MHSeverity" AS ENUM ('GREEN', 'YELLOW', 'RED');
CREATE TYPE "MHScreeningPhase" AS ENUM ('F1', 'F4', 'SELF_TRIGGERED');
CREATE TYPE "MHReferralStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'REASSIGNED', 'TAKEN_OVER', 'CANCELLED');
CREATE TYPE "MHAccessAction" AS ENUM ('READ_META', 'DECRYPT_SCORE', 'DECRYPT_ANSWERS', 'DECRYPT_NOTE', 'STATUS_CHANGE', 'EXPORT_AGGREGATE', 'BYPASS_RLS', 'CONSENT_RECORDED', 'CONSENT_WITHDRAWN', 'DATA_DELETED', 'KEY_ROTATED', 'AUDIT_REVIEW');
CREATE TYPE "MHConsentStatus" AS ENUM ('GRANTED', 'WITHDRAWN', 'EXPIRED_VERSION');

-- Step 3: Extend AuditAction enum with M11 values

ALTER TYPE "AuditAction" ADD VALUE 'MH_SCREENING_SUBMITTED';
ALTER TYPE "AuditAction" ADD VALUE 'MH_REFERRAL_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'MH_REFERRAL_STATUS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'MH_REFERRAL_REASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE 'MH_REFERRAL_ESCALATED';
ALTER TYPE "AuditAction" ADD VALUE 'MH_CONSENT_GRANTED';
ALTER TYPE "AuditAction" ADD VALUE 'MH_CONSENT_WITHDRAWN';
ALTER TYPE "AuditAction" ADD VALUE 'MH_DELETE_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'MH_RETENTION_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'MH_RESEARCH_OPT_IN';
ALTER TYPE "AuditAction" ADD VALUE 'MH_KEY_ROTATED';
ALTER TYPE "AuditAction" ADD VALUE 'MH_AGGREGATE_EXPORTED';
ALTER TYPE "AuditAction" ADD VALUE 'MH_M10_CROSS_REFERRED';

-- Step 4: Extend users table with M11 flags

ALTER TABLE "users" ADD COLUMN "isSACCounselor" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "isPoliPsikologiCoord" BOOLEAN NOT NULL DEFAULT false;

-- Index for SAC assignment round-robin
CREATE INDEX "users_organizationId_isSACCounselor_idx" ON "users"("organizationId", "isSACCounselor");

-- Step 5: Create MHConsentRecord table (referenced by MHScreening)

CREATE TABLE "mh_consent_records" (
    "id"              TEXT NOT NULL,
    "userId"          TEXT NOT NULL,
    "cohortId"        TEXT NOT NULL,
    "consentVersion"  TEXT NOT NULL,
    "status"          "MHConsentStatus" NOT NULL,
    "grantedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt"     TIMESTAMP(3),
    "withdrawalReason" TEXT,
    "ipHash"          TEXT,
    "userAgent"       TEXT,
    "scope"           JSONB NOT NULL,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mh_consent_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mh_consent_records_userId_cohortId_consentVersion_key" ON "mh_consent_records"("userId", "cohortId", "consentVersion");
CREATE INDEX "mh_consent_records_userId_status_idx" ON "mh_consent_records"("userId", "status");

ALTER TABLE "mh_consent_records"
    ADD CONSTRAINT "mh_consent_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "mh_consent_records_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 6: Create MHScreening table

CREATE TABLE "mh_screenings" (
    "id"                   TEXT NOT NULL,
    "userId"               TEXT NOT NULL,
    "cohortId"             TEXT NOT NULL,
    "organizationId"       TEXT NOT NULL,
    "kpGroupId"            TEXT,
    "instrument"           "MHInstrument" NOT NULL,
    "phase"                "MHScreeningPhase" NOT NULL,
    "rawScoreEncrypted"    BYTEA NOT NULL,
    "severity"             "MHSeverity" NOT NULL,
    "flagged"              BOOLEAN NOT NULL DEFAULT false,
    "immediateContact"     BOOLEAN NOT NULL DEFAULT false,
    "encryptionKeyVersion" INTEGER NOT NULL DEFAULT 1,
    "consentId"            TEXT NOT NULL,
    "recordedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt"            TIMESTAMP(3),
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mh_screenings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mh_screenings_userId_cohortId_phase_instrument_key" ON "mh_screenings"("userId", "cohortId", "phase", "instrument");
CREATE INDEX "mh_screenings_cohortId_phase_severity_idx" ON "mh_screenings"("cohortId", "phase", "severity");
CREATE INDEX "mh_screenings_userId_cohortId_idx" ON "mh_screenings"("userId", "cohortId");
CREATE INDEX "mh_screenings_kpGroupId_phase_severity_idx" ON "mh_screenings"("kpGroupId", "phase", "severity");
CREATE INDEX "mh_screenings_organizationId_idx" ON "mh_screenings"("organizationId");

ALTER TABLE "mh_screenings"
    ADD CONSTRAINT "mh_screenings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "mh_screenings_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "mh_screenings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "mh_screenings_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "mh_consent_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 7: Create MHScreeningAnswer table

CREATE TABLE "mh_screening_answers" (
    "id"                     TEXT NOT NULL,
    "screeningId"            TEXT NOT NULL,
    "questionIndex"          INTEGER NOT NULL,
    "answerValueEncrypted"   BYTEA NOT NULL,
    "encryptionKeyVersion"   INTEGER NOT NULL DEFAULT 1,
    "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mh_screening_answers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mh_screening_answers_screeningId_questionIndex_key" ON "mh_screening_answers"("screeningId", "questionIndex");

ALTER TABLE "mh_screening_answers"
    ADD CONSTRAINT "mh_screening_answers_screeningId_fkey" FOREIGN KEY ("screeningId") REFERENCES "mh_screenings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 8: Create MHReferralLog table

CREATE TABLE "mh_referral_logs" (
    "id"                       TEXT NOT NULL,
    "screeningId"              TEXT NOT NULL,
    "userId"                   TEXT NOT NULL,
    "organizationId"           TEXT NOT NULL,
    "referredAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referredToId"             TEXT NOT NULL,
    "assignmentReason"         TEXT NOT NULL DEFAULT 'AUTO_ROUND_ROBIN',
    "slaDeadlineAt"            TIMESTAMP(3) NOT NULL,
    "status"                   "MHReferralStatus" NOT NULL,
    "statusChangedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt"           TIMESTAMP(3),
    "resolutionAt"             TIMESTAMP(3),
    "resolutionNoteEncrypted"  BYTEA,
    "encryptionKeyVersion"     INTEGER NOT NULL DEFAULT 1,
    "escalatedAt"              TIMESTAMP(3),
    "takenOverById"            TEXT,
    "reassignedFromId"         TEXT,
    "reassignedReason"         TEXT,
    "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mh_referral_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mh_referral_logs_screeningId_key" ON "mh_referral_logs"("screeningId");
CREATE INDEX "mh_referral_logs_referredToId_status_slaDeadlineAt_idx" ON "mh_referral_logs"("referredToId", "status", "slaDeadlineAt");
CREATE INDEX "mh_referral_logs_status_slaDeadlineAt_idx" ON "mh_referral_logs"("status", "slaDeadlineAt");
CREATE INDEX "mh_referral_logs_escalatedAt_idx" ON "mh_referral_logs"("escalatedAt");
CREATE INDEX "mh_referral_logs_userId_idx" ON "mh_referral_logs"("userId");
CREATE INDEX "mh_referral_logs_organizationId_idx" ON "mh_referral_logs"("organizationId");

ALTER TABLE "mh_referral_logs"
    ADD CONSTRAINT "mh_referral_logs_screeningId_fkey" FOREIGN KEY ("screeningId") REFERENCES "mh_screenings"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "mh_referral_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "mh_referral_logs_referredToId_fkey" FOREIGN KEY ("referredToId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "mh_referral_logs_takenOverById_fkey" FOREIGN KEY ("takenOverById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "mh_referral_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 9: Create MHReferralTimeline table

CREATE TABLE "mh_referral_timelines" (
    "id"                   TEXT NOT NULL,
    "referralId"           TEXT NOT NULL,
    "actorId"              TEXT NOT NULL,
    "action"               TEXT NOT NULL,
    "payloadEncrypted"     BYTEA,
    "metadata"             JSONB,
    "encryptionKeyVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mh_referral_timelines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mh_referral_timelines_referralId_createdAt_idx" ON "mh_referral_timelines"("referralId", "createdAt");

ALTER TABLE "mh_referral_timelines"
    ADD CONSTRAINT "mh_referral_timelines_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "mh_referral_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 10: Create MHAccessLog table (append-only audit log)

CREATE TABLE "mh_access_logs" (
    "id"             TEXT NOT NULL,
    "actorId"        TEXT NOT NULL,
    "actorRole"      "UserRole" NOT NULL,
    "action"         "MHAccessAction" NOT NULL,
    "targetType"     TEXT NOT NULL,
    "targetId"       TEXT,
    "targetUserId"   TEXT,
    "organizationId" TEXT,
    "reason"         TEXT,
    "ipHash"         TEXT,
    "userAgent"      TEXT,
    "metadata"       JSONB,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mh_access_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mh_access_logs_actorId_createdAt_idx" ON "mh_access_logs"("actorId", "createdAt");
CREATE INDEX "mh_access_logs_targetUserId_createdAt_idx" ON "mh_access_logs"("targetUserId", "createdAt");
CREATE INDEX "mh_access_logs_action_createdAt_idx" ON "mh_access_logs"("action", "createdAt");
CREATE INDEX "mh_access_logs_organizationId_createdAt_idx" ON "mh_access_logs"("organizationId", "createdAt");

ALTER TABLE "mh_access_logs"
    ADD CONSTRAINT "mh_access_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 11: Create MHResearchConsent table

CREATE TABLE "mh_research_consents" (
    "id"                     TEXT NOT NULL,
    "userId"                 TEXT NOT NULL,
    "cohortId"               TEXT NOT NULL,
    "consentVersion"         TEXT NOT NULL,
    "scope"                  TEXT[] NOT NULL,
    "retentionExtendedUntil" TIMESTAMP(3) NOT NULL,
    "withdrawnAt"            TIMESTAMP(3),
    "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mh_research_consents_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "mh_research_consents"
    ADD CONSTRAINT "mh_research_consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "mh_research_consents_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 12: Create MHDeletionRequest table

CREATE TABLE "mh_deletion_requests" (
    "id"                TEXT NOT NULL,
    "userId"            TEXT NOT NULL,
    "requestedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledDeleteAt" TIMESTAMP(3) NOT NULL,
    "processedAt"       TIMESTAMP(3),
    "blockedByReason"   TEXT,
    "overrideBy"        TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mh_deletion_requests_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "mh_deletion_requests"
    ADD CONSTRAINT "mh_deletion_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 13: Row-Level Security Policies

-- MHScreening RLS
ALTER TABLE "mh_screenings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY mh_screening_default_deny ON "mh_screenings" FOR ALL USING (false);
CREATE POLICY mh_screening_self ON "mh_screenings" FOR SELECT USING ("userId"::text = current_setting('app.current_user_id', true));
CREATE POLICY mh_screening_sac ON "mh_screenings" FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM "mh_referral_logs" rl
        WHERE rl."screeningId" = "mh_screenings"."id"
          AND rl."referredToId"::text = current_setting('app.current_user_id', true)
          AND rl."status" IN ('PENDING', 'IN_PROGRESS')
    )
);
CREATE POLICY mh_screening_coordinator ON "mh_screenings" FOR SELECT USING (
    current_setting('app.is_poli_psikologi_coordinator', true)::boolean = true
    AND EXISTS (
        SELECT 1 FROM "mh_referral_logs" rl
        WHERE rl."screeningId" = "mh_screenings"."id"
          AND rl."escalatedAt" IS NOT NULL
    )
);
CREATE POLICY mh_screening_insert_self ON "mh_screenings" FOR INSERT WITH CHECK ("userId"::text = current_setting('app.current_user_id', true));
CREATE POLICY mh_screening_update_self ON "mh_screenings" FOR UPDATE USING ("userId"::text = current_setting('app.current_user_id', true));
CREATE POLICY mh_screening_bypass ON "mh_screenings" FOR ALL USING (current_setting('app.bypass_rls', true)::boolean = true);

-- MHScreeningAnswer RLS (via parent screening)
ALTER TABLE "mh_screening_answers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY mh_answer_default_deny ON "mh_screening_answers" FOR ALL USING (false);
CREATE POLICY mh_answer_self ON "mh_screening_answers" FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM "mh_screenings" s
        WHERE s."id" = "mh_screening_answers"."screeningId"
          AND s."userId"::text = current_setting('app.current_user_id', true)
    )
);
CREATE POLICY mh_answer_sac ON "mh_screening_answers" FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM "mh_screenings" s
        JOIN "mh_referral_logs" rl ON rl."screeningId" = s."id"
        WHERE s."id" = "mh_screening_answers"."screeningId"
          AND rl."referredToId"::text = current_setting('app.current_user_id', true)
          AND rl."status" IN ('PENDING', 'IN_PROGRESS')
    )
);
CREATE POLICY mh_answer_insert_self ON "mh_screening_answers" FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM "mh_screenings" s
        WHERE s."id" = "mh_screening_answers"."screeningId"
          AND s."userId"::text = current_setting('app.current_user_id', true)
    )
);
CREATE POLICY mh_answer_bypass ON "mh_screening_answers" FOR ALL USING (current_setting('app.bypass_rls', true)::boolean = true);

-- MHReferralLog RLS
ALTER TABLE "mh_referral_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY mh_referral_default_deny ON "mh_referral_logs" FOR ALL USING (false);
CREATE POLICY mh_referral_self ON "mh_referral_logs" FOR SELECT USING ("userId"::text = current_setting('app.current_user_id', true));
CREATE POLICY mh_referral_sac ON "mh_referral_logs" FOR SELECT USING ("referredToId"::text = current_setting('app.current_user_id', true));
CREATE POLICY mh_referral_coordinator ON "mh_referral_logs" FOR SELECT USING (
    current_setting('app.is_poli_psikologi_coordinator', true)::boolean = true
    AND "escalatedAt" IS NOT NULL
);
CREATE POLICY mh_referral_update_sac ON "mh_referral_logs" FOR UPDATE USING (
    "referredToId"::text = current_setting('app.current_user_id', true)
    OR (current_setting('app.is_poli_psikologi_coordinator', true)::boolean = true AND "escalatedAt" IS NOT NULL)
);
CREATE POLICY mh_referral_insert ON "mh_referral_logs" FOR INSERT WITH CHECK (current_setting('app.bypass_rls', true)::boolean = true);
CREATE POLICY mh_referral_bypass ON "mh_referral_logs" FOR ALL USING (current_setting('app.bypass_rls', true)::boolean = true);

-- MHReferralTimeline RLS (append-only)
ALTER TABLE "mh_referral_timelines" ENABLE ROW LEVEL SECURITY;
CREATE POLICY mh_timeline_default_deny ON "mh_referral_timelines" FOR ALL USING (false);
CREATE POLICY mh_timeline_select ON "mh_referral_timelines" FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM "mh_referral_logs" rl
        WHERE rl."id" = "mh_referral_timelines"."referralId"
          AND (
              rl."referredToId"::text = current_setting('app.current_user_id', true)
              OR rl."userId"::text = current_setting('app.current_user_id', true)
              OR (current_setting('app.is_poli_psikologi_coordinator', true)::boolean = true AND rl."escalatedAt" IS NOT NULL)
          )
    )
);
CREATE POLICY mh_timeline_insert ON "mh_referral_timelines" FOR INSERT WITH CHECK (true);
-- Deny UPDATE and DELETE explicitly
CREATE POLICY mh_timeline_no_update ON "mh_referral_timelines" FOR UPDATE USING (false);
CREATE POLICY mh_timeline_no_delete ON "mh_referral_timelines" FOR DELETE USING (false);
CREATE POLICY mh_timeline_bypass ON "mh_referral_timelines" FOR ALL USING (current_setting('app.bypass_rls', true)::boolean = true);

-- MHAccessLog RLS (append-only audit log)
ALTER TABLE "mh_access_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY mh_access_log_default_deny ON "mh_access_logs" FOR ALL USING (false);
CREATE POLICY mh_access_log_read_superadmin ON "mh_access_logs" FOR SELECT USING (
    current_setting('app.is_superadmin', true)::boolean = true
);
CREATE POLICY mh_access_log_insert ON "mh_access_logs" FOR INSERT WITH CHECK (true);
-- Deny UPDATE and DELETE explicitly
CREATE POLICY mh_access_log_no_update ON "mh_access_logs" FOR UPDATE USING (false);
CREATE POLICY mh_access_log_no_delete ON "mh_access_logs" FOR DELETE USING (false);

-- MHConsentRecord RLS
ALTER TABLE "mh_consent_records" ENABLE ROW LEVEL SECURITY;
CREATE POLICY mh_consent_default_deny ON "mh_consent_records" FOR ALL USING (false);
CREATE POLICY mh_consent_self ON "mh_consent_records" FOR SELECT USING ("userId"::text = current_setting('app.current_user_id', true));
CREATE POLICY mh_consent_self_update ON "mh_consent_records" FOR UPDATE USING ("userId"::text = current_setting('app.current_user_id', true));
CREATE POLICY mh_consent_insert_self ON "mh_consent_records" FOR INSERT WITH CHECK ("userId"::text = current_setting('app.current_user_id', true));
CREATE POLICY mh_consent_bypass ON "mh_consent_records" FOR ALL USING (current_setting('app.bypass_rls', true)::boolean = true);

-- MHResearchConsent RLS
ALTER TABLE "mh_research_consents" ENABLE ROW LEVEL SECURITY;
CREATE POLICY mh_research_default_deny ON "mh_research_consents" FOR ALL USING (false);
CREATE POLICY mh_research_self ON "mh_research_consents" FOR SELECT USING ("userId"::text = current_setting('app.current_user_id', true));
CREATE POLICY mh_research_insert_self ON "mh_research_consents" FOR INSERT WITH CHECK ("userId"::text = current_setting('app.current_user_id', true));
CREATE POLICY mh_research_update_self ON "mh_research_consents" FOR UPDATE USING ("userId"::text = current_setting('app.current_user_id', true));
CREATE POLICY mh_research_bypass ON "mh_research_consents" FOR ALL USING (current_setting('app.bypass_rls', true)::boolean = true);

-- MHDeletionRequest RLS
ALTER TABLE "mh_deletion_requests" ENABLE ROW LEVEL SECURITY;
CREATE POLICY mh_deletion_default_deny ON "mh_deletion_requests" FOR ALL USING (false);
CREATE POLICY mh_deletion_self ON "mh_deletion_requests" FOR SELECT USING ("userId"::text = current_setting('app.current_user_id', true));
CREATE POLICY mh_deletion_insert_self ON "mh_deletion_requests" FOR INSERT WITH CHECK ("userId"::text = current_setting('app.current_user_id', true));
CREATE POLICY mh_deletion_coordinator_update ON "mh_deletion_requests" FOR UPDATE USING (
    current_setting('app.is_poli_psikologi_coordinator', true)::boolean = true
);
CREATE POLICY mh_deletion_bypass ON "mh_deletion_requests" FOR ALL USING (current_setting('app.bypass_rls', true)::boolean = true);

-- Step 14: Partial indexes for performance

-- Only index PENDING referrals past deadline (escalation cron optimize)
CREATE INDEX mh_referral_overdue ON "mh_referral_logs" ("slaDeadlineAt")
    WHERE status = 'PENDING' AND "escalatedAt" IS NULL;

-- Only index active screenings (exclude soft-deleted)
CREATE INDEX mh_screening_active_cohort_severity ON "mh_screenings" ("cohortId", "phase", "severity")
    WHERE "deletedAt" IS NULL;

-- Step 15: Immutability grants (conditional — skip if role does not exist)

DO $$ BEGIN
    REVOKE UPDATE, DELETE ON "mh_access_logs" FROM app_runtime_role;
    REVOKE UPDATE, DELETE ON "mh_referral_timelines" FROM app_runtime_role;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
