-- M12: Anonymous Channel — Privacy+Anonymity CRITICAL
-- Created: 2026-04-25
--
-- HARD INVARIANT: anon_reports has ZERO userId/email/ip/fingerprint columns.
-- CI test (anonymity-assertions.test.ts) enforces this as gate pre-deploy.
--
-- Includes:
--   1. New enums (4)
--   2. New tables (3): anon_reports, anon_report_access_logs, anon_report_config
--   3. Indexes
--   4. Row-Level Security policies
--   5. REVOKE destructive grants
--   6. Seed default keyword config

-- ============================================================
-- Step 1: New enums
-- ============================================================

CREATE TYPE "AnonCategory" AS ENUM ('BULLYING', 'HARASSMENT', 'UNFAIR', 'SUGGESTION', 'OTHER');
CREATE TYPE "AnonSeverity" AS ENUM ('GREEN', 'YELLOW', 'RED');
CREATE TYPE "AnonStatus" AS ENUM ('NEW', 'IN_REVIEW', 'RESOLVED', 'ESCALATED_TO_SATGAS');
CREATE TYPE "AnonAccessAction" AS ENUM (
  'READ',
  'UPDATE',
  'DOWNLOAD_ATTACHMENT',
  'ESCALATE',
  'STATUS_CHANGE',
  'SEVERITY_OVERRIDE',
  'CATEGORY_OVERRIDE',
  'PUBLIC_NOTE_ADDED',
  'INTERNAL_NOTE_ADDED',
  'TAKEOVER_FROM_DEACTIVATED',
  'BULK_DELETE',
  'BYPASS_RLS'
);

-- ============================================================
-- Step 2: Create anon_reports table
-- CRITICAL: No userId, email, phone, reporterName, ip, userAgent, fingerprint
-- ============================================================

CREATE TABLE "anon_reports" (
    "id"                  UUID NOT NULL DEFAULT gen_random_uuid(),
    "trackingCode"        VARCHAR(12) NOT NULL,
    "cohortId"            TEXT NOT NULL,
    "organizationId"      TEXT NOT NULL,
    "category"            "AnonCategory" NOT NULL,
    "bodyText"            TEXT NOT NULL,
    "bodyRedacted"        BOOLEAN NOT NULL DEFAULT false,
    "attachmentKey"       TEXT,
    "reporterSeverity"    "AnonSeverity",
    "severity"            "AnonSeverity" NOT NULL DEFAULT 'GREEN',
    "severityReason"      TEXT[] NOT NULL DEFAULT '{}',
    "status"              "AnonStatus" NOT NULL DEFAULT 'NEW',
    "satgasEscalated"     BOOLEAN NOT NULL DEFAULT false,
    "satgasEscalatedAt"   TIMESTAMP(3),
    "acknowledgedById"    TEXT,
    "acknowledgedAt"      TIMESTAMP(3),
    "closedAt"            TIMESTAMP(3),
    "resolutionNotes"     TEXT,
    "publicNote"          VARCHAR(300),
    "satgasNotes"         TEXT,
    "blmCategoryOverride" "AnonCategory",
    "blmSeverityOverride" "AnonSeverity",
    "recordedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anon_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "anon_reports_trackingCode_key" ON "anon_reports"("trackingCode");
CREATE INDEX "anon_reports_cohortId_status_idx" ON "anon_reports"("cohortId", "status");
CREATE INDEX "anon_reports_organizationId_status_idx" ON "anon_reports"("organizationId", "status");
CREATE INDEX "anon_reports_cohortId_severity_idx" ON "anon_reports"("cohortId", "severity");
CREATE INDEX "anon_reports_satgasEscalated_status_idx" ON "anon_reports"("satgasEscalated", "status");
CREATE INDEX "anon_reports_recordedAt_idx" ON "anon_reports"("recordedAt");
CREATE INDEX "anon_reports_acknowledgedById_idx" ON "anon_reports"("acknowledgedById");

-- ============================================================
-- Step 3: Create anon_report_access_logs table (append-only audit)
-- ============================================================

CREATE TABLE "anon_report_access_logs" (
    "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
    "reportId"    UUID NOT NULL,
    "actorId"     TEXT NOT NULL,
    "actorRole"   TEXT NOT NULL,
    "actorIpHash" VARCHAR(64),
    "action"      "AnonAccessAction" NOT NULL,
    "meta"        JSONB,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anon_report_access_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "anon_report_access_logs"
    ADD CONSTRAINT "anon_report_access_logs_reportId_fkey"
    FOREIGN KEY ("reportId") REFERENCES "anon_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "anon_report_access_logs_reportId_createdAt_idx" ON "anon_report_access_logs"("reportId", "createdAt");
CREATE INDEX "anon_report_access_logs_actorId_createdAt_idx" ON "anon_report_access_logs"("actorId", "createdAt");
CREATE INDEX "anon_report_access_logs_action_createdAt_idx" ON "anon_report_access_logs"("action", "createdAt");

-- ============================================================
-- Step 4: Create anon_report_config table
-- ============================================================

CREATE TABLE "anon_report_config" (
    "id"          TEXT NOT NULL,
    "key"         TEXT NOT NULL,
    "value"       JSONB NOT NULL,
    "updatedById" TEXT NOT NULL,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anon_report_config_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "anon_report_config_key_key" ON "anon_report_config"("key");

-- ============================================================
-- Step 5: Row-Level Security
-- ============================================================

-- anon_reports RLS
ALTER TABLE "anon_reports" ENABLE ROW LEVEL SECURITY;

-- INSERT: public allowed (anonymous submission, no session needed)
CREATE POLICY anon_report_insert_public ON "anon_reports"
    FOR INSERT
    WITH CHECK (true);

-- SELECT for BLM: scoped to their organization
CREATE POLICY anon_report_select_blm ON "anon_reports"
    FOR SELECT
    USING (
        current_setting('app.current_user_role', true) = 'BLM'
        AND "organizationId" = current_setting('app.current_user_org_id', true)
    );

-- SELECT for Satgas PPKPT: only escalated cases, cross-org
CREATE POLICY anon_report_select_satgas ON "anon_reports"
    FOR SELECT
    USING (
        current_setting('app.current_user_role', true) = 'SATGAS_PPKPT'
        AND "satgasEscalated" = true
    );

-- SELECT for SUPERADMIN: all
CREATE POLICY anon_report_select_superadmin ON "anon_reports"
    FOR SELECT
    USING (current_setting('app.current_user_role', true) = 'SUPERADMIN');

-- SC: NO SELECT policy (default deny — SC uses aggregate endpoint only)

-- UPDATE for BLM/Satgas/SUPERADMIN (status, notes, severity override)
CREATE POLICY anon_report_update_handlers ON "anon_reports"
    FOR UPDATE
    USING (
        current_setting('app.current_user_role', true) IN ('BLM', 'SATGAS_PPKPT', 'SUPERADMIN')
    );

-- Bypass for public status tracker + service-to-service + retention cron
CREATE POLICY anon_report_bypass ON "anon_reports"
    FOR ALL
    USING (current_setting('app.bypass_rls', true) = 'true');

-- DELETE: no policy => implicit deny for all roles
-- SUPERADMIN uses bypass with explicit audit entry (BULK_DELETE action)

-- anon_report_access_logs RLS (append-only)
ALTER TABLE "anon_report_access_logs" ENABLE ROW LEVEL SECURITY;

-- INSERT: allowed for all authenticated handlers (enforced via helper)
CREATE POLICY anon_access_log_insert ON "anon_report_access_logs"
    FOR INSERT
    WITH CHECK (true);

-- SELECT: SUPERADMIN only for investigation
CREATE POLICY anon_access_log_select_sa ON "anon_report_access_logs"
    FOR SELECT
    USING (current_setting('app.current_user_role', true) = 'SUPERADMIN');

-- Bypass for service layer
CREATE POLICY anon_access_log_bypass ON "anon_report_access_logs"
    FOR ALL
    USING (current_setting('app.bypass_rls', true) = 'true');

-- Deny UPDATE and DELETE explicitly
CREATE POLICY anon_access_log_no_update ON "anon_report_access_logs"
    FOR UPDATE USING (false);
CREATE POLICY anon_access_log_no_delete ON "anon_report_access_logs"
    FOR DELETE USING (false);

-- anon_report_config RLS
ALTER TABLE "anon_report_config" ENABLE ROW LEVEL SECURITY;

-- All operations: SUPERADMIN only
CREATE POLICY anon_config_all_sa ON "anon_report_config"
    FOR ALL
    USING (current_setting('app.current_user_role', true) = 'SUPERADMIN');

-- Bypass for service layer
CREATE POLICY anon_config_bypass ON "anon_report_config"
    FOR ALL
    USING (current_setting('app.bypass_rls', true) = 'true');

-- ============================================================
-- Step 6: REVOKE destructive grants (conditional — skip if role does not exist)
-- ============================================================

DO $$ BEGIN
    -- Prevent any role from deleting reports (only bypass+audit allowed)
    REVOKE DELETE ON "anon_reports" FROM app_runtime_role;
    -- Prevent any role from modifying audit log (immutable append-only)
    REVOKE UPDATE, DELETE ON "anon_report_access_logs" FROM app_runtime_role;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ============================================================
-- Step 7: Seed default keyword config
-- ============================================================

INSERT INTO "anon_report_config" ("id", "key", "value", "updatedById")
VALUES (
    'seed-severe-keywords',
    'severe_keywords',
    '["pelecehan","pelecehan seksual","seksual","ancaman","mengancam","senjata","pisau","bunuh diri","self-harm","menyakiti diri","kekerasan fisik","pukul","tendang","pemerkosaan","rudapaksa"]'::jsonb,
    '00000000-0000-0000-0000-000000000000'
);

INSERT INTO "anon_report_config" ("id", "key", "value", "updatedById")
VALUES (
    'seed-profanity-list',
    'profanity_list',
    '["anjing","babi","bangsat","goblok","tolol","idiot","bodoh","kampret","tai","kontol","memek","bajingan","keparat"]'::jsonb,
    '00000000-0000-0000-0000-000000000000'
);
