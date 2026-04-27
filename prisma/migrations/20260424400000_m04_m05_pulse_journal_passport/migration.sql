-- M04: Pulse Harian & Weekly Journal
-- M05: Passport Digital
-- Combined migration for M04 + M05 features

-- CreateEnum
CREATE TYPE "PassportEntryStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PassportQrSessionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "EvidenceScanStatus" AS ENUM ('PENDING', 'CLEAN', 'SUSPICIOUS', 'FAILED');

-- CreateEnum
CREATE TYPE "JournalStatus" AS ENUM ('SUBMITTED', 'LATE', 'MISSED');

-- CreateEnum
CREATE TYPE "RubrikScoreStatus" AS ENUM ('ACTIVE');

-- CreateEnum
CREATE TYPE "RedFlagStatus" AS ENUM ('ACTIVE', 'FOLLOWED_UP', 'ESCALATED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "FollowUpContactType" AS ENUM ('CHAT', 'CALL', 'IN_PERSON', 'OTHER');

-- AlterEnum M04 audit actions
ALTER TYPE "AuditAction" ADD VALUE 'PULSE_SUBMIT';
ALTER TYPE "AuditAction" ADD VALUE 'PULSE_SYNC_BULK';
ALTER TYPE "AuditAction" ADD VALUE 'JOURNAL_DRAFT_UPSERT';
ALTER TYPE "AuditAction" ADD VALUE 'JOURNAL_SUBMIT';
ALTER TYPE "AuditAction" ADD VALUE 'JOURNAL_AUTO_LOCK_MISSED';
ALTER TYPE "AuditAction" ADD VALUE 'RUBRIC_SCORE_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'RUBRIC_SCORE_NOTE_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'RED_FLAG_TRIGGER';
ALTER TYPE "AuditAction" ADD VALUE 'RED_FLAG_FOLLOW_UP';
ALTER TYPE "AuditAction" ADD VALUE 'RED_FLAG_ESCALATE';
ALTER TYPE "AuditAction" ADD VALUE 'DATA_RETENTION_PURGE';
ALTER TYPE "AuditAction" ADD VALUE 'JOURNAL_KP_ACCESS';

-- AlterEnum M05 audit actions
ALTER TYPE "AuditAction" ADD VALUE 'PASSPORT_SUBMIT';
ALTER TYPE "AuditAction" ADD VALUE 'PASSPORT_VERIFY_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'PASSPORT_VERIFY_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE 'PASSPORT_ENTRY_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE 'PASSPORT_ENTRY_ESCALATED';
ALTER TYPE "AuditAction" ADD VALUE 'PASSPORT_ENTRY_OVERRIDE';
ALTER TYPE "AuditAction" ADD VALUE 'PASSPORT_ENTRY_RESUBMIT';
ALTER TYPE "AuditAction" ADD VALUE 'PASSPORT_QR_SESSION_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'PASSPORT_QR_SESSION_REVOKE';
ALTER TYPE "AuditAction" ADD VALUE 'PASSPORT_QR_INVALID_ATTEMPT';
ALTER TYPE "AuditAction" ADD VALUE 'PASSPORT_PHOTO_ACCESS_BY_SC';
ALTER TYPE "AuditAction" ADD VALUE 'SKEM_EXPORT_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE 'PASSPORT_RETENTION_PURGE';

-- AlterTable: add SKEM fields to PassportItem
ALTER TABLE "passport_items" ADD COLUMN "skemCategory" TEXT;
ALTER TABLE "passport_items" ADD COLUMN "skemPoints" DOUBLE PRECISION;

-- CreateTable: pulse_checks (M04)
CREATE TABLE "pulse_checks" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "mood" INTEGER NOT NULL,
    "emoji" VARCHAR(8) NOT NULL,
    "comment" VARCHAR(100),
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "localDate" DATE NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientTempId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pulse_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: journal_drafts (M04)
CREATE TABLE "journal_drafts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "whatHappened" TEXT NOT NULL DEFAULT '',
    "soWhat" TEXT NOT NULL DEFAULT '',
    "nowWhat" TEXT NOT NULL DEFAULT '',
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "clientUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "journal_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: journals (M04)
CREATE TABLE "journals" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "whatHappened" TEXT NOT NULL,
    "soWhat" TEXT NOT NULL,
    "nowWhat" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "status" "JournalStatus" NOT NULL DEFAULT 'SUBMITTED',
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "weekStartDate" DATE NOT NULL,
    "weekEndDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "journals_pkey" PRIMARY KEY ("id")
);

