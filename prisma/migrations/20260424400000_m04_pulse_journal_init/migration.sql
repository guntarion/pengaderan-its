-- Migration: M04 Pulse Harian & Weekly Journal
-- Phase A: Schema + Enums + RLS + Indexes

-- ============================================
-- 1. Add new AuditAction enum values (M04)
-- ============================================
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PULSE_SUBMIT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PULSE_SYNC_BULK';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'JOURNAL_DRAFT_UPSERT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'JOURNAL_SUBMIT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'JOURNAL_AUTO_LOCK_MISSED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'RUBRIC_SCORE_CREATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'RUBRIC_SCORE_NOTE_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'RED_FLAG_TRIGGER';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'RED_FLAG_FOLLOW_UP';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'RED_FLAG_ESCALATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DATA_RETENTION_PURGE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'JOURNAL_KP_ACCESS';

-- ============================================
-- 2. Create new enums for M04
-- ============================================

CREATE TYPE "JournalStatus" AS ENUM (
  'SUBMITTED',
  'LATE',
  'MISSED'
);

CREATE TYPE "RubrikScoreStatus" AS ENUM (
  'ACTIVE'
);

CREATE TYPE "RedFlagStatus" AS ENUM (
  'ACTIVE',
  'FOLLOWED_UP',
  'ESCALATED',
  'RESOLVED'
);

CREATE TYPE "FollowUpContactType" AS ENUM (
  'CHAT',
  'CALL',
  'IN_PERSON',
  'OTHER'
);

-- ============================================
-- 3. Create PulseCheck table
-- ============================================

CREATE TABLE "pulse_checks" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "cohortId"       TEXT NOT NULL,
  "mood"           INTEGER NOT NULL,
  "emoji"          VARCHAR(8) NOT NULL,
  "comment"        VARCHAR(100),
  "recordedAt"     TIMESTAMP(3) NOT NULL,
  "localDate"      DATE NOT NULL,
  "syncedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "clientTempId"   TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "pulse_checks_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 4. Create JournalDraft table
-- ============================================

