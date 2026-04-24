-- M05: Passport Digital - Create enums, tables, indexes, RLS, FKs
-- This migration is applied on top of an existing database that has M01-M04 applied.

-- ============================================================
-- Create M05 Enums
-- ============================================================
CREATE TYPE "PassportEntryStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'CANCELLED');
CREATE TYPE "PassportQrSessionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');
CREATE TYPE "EvidenceScanStatus" AS ENUM ('PENDING', 'CLEAN', 'SUSPICIOUS', 'FAILED');

-- ============================================================
-- Extend AuditAction enum with M05 values
-- ============================================================
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

-- ============================================================
-- Add SKEM fields to PassportItem (M02 extension)
-- ============================================================
ALTER TABLE "passport_items" ADD COLUMN "skemCategory" TEXT;
ALTER TABLE "passport_items" ADD COLUMN "skemPoints" DOUBLE PRECISION;

-- ============================================================
-- CreateTable: passport_entries
-- ============================================================
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

-- ============================================================
-- CreateTable: passport_evidence_uploads
-- ============================================================
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

-- ============================================================
-- CreateTable: passport_qr_sessions
-- ============================================================
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

-- ============================================================
-- CreateTable: passport_skem_export_logs
-- ============================================================
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
-- Indexes: passport_entries
-- ============================================================
CREATE UNIQUE INDEX "passport_entries_clientIdempotencyKey_key" ON "passport_entries"("clientIdempotencyKey");
CREATE INDEX "passport_entries_userId_itemId_status_idx" ON "passport_entries"("userId", "itemId", "status");
CREATE INDEX "passport_entries_verifierId_status_idx" ON "passport_entries"("verifierId", "status");
CREATE INDEX "passport_entries_organizationId_cohortId_status_idx" ON "passport_entries"("organizationId", "cohortId", "status");
CREATE INDEX "passport_entries_status_submittedAt_desc_idx" ON "passport_entries"("status", "submittedAt" DESC);
CREATE INDEX "passport_entries_status_submittedAt_asc_idx" ON "passport_entries"("status", "submittedAt");
CREATE INDEX "passport_entries_escalatedToUserId_status_idx" ON "passport_entries"("escalatedToUserId", "status");
CREATE INDEX "passport_entries_verifier_status_submittedAt_idx" ON "passport_entries"("verifierId", "status", "submittedAt" DESC);

-- Partial unique index: 1 PENDING per (userId, itemId)
CREATE UNIQUE INDEX "passport_entry_unique_pending"
  ON "passport_entries" ("userId", "itemId")
  WHERE status = 'PENDING';

-- ============================================================
-- Indexes: passport_evidence_uploads
-- ============================================================
CREATE UNIQUE INDEX "passport_evidence_uploads_s3Key_key" ON "passport_evidence_uploads"("s3Key");
CREATE INDEX "passport_evidence_uploads_entryId_idx" ON "passport_evidence_uploads"("entryId");
CREATE INDEX "passport_evidence_uploads_organizationId_idx" ON "passport_evidence_uploads"("organizationId");
CREATE INDEX "passport_evidence_uploads_scanStatus_uploadedAt_idx" ON "passport_evidence_uploads"("scanStatus", "uploadedAt");
CREATE INDEX "passport_evidence_uploads_checksumSha256_idx" ON "passport_evidence_uploads"("checksumSha256");

-- ============================================================
-- Indexes: passport_qr_sessions
-- ============================================================
CREATE INDEX "passport_qr_sessions_organizationId_cohortId_status_idx" ON "passport_qr_sessions"("organizationId", "cohortId", "status");
CREATE INDEX "passport_qr_sessions_itemId_status_idx" ON "passport_qr_sessions"("itemId", "status");
CREATE INDEX "passport_qr_sessions_expiresAt_status_idx" ON "passport_qr_sessions"("expiresAt", "status");
CREATE INDEX "passport_qr_sessions_createdByUserId_idx" ON "passport_qr_sessions"("createdByUserId");

-- ============================================================
-- Indexes: passport_skem_export_logs
-- ============================================================
CREATE INDEX "passport_skem_export_logs_organizationId_cohortId_generated_idx" ON "passport_skem_export_logs"("organizationId", "cohortId", "generatedAt" DESC);

-- ============================================================
-- Enable RLS
-- ============================================================
ALTER TABLE "passport_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "passport_evidence_uploads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "passport_qr_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "passport_skem_export_logs" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies
-- ============================================================
CREATE POLICY passport_entry_org_isolation ON "passport_entries"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
    OR "userId" = NULLIF(current_setting('app.current_user_id', true), '')
    OR "verifierId" = NULLIF(current_setting('app.current_user_id', true), '')
    OR "escalatedToUserId" = NULLIF(current_setting('app.current_user_id', true), '')
  );

CREATE POLICY passport_evidence_upload_org_isolation ON "passport_evidence_uploads"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

CREATE POLICY passport_qr_session_org_isolation ON "passport_qr_sessions"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

CREATE POLICY passport_skem_export_log_org_isolation ON "passport_skem_export_logs"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- ============================================================
-- Foreign Keys: passport_entries
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

-- ============================================================
-- Foreign Keys: passport_evidence_uploads
-- ============================================================
ALTER TABLE "passport_evidence_uploads" ADD CONSTRAINT "passport_evidence_uploads_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "passport_evidence_uploads" ADD CONSTRAINT "passport_evidence_uploads_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "passport_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- Foreign Keys: passport_qr_sessions
-- ============================================================
ALTER TABLE "passport_qr_sessions" ADD CONSTRAINT "passport_qr_sessions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "passport_qr_sessions" ADD CONSTRAINT "passport_qr_sessions_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "passport_qr_sessions" ADD CONSTRAINT "passport_qr_sessions_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "passport_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "passport_qr_sessions" ADD CONSTRAINT "passport_qr_sessions_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- Foreign Keys: passport_skem_export_logs
-- ============================================================
ALTER TABLE "passport_skem_export_logs" ADD CONSTRAINT "passport_skem_export_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "passport_skem_export_logs" ADD CONSTRAINT "passport_skem_export_logs_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "passport_skem_export_logs" ADD CONSTRAINT "passport_skem_export_logs_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