-- CreateTable: rubrik_scores (M04)
CREATE TABLE "rubrik_scores" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subjectUserId" TEXT NOT NULL,
    "scoredByUserId" TEXT NOT NULL,
    "rubrikKey" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "rubrikVersionId" TEXT,
    "context" JSONB NOT NULL,
    "contextKey" TEXT NOT NULL,
    "comment" TEXT,
    "commentUpdatedAt" TIMESTAMP(3),
    "status" "RubrikScoreStatus" NOT NULL DEFAULT 'ACTIVE',
    "scoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cohortId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rubrik_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable: red_flag_events (M04)
CREATE TABLE "red_flag_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subjectUserId" TEXT NOT NULL,
    "kpGroupId" TEXT,
    "notifiedUserId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "triggerPulseId" TEXT NOT NULL,
    "pulseSnapshot" JSONB NOT NULL,
    "status" "RedFlagStatus" NOT NULL DEFAULT 'ACTIVE',
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followedUpAt" TIMESTAMP(3),
    "followedUpById" TEXT,
    "escalatedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "red_flag_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable: follow_up_records (M04)
CREATE TABLE "follow_up_records" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "redFlagEventId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "subjectUserId" TEXT NOT NULL,
    "contactType" "FollowUpContactType" NOT NULL,
    "summary" TEXT NOT NULL,
    "nextAction" TEXT,
    "followedUpAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "follow_up_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable: passport_entries (M05)
CREATE TABLE "passport_entries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "evidenceType" "EvidenceType" NOT NULL,
    "evidenceUrl" TEXT,
    "status" "PassportEntryStatus" NOT NULL DEFAULT 'PENDING',
    "clientIdempotencyKey" TEXT,
    "previousEntryId" TEXT,
    "verifierId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifierNote" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "cancelledReason" TEXT,
    "escalatedAt" TIMESTAMP(3),
    "escalatedToUserId" TEXT,
    "overriddenByUserId" TEXT,
    "overriddenReason" TEXT,
    "qrSessionId" TEXT,
    "metadataJson" JSONB,
    CONSTRAINT "passport_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable: passport_evidence_uploads (M05)
CREATE TABLE "passport_evidence_uploads" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "s3Bucket" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "realMimeType" TEXT,
    "sizeBytes" INTEGER NOT NULL,
    "scanStatus" "EvidenceScanStatus" NOT NULL DEFAULT 'PENDING',
    "scanNote" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checksumSha256" TEXT,
    CONSTRAINT "passport_evidence_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable: passport_qr_sessions (M05)
CREATE TABLE "passport_qr_sessions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventLocation" TEXT,
    "status" "PassportQrSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "scanCount" INTEGER NOT NULL DEFAULT 0,
    "maxScans" INTEGER,
    CONSTRAINT "passport_qr_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: passport_skem_export_logs (M05)
CREATE TABLE "passport_skem_export_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "generatedByUserId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rowCount" INTEGER NOT NULL,
    "filterJson" JSONB NOT NULL,
    "csvChecksumSha256" TEXT NOT NULL,
    "downloadCount" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "passport_skem_export_logs_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- Indexes: M04
-- ============================================================
CREATE UNIQUE INDEX "pulse_checks_userId_localDate_key" ON "pulse_checks"("userId", "localDate");
CREATE INDEX "pulse_checks_organizationId_cohortId_localDate_idx" ON "pulse_checks"("organizationId", "cohortId", "localDate");
CREATE INDEX "pulse_checks_userId_recordedAt_idx" ON "pulse_checks"("userId", "recordedAt" DESC);
CREATE INDEX "pulse_checks_organizationId_localDate_idx" ON "pulse_checks"("organizationId", "localDate");

CREATE UNIQUE INDEX "journal_drafts_userId_cohortId_weekNumber_key" ON "journal_drafts"("userId", "cohortId", "weekNumber");
CREATE INDEX "journal_drafts_organizationId_cohortId_weekNumber_idx" ON "journal_drafts"("organizationId", "cohortId", "weekNumber");

CREATE UNIQUE INDEX "journals_userId_cohortId_weekNumber_key" ON "journals"("userId", "cohortId", "weekNumber");
CREATE INDEX "journals_organizationId_cohortId_weekNumber_status_idx" ON "journals"("organizationId", "cohortId", "weekNumber", "status");
CREATE INDEX "journals_organizationId_cohortId_submittedAt_idx" ON "journals"("organizationId", "cohortId", "submittedAt" DESC);
CREATE INDEX "journals_userId_weekNumber_idx" ON "journals"("userId", "weekNumber");