CREATE TABLE "journal_drafts" (
  "id"              TEXT NOT NULL,
  "organizationId"  TEXT NOT NULL,
  "userId"          TEXT NOT NULL,
  "cohortId"        TEXT NOT NULL,
  "weekNumber"      INTEGER NOT NULL,
  "whatHappened"    TEXT NOT NULL DEFAULT '',
  "soWhat"          TEXT NOT NULL DEFAULT '',
  "nowWhat"         TEXT NOT NULL DEFAULT '',
  "wordCount"       INTEGER NOT NULL DEFAULT 0,
  "clientUpdatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "journal_drafts_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 5. Create Journal table
-- ============================================

CREATE TABLE "journals" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "cohortId"       TEXT NOT NULL,
  "weekNumber"     INTEGER NOT NULL,
  "whatHappened"   TEXT NOT NULL,
  "soWhat"         TEXT NOT NULL,
  "nowWhat"        TEXT NOT NULL,
  "wordCount"      INTEGER NOT NULL,
  "status"         "JournalStatus" NOT NULL DEFAULT 'SUBMITTED',
  "isLate"         BOOLEAN NOT NULL DEFAULT false,
  "submittedAt"    TIMESTAMP(3) NOT NULL,
  "weekStartDate"  DATE NOT NULL,
  "weekEndDate"    DATE NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "journals_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 6. Create RubrikScore table
-- ============================================

CREATE TABLE "rubrik_scores" (
  "id"               TEXT NOT NULL,
  "organizationId"   TEXT NOT NULL,
  "subjectUserId"    TEXT NOT NULL,
  "scoredByUserId"   TEXT NOT NULL,
  "rubrikKey"        TEXT NOT NULL,
  "level"            INTEGER NOT NULL,
  "rubrikVersionId"  TEXT,
  "context"          JSONB NOT NULL,
  "contextKey"       TEXT NOT NULL,
  "comment"          TEXT,
  "commentUpdatedAt" TIMESTAMP(3),
  "status"           "RubrikScoreStatus" NOT NULL DEFAULT 'ACTIVE',
  "scoredAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cohortId"         TEXT NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "rubrik_scores_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 7. Create RedFlagEvent table
-- ============================================

CREATE TABLE "red_flag_events" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "subjectUserId"  TEXT NOT NULL,
  "kpGroupId"      TEXT,
  "notifiedUserId" TEXT NOT NULL,
  "cohortId"       TEXT NOT NULL,
  "triggerPulseId" TEXT NOT NULL,
  "pulseSnapshot"  JSONB NOT NULL,
  "status"         "RedFlagStatus" NOT NULL DEFAULT 'ACTIVE',
  "triggeredAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "followedUpAt"   TIMESTAMP(3),
  "followedUpById" TEXT,
  "escalatedAt"    TIMESTAMP(3),
  "resolvedAt"     TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "red_flag_events_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 8. Create FollowUpRecord table
-- ============================================

CREATE TABLE "follow_up_records" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "redFlagEventId" TEXT NOT NULL,
  "actorUserId"    TEXT NOT NULL,
  "subjectUserId"  TEXT NOT NULL,
  "contactType"    "FollowUpContactType" NOT NULL,
  "summary"        TEXT NOT NULL,
  "nextAction"     TEXT,
  "followedUpAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "follow_up_records_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 9. Add unique constraints
-- ============================================

CREATE UNIQUE INDEX "pulse_checks_userId_localDate_key" ON "pulse_checks"("userId", "localDate");
CREATE UNIQUE INDEX "journal_drafts_userId_cohortId_weekNumber_key" ON "journal_drafts"("userId", "cohortId", "weekNumber");
CREATE UNIQUE INDEX "journals_userId_cohortId_weekNumber_key" ON "journals"("userId", "cohortId", "weekNumber");
CREATE UNIQUE INDEX "rubrik_scores_subjectUserId_contextKey_key" ON "rubrik_scores"("subjectUserId", "contextKey");

-- ============================================
-- 10. Add indexes
-- ============================================

-- PulseCheck indexes
CREATE INDEX "pulse_checks_organizationId_cohortId_localDate_idx" ON "pulse_checks"("organizationId", "cohortId", "localDate");
CREATE INDEX "pulse_checks_userId_recordedAt_idx" ON "pulse_checks"("userId", "recordedAt" DESC);
CREATE INDEX "pulse_checks_organizationId_localDate_idx" ON "pulse_checks"("organizationId", "localDate");

-- JournalDraft indexes
CREATE INDEX "journal_drafts_organizationId_cohortId_weekNumber_idx" ON "journal_drafts"("organizationId", "cohortId", "weekNumber");

-- Journal indexes
CREATE INDEX "journals_organizationId_cohortId_weekNumber_status_idx" ON "journals"("organizationId", "cohortId", "weekNumber", "status");
CREATE INDEX "journals_organizationId_cohortId_submittedAt_idx" ON "journals"("organizationId", "cohortId", "submittedAt" DESC);
CREATE INDEX "journals_userId_weekNumber_idx" ON "journals"("userId", "weekNumber");

-- RubrikScore indexes
CREATE INDEX "rubrik_scores_organizationId_rubrikKey_scoredAt_idx" ON "rubrik_scores"("organizationId", "rubrikKey", "scoredAt" DESC);
CREATE INDEX "rubrik_scores_subjectUserId_rubrikKey_scoredAt_idx" ON "rubrik_scores"("subjectUserId", "rubrikKey", "scoredAt" DESC);
CREATE INDEX "rubrik_scores_scoredByUserId_rubrikKey_scoredAt_idx" ON "rubrik_scores"("scoredByUserId", "rubrikKey", "scoredAt" DESC);
CREATE INDEX "rubrik_scores_organizationId_cohortId_rubrikKey_idx" ON "rubrik_scores"("organizationId", "cohortId", "rubrikKey");

-- RedFlagEvent indexes
CREATE INDEX "red_flag_events_orgId_cohortId_status_triggeredAt_idx" ON "red_flag_events"("organizationId", "cohortId", "status", "triggeredAt" DESC);
CREATE INDEX "red_flag_events_notifiedUserId_status_idx" ON "red_flag_events"("notifiedUserId", "status");
CREATE INDEX "red_flag_events_subjectUserId_triggeredAt_idx" ON "red_flag_events"("subjectUserId", "triggeredAt" DESC);
CREATE INDEX "red_flag_events_triggeredAt_idx" ON "red_flag_events"("triggeredAt");

-- FollowUpRecord indexes
CREATE INDEX "follow_up_records_redFlagEventId_followedUpAt_idx" ON "follow_up_records"("redFlagEventId", "followedUpAt" DESC);
CREATE INDEX "follow_up_records_organizationId_followedUpAt_idx" ON "follow_up_records"("organizationId", "followedUpAt" DESC);
CREATE INDEX "follow_up_records_actorUserId_followedUpAt_idx" ON "follow_up_records"("actorUserId", "followedUpAt" DESC);

-- ============================================
-- 11. Add foreign key constraints
-- ============================================

-- PulseCheck FKs
ALTER TABLE "pulse_checks" ADD CONSTRAINT "pulse_checks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pulse_checks" ADD CONSTRAINT "pulse_checks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pulse_checks" ADD CONSTRAINT "pulse_checks_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- JournalDraft FKs
ALTER TABLE "journal_drafts" ADD CONSTRAINT "journal_drafts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "journal_drafts" ADD CONSTRAINT "journal_drafts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "journal_drafts" ADD CONSTRAINT "journal_drafts_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Journal FKs
ALTER TABLE "journals" ADD CONSTRAINT "journals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "journals" ADD CONSTRAINT "journals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "journals" ADD CONSTRAINT "journals_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RubrikScore FKs
ALTER TABLE "rubrik_scores" ADD CONSTRAINT "rubrik_scores_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rubrik_scores" ADD CONSTRAINT "rubrik_scores_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rubrik_scores" ADD CONSTRAINT "rubrik_scores_scoredByUserId_fkey" FOREIGN KEY ("scoredByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rubrik_scores" ADD CONSTRAINT "rubrik_scores_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RedFlagEvent FKs
ALTER TABLE "red_flag_events" ADD CONSTRAINT "red_flag_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "red_flag_events" ADD CONSTRAINT "red_flag_events_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "red_flag_events" ADD CONSTRAINT "red_flag_events_notifiedUserId_fkey" FOREIGN KEY ("notifiedUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "red_flag_events" ADD CONSTRAINT "red_flag_events_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "red_flag_events" ADD CONSTRAINT "red_flag_events_triggerPulseId_fkey" FOREIGN KEY ("triggerPulseId") REFERENCES "pulse_checks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- FollowUpRecord FKs
ALTER TABLE "follow_up_records" ADD CONSTRAINT "follow_up_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "follow_up_records" ADD CONSTRAINT "follow_up_records_redFlagEventId_fkey" FOREIGN KEY ("redFlagEventId") REFERENCES "red_flag_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "follow_up_records" ADD CONSTRAINT "follow_up_records_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "follow_up_records" ADD CONSTRAINT "follow_up_records_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- 12. Enable Row Level Security (RLS)
-- ============================================

ALTER TABLE "pulse_checks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "journal_drafts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "journals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rubrik_scores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "red_flag_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "follow_up_records" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 13. Create RLS Policies
-- ============================================

-- PulseCheck: self-read + org-isolation + bypass
CREATE POLICY "pulse_access" ON "pulse_checks"
  FOR ALL USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
    OR "userId" = NULLIF(current_setting('app.current_user_id', true), '')
  );

-- JournalDraft: self-only + bypass
CREATE POLICY "journal_draft_self_only" ON "journal_drafts"
  FOR ALL USING (
    "userId" = NULLIF(current_setting('app.current_user_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- Journal: self + bypass for KP access via app layer
CREATE POLICY "journal_org_self" ON "journals"
  FOR ALL USING (
    ("organizationId" = NULLIF(current_setting('app.current_org_id', true), '')
     AND "userId" = NULLIF(current_setting('app.current_user_id', true), ''))
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- RubrikScore: org + self-read + scorer
CREATE POLICY "rubric_score_access" ON "rubrik_scores"
  FOR ALL USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
    OR "subjectUserId" = NULLIF(current_setting('app.current_user_id', true), '')
    OR "scoredByUserId" = NULLIF(current_setting('app.current_user_id', true), '')
  );

-- RedFlagEvent: org + subject self-read
CREATE POLICY "red_flag_access" ON "red_flag_events"
  FOR ALL USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
    OR "subjectUserId" = NULLIF(current_setting('app.current_user_id', true), '')
  );

-- FollowUpRecord: org-isolation
CREATE POLICY "follow_up_org" ON "follow_up_records"
  FOR ALL USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );
