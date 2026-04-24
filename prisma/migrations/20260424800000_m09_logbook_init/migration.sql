-- NAWASENA M09: KP & Kasuh Logbook
-- Migration: m09_logbook_init
-- Creates: KPLogDaily, KPLogWeekly, KasuhLog tables + enum + RLS + GIN index

-- ============================================
-- Step 1: Create enum KasuhLogAttendance
-- ============================================

CREATE TYPE "KasuhLogAttendance" AS ENUM ('MET', 'NOT_MET');

-- ============================================
-- Step 2: Add M09 AuditAction enum values
-- PostgreSQL requires one ALTER per value
-- ============================================

ALTER TYPE "AuditAction" ADD VALUE 'KP_LOG_DAILY_SUBMIT';
ALTER TYPE "AuditAction" ADD VALUE 'KP_LOG_DAILY_EDIT';
ALTER TYPE "AuditAction" ADD VALUE 'KP_LOG_WEEKLY_SUBMIT';
ALTER TYPE "AuditAction" ADD VALUE 'KP_LOG_WEEKLY_EDIT';
ALTER TYPE "AuditAction" ADD VALUE 'KASUH_LOG_SUBMIT';
ALTER TYPE "AuditAction" ADD VALUE 'KASUH_LOG_EDIT';
ALTER TYPE "AuditAction" ADD VALUE 'KASUH_PULSE_READ';
ALTER TYPE "AuditAction" ADD VALUE 'PEER_DEBRIEF_READ';
ALTER TYPE "AuditAction" ADD VALUE 'M09_LOGBOOK_ACCESS_BYPASS';
ALTER TYPE "AuditAction" ADD VALUE 'RED_FLAG_CASCADE_TRIGGERED';
ALTER TYPE "AuditAction" ADD VALUE 'RED_FLAG_CASCADE_FAILED';
ALTER TYPE "AuditAction" ADD VALUE 'RED_FLAG_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE 'M09_RETENTION_PURGE';
ALTER TYPE "AuditAction" ADD VALUE 'M09_PRECOMPUTE_WEEKLY';

-- ============================================
-- Step 3: Create KPLogDaily table
-- ============================================