CREATE UNIQUE INDEX "rubrik_scores_subjectUserId_contextKey_key" ON "rubrik_scores"("subjectUserId", "contextKey");
CREATE INDEX "rubrik_scores_organizationId_rubrikKey_scoredAt_idx" ON "rubrik_scores"("organizationId", "rubrikKey", "scoredAt" DESC);
CREATE INDEX "rubrik_scores_subjectUserId_rubrikKey_scoredAt_idx" ON "rubrik_scores"("subjectUserId", "rubrikKey", "scoredAt" DESC);
CREATE INDEX "rubrik_scores_scoredByUserId_rubrikKey_scoredAt_idx" ON "rubrik_scores"("scoredByUserId", "rubrikKey", "scoredAt" DESC);
CREATE INDEX "rubrik_scores_organizationId_cohortId_rubrikKey_idx" ON "rubrik_scores"("organizationId", "cohortId", "rubrikKey");

CREATE INDEX "red_flag_events_organizationId_cohortId_status_triggeredAt_idx" ON "red_flag_events"("organizationId", "cohortId", "status", "triggeredAt" DESC);
CREATE INDEX "red_flag_events_notifiedUserId_status_idx" ON "red_flag_events"("notifiedUserId", "status");
CREATE INDEX "red_flag_events_subjectUserId_triggeredAt_idx" ON "red_flag_events"("subjectUserId", "triggeredAt" DESC);
CREATE INDEX "red_flag_events_triggeredAt_idx" ON "red_flag_events"("triggeredAt");

CREATE INDEX "follow_up_records_redFlagEventId_followedUpAt_idx" ON "follow_up_records"("redFlagEventId", "followedUpAt" DESC);
CREATE INDEX "follow_up_records_organizationId_followedUpAt_idx" ON "follow_up_records"("organizationId", "followedUpAt" DESC);
CREATE INDEX "follow_up_records_actorUserId_followedUpAt_idx" ON "follow_up_records"("actorUserId", "followedUpAt" DESC);

-- ============================================================
-- Indexes: M05
-- ============================================================
CREATE UNIQUE INDEX "passport_entries_clientIdempotencyKey_key" ON "passport_entries"("clientIdempotencyKey");
CREATE INDEX "passport_entries_userId_itemId_status_idx" ON "passport_entries"("userId", "itemId", "status");
CREATE INDEX "passport_entries_verifierId_status_idx" ON "passport_entries"("verifierId", "status");
CREATE INDEX "passport_entries_organizationId_cohortId_status_idx" ON "passport_entries"("organizationId", "cohortId", "status");
CREATE INDEX "passport_entries_status_submittedAt_desc_idx" ON "passport_entries"("status", "submittedAt" DESC);
CREATE INDEX "passport_entries_status_submittedAt_asc_idx" ON "passport_entries"("status", "submittedAt");
CREATE INDEX "passport_entries_escalatedToUserId_status_idx" ON "passport_entries"("escalatedToUserId", "status");
CREATE INDEX "passport_entries_verifier_status_submittedAt_idx" ON "passport_entries"("verifierId", "status", "submittedAt" DESC);

-- Partial unique index: prevent double PENDING per (userId, itemId)
CREATE UNIQUE INDEX "passport_entry_unique_pending"
  ON "passport_entries" ("userId", "itemId")
  WHERE status = 'PENDING';

CREATE UNIQUE INDEX "passport_evidence_uploads_s3Key_key" ON "passport_evidence_uploads"("s3Key");
CREATE INDEX "passport_evidence_uploads_entryId_idx" ON "passport_evidence_uploads"("entryId");
CREATE INDEX "passport_evidence_uploads_organizationId_idx" ON "passport_evidence_uploads"("organizationId");
CREATE INDEX "passport_evidence_uploads_scanStatus_uploadedAt_idx" ON "passport_evidence_uploads"("scanStatus", "uploadedAt");
CREATE INDEX "passport_evidence_uploads_checksumSha256_idx" ON "passport_evidence_uploads"("checksumSha256");

CREATE INDEX "passport_qr_sessions_organizationId_cohortId_status_idx" ON "passport_qr_sessions"("organizationId", "cohortId", "status");
CREATE INDEX "passport_qr_sessions_itemId_status_idx" ON "passport_qr_sessions"("itemId", "status");
CREATE INDEX "passport_qr_sessions_expiresAt_status_idx" ON "passport_qr_sessions"("expiresAt", "status");
CREATE INDEX "passport_qr_sessions_createdByUserId_idx" ON "passport_qr_sessions"("createdByUserId");

CREATE INDEX "passport_skem_export_logs_organizationId_cohortId_generated_idx" ON "passport_skem_export_logs"("organizationId", "cohortId", "generatedAt" DESC);

-- ============================================================
-- Enable RLS on M05 tables
-- ============================================================
ALTER TABLE "passport_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "passport_evidence_uploads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "passport_qr_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "passport_skem_export_logs" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies (M05)
-- ============================================================
CREATE POLICY passport_entry_org_isolation ON "passport_entries"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR current_setting('app.bypass_rls', true) = 'true'
    OR "userId" = NULLIF(current_setting('app.current_user_id', true), '')::text
    OR "verifierId" = NULLIF(current_setting('app.current_user_id', true), '')::text
    OR "escalatedToUserId" = NULLIF(current_setting('app.current_user_id', true), '')::text
  );

CREATE POLICY passport_evidence_upload_org_isolation ON "passport_evidence_uploads"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR current_setting('app.bypass_rls', true) = 'true'
  );

CREATE POLICY passport_qr_session_org_isolation ON "passport_qr_sessions"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR current_setting('app.bypass_rls', true) = 'true'
  );

CREATE POLICY passport_skem_export_log_org_isolation ON "passport_skem_export_logs"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- ============================================================
-- Foreign Keys: M04
-- ============================================================
ALTER TABLE "pulse_checks" ADD CONSTRAINT "pulse_checks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pulse_checks" ADD CONSTRAINT "pulse_checks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pulse_checks" ADD CONSTRAINT "pulse_checks_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "journal_drafts" ADD CONSTRAINT "journal_drafts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "journal_drafts" ADD CONSTRAINT "journal_drafts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "journal_drafts" ADD CONSTRAINT "journal_drafts_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "journals" ADD CONSTRAINT "journals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "journals" ADD CONSTRAINT "journals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "journals" ADD CONSTRAINT "journals_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "rubrik_scores" ADD CONSTRAINT "rubrik_scores_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rubrik_scores" ADD CONSTRAINT "rubrik_scores_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rubrik_scores" ADD CONSTRAINT "rubrik_scores_scoredByUserId_fkey" FOREIGN KEY ("scoredByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rubrik_scores" ADD CONSTRAINT "rubrik_scores_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "red_flag_events" ADD CONSTRAINT "red_flag_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "red_flag_events" ADD CONSTRAINT "red_flag_events_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "red_flag_events" ADD CONSTRAINT "red_flag_events_notifiedUserId_fkey" FOREIGN KEY ("notifiedUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "red_flag_events" ADD CONSTRAINT "red_flag_events_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "red_flag_events" ADD CONSTRAINT "red_flag_events_triggerPulseId_fkey" FOREIGN KEY ("triggerPulseId") REFERENCES "pulse_checks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "follow_up_records" ADD CONSTRAINT "follow_up_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "follow_up_records" ADD CONSTRAINT "follow_up_records_redFlagEventId_fkey" FOREIGN KEY ("redFlagEventId") REFERENCES "red_flag_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "follow_up_records" ADD CONSTRAINT "follow_up_records_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "follow_up_records" ADD CONSTRAINT "follow_up_records_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- Foreign Keys: M05
-- ============================================================
ALTER TABLE "passport_entries" ADD CONSTRAINT "passport_entries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "passport_entries" ADD CONSTRAINT "passport_entries_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "passport_entries" ADD CONSTRAINT "passport_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "passport_entries" ADD CONSTRAINT "passport_entries_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "passport_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "passport_entries" ADD CONSTRAINT "passport_entries_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "passport_entries" ADD CONSTRAINT "passport_entries_previousEntryId_fkey" FOREIGN KEY ("previousEntryId") REFERENCES "passport_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "passport_entries" ADD CONSTRAINT "passport_entries_escalatedToUserId_fkey" FOREIGN KEY ("escalatedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "passport_entries" ADD CONSTRAINT "passport_entries_overriddenByUserId_fkey" FOREIGN KEY ("overriddenByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "passport_entries" ADD CONSTRAINT "passport_entries_qrSessionId_fkey" FOREIGN KEY ("qrSessionId") REFERENCES "passport_qr_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "passport_evidence_uploads" ADD CONSTRAINT "passport_evidence_uploads_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "passport_evidence_uploads" ADD CONSTRAINT "passport_evidence_uploads_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "passport_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "passport_qr_sessions" ADD CONSTRAINT "passport_qr_sessions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "passport_qr_sessions" ADD CONSTRAINT "passport_qr_sessions_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "passport_qr_sessions" ADD CONSTRAINT "passport_qr_sessions_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "passport_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "passport_qr_sessions" ADD CONSTRAINT "passport_qr_sessions_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "passport_skem_export_logs" ADD CONSTRAINT "passport_skem_export_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "passport_skem_export_logs" ADD CONSTRAINT "passport_skem_export_logs_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "passport_skem_export_logs" ADD CONSTRAINT "passport_skem_export_logs_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Unique constraint added by M04 (foundation migration already created this with WHERE clause; skip if exists)
CREATE UNIQUE INDEX IF NOT EXISTS "users_organizationId_nrp_key" ON "users"("organizationId", "nrp");