CREATE TABLE "kp_log_daily" (
    "id"                 TEXT NOT NULL,
    "organizationId"     TEXT NOT NULL,
    "cohortId"           TEXT NOT NULL,
    "kpGroupId"          TEXT NOT NULL,
    "kpUserId"           TEXT NOT NULL,
    "date"               DATE NOT NULL,
    "moodAvg"            INTEGER NOT NULL,
    "suggestedMood"      DOUBLE PRECISION,
    "responderCount"     INTEGER,
    "totalMembers"       INTEGER,
    "redFlagsObserved"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "redFlagOther"       VARCHAR(100),
    "anecdoteShort"      TEXT,
    "cascadedIncidentId" TEXT,
    "recordedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt"           TIMESTAMP(3),
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kp_log_daily_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- Step 4: Create KPLogWeekly table
-- ============================================

CREATE TABLE "kp_log_weekly" (
    "id"               TEXT NOT NULL,
    "organizationId"   TEXT NOT NULL,
    "cohortId"         TEXT NOT NULL,
    "kpGroupId"        TEXT NOT NULL,
    "kpUserId"         TEXT NOT NULL,
    "weekNumber"       INTEGER NOT NULL,
    "yearNumber"       INTEGER NOT NULL,
    "weekStartDate"    DATE,
    "weekEndDate"      DATE,
    "whatWorked"       TEXT NOT NULL,
    "whatDidnt"        TEXT NOT NULL,
    "changesNeeded"    TEXT NOT NULL,
    "contextSnapshot"  JSONB,
    "avgMoodSnapshot"  DOUBLE PRECISION,
    "redFlagSummary"   JSONB,
    "dailyCount"       INTEGER,
    "submittedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt"         TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kp_log_weekly_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- Step 5: Create KasuhLog table
-- ============================================

CREATE TABLE "kasuh_log" (
    "id"               TEXT NOT NULL,
    "organizationId"   TEXT NOT NULL,
    "cohortId"         TEXT NOT NULL,
    "pairId"           TEXT NOT NULL,
    "kasuhUserId"      TEXT NOT NULL,
    "mabaUserId"       TEXT NOT NULL,
    "cycleNumber"      INTEGER NOT NULL,
    "cycleDueDate"     DATE,
    "attendance"       "KasuhLogAttendance" NOT NULL,
    "meetingDate"      DATE,
    "attendanceReason" VARCHAR(200),
    "reflection"       TEXT,
    "flagUrgent"       BOOLEAN NOT NULL DEFAULT false,
    "followupNotes"    TEXT,
    "submittedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt"         TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kasuh_log_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- Step 6: Unique constraints
-- ============================================

CREATE UNIQUE INDEX "kp_log_daily_kpUserId_date_key" ON "kp_log_daily"("kpUserId", "date");
CREATE UNIQUE INDEX "kp_log_weekly_kpUserId_weekNumber_yearNumber_key" ON "kp_log_weekly"("kpUserId", "weekNumber", "yearNumber");
CREATE UNIQUE INDEX "kasuh_log_pairId_cycleNumber_key" ON "kasuh_log"("pairId", "cycleNumber");

-- ============================================
-- Step 7: Regular indexes
-- ============================================

-- KPLogDaily indexes
CREATE INDEX "kp_log_daily_organizationId_cohortId_date_idx" ON "kp_log_daily"("organizationId", "cohortId", "date");
CREATE INDEX "kp_log_daily_kpGroupId_date_idx" ON "kp_log_daily"("kpGroupId", "date" DESC);
CREATE INDEX "kp_log_daily_kpUserId_date_idx" ON "kp_log_daily"("kpUserId", "date" DESC);

-- KPLogWeekly indexes
CREATE INDEX "kp_log_weekly_organizationId_cohortId_weekNumber_idx" ON "kp_log_weekly"("organizationId", "cohortId", "weekNumber");
CREATE INDEX "kp_log_weekly_kpUserId_weekNumber_idx" ON "kp_log_weekly"("kpUserId", "weekNumber" DESC);
CREATE INDEX "kp_log_weekly_cohortId_weekNumber_submittedAt_idx" ON "kp_log_weekly"("cohortId", "weekNumber", "submittedAt");

-- KasuhLog indexes
CREATE INDEX "kasuh_log_organizationId_cohortId_submittedAt_idx" ON "kasuh_log"("organizationId", "cohortId", "submittedAt" DESC);
CREATE INDEX "kasuh_log_kasuhUserId_submittedAt_idx" ON "kasuh_log"("kasuhUserId", "submittedAt" DESC);
CREATE INDEX "kasuh_log_mabaUserId_submittedAt_idx" ON "kasuh_log"("mabaUserId", "submittedAt" DESC);
CREATE INDEX "kasuh_log_cohortId_flagUrgent_submittedAt_idx" ON "kasuh_log"("cohortId", "flagUrgent", "submittedAt" DESC);

-- ============================================
-- Step 8: GIN index for red flags
-- ============================================

CREATE INDEX "kp_log_daily_redflags_gin_idx" ON "kp_log_daily" USING GIN ("redFlagsObserved");

-- ============================================
-- Step 9: Foreign key constraints
-- ============================================

-- KPLogDaily FKs
ALTER TABLE "kp_log_daily" ADD CONSTRAINT "kp_log_daily_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kp_log_daily" ADD CONSTRAINT "kp_log_daily_cohortId_fkey"
    FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kp_log_daily" ADD CONSTRAINT "kp_log_daily_kpGroupId_fkey"
    FOREIGN KEY ("kpGroupId") REFERENCES "kp_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kp_log_daily" ADD CONSTRAINT "kp_log_daily_kpUserId_fkey"
    FOREIGN KEY ("kpUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- KPLogWeekly FKs
ALTER TABLE "kp_log_weekly" ADD CONSTRAINT "kp_log_weekly_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kp_log_weekly" ADD CONSTRAINT "kp_log_weekly_cohortId_fkey"
    FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kp_log_weekly" ADD CONSTRAINT "kp_log_weekly_kpGroupId_fkey"
    FOREIGN KEY ("kpGroupId") REFERENCES "kp_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kp_log_weekly" ADD CONSTRAINT "kp_log_weekly_kpUserId_fkey"
    FOREIGN KEY ("kpUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- KasuhLog FKs
ALTER TABLE "kasuh_log" ADD CONSTRAINT "kasuh_log_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kasuh_log" ADD CONSTRAINT "kasuh_log_cohortId_fkey"
    FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kasuh_log" ADD CONSTRAINT "kasuh_log_pairId_fkey"
    FOREIGN KEY ("pairId") REFERENCES "kasuh_pairs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kasuh_log" ADD CONSTRAINT "kasuh_log_kasuhUserId_fkey"
    FOREIGN KEY ("kasuhUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kasuh_log" ADD CONSTRAINT "kasuh_log_mabaUserId_fkey"
    FOREIGN KEY ("mabaUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- Step 10: Enable Row Level Security (RLS)
-- ============================================

ALTER TABLE "kp_log_daily"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "kp_log_weekly" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "kasuh_log"     ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Step 11: RLS Policies
-- CRITICAL: kasuh_log policy MUST NOT include mabaUserId
-- Maba users cannot read KasuhLog entries about themselves
-- ============================================

-- KPLogDaily: org isolation + self (KP) + bypass
-- SC + peer read via app-layer bypass wrapper with audit
CREATE POLICY "kp_log_daily_access" ON "kp_log_daily"
    FOR ALL
    USING (
        "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
        AND (
            current_setting('app.bypass_rls', true) = 'true'
            OR "kpUserId" = NULLIF(current_setting('app.current_user_id', true), '')::text
        )
    );

-- KPLogWeekly: org isolation + self (KP) + bypass
-- Peer + SC via app-layer bypass with audit
CREATE POLICY "kp_log_weekly_access" ON "kp_log_weekly"
    FOR ALL
    USING (
        "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
        AND (
            current_setting('app.bypass_rls', true) = 'true'
            OR "kpUserId" = NULLIF(current_setting('app.current_user_id', true), '')::text
        )
    );

-- KasuhLog: org isolation + self (Kasuh) + bypass
-- MABA TIDAK BOLEH BACA (psychological safety) — mabaUserId NOT in policy USING
-- SC via app-layer bypass with audit
CREATE POLICY "kasuh_log_access" ON "kasuh_log"
    FOR ALL
    USING (
        "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
        AND (
            current_setting('app.bypass_rls', true) = 'true'
            OR "kasuhUserId" = NULLIF(current_setting('app.current_user_id', true), '')::text
            -- NOTE: mabaUserId is deliberately NOT included here
            -- This prevents Maba from reading logs about themselves
        )
    );
