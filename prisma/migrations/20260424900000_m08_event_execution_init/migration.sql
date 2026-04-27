-- M08 Event Execution Init Migration
-- NAWASENA M08: Extends M06 KegiatanInstance + Attendance; creates 3 new tables
-- All changes are ADDITIVE — no DROP, no RENAME

-- ============================================================
-- 1. ADD ENUM VALUES to AuditAction (must be separate statements)
-- ============================================================

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KEGIATAN_INSTANCE_LIFECYCLE_REVERT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KEGIATAN_INSTANCE_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KEGIATAN_INSTANCE_RESCHEDULED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KEGIATAN_INSTANCE_CAPACITY_RAISED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KEGIATAN_INSTANCE_CAPACITY_OVERRIDE_SC';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ATTENDANCE_SCAN_SUCCESS';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ATTENDANCE_SCAN_INVALID_SIG';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ATTENDANCE_SCAN_LATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ATTENDANCE_SCAN_DEDUPED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ATTENDANCE_BULK_MARK';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ATTENDANCE_MANUAL_OVERRIDE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ATTENDANCE_AUTO_ALPA';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ATTENDANCE_SC_OVERRIDE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ATTENDANCE_SYNC_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KEGIATAN_QR_SESSION_CREATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KEGIATAN_QR_SESSION_REVOKE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'OUTPUT_UPLOAD_CREATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'OUTPUT_UPLOAD_DELETE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'OUTPUT_SCAN_QUARANTINE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KEGIATAN_EVALUATION_SUBMIT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KEGIATAN_EVALUATION_PREFILL_OVERRIDDEN';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KEGIATAN_EVALUATION_LATE_SUBMIT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KEGIATAN_EVALUATION_DELETE_BY_SC';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EVENT_CANCELLED_NOTIF_FAILED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DATA_RETENTION_PURGE_M08';

-- ============================================================
-- 2. NEW ENUMS for M08
-- ============================================================

CREATE TYPE "ScanMethod" AS ENUM ('QR', 'MANUAL', 'BULK', 'SC_OVERRIDE', 'SYSTEM_AUTO');
CREATE TYPE "OutputType" AS ENUM ('FILE', 'LINK', 'VIDEO', 'REPO');
CREATE TYPE "OutputScanStatus" AS ENUM ('PENDING', 'CLEAN', 'SUSPICIOUS', 'FAILED', 'NA');
CREATE TYPE "KegiatanQRSessionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- ============================================================
-- 3. EXTEND KegiatanInstance (additive — all nullable or with defaults)
-- ============================================================

ALTER TABLE "kegiatan_instances"
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "cancelledById" TEXT,
  ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT,
  ADD COLUMN IF NOT EXISTS "rescheduleCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastRescheduledAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "lastRescheduledById" TEXT,
  ADD COLUMN IF NOT EXISTS "cachedAggregateJson" JSONB,
  ADD COLUMN IF NOT EXISTS "notificationFailedCount" INTEGER NOT NULL DEFAULT 0;

-- FK constraints for M08 KegiatanInstance extensions
ALTER TABLE "kegiatan_instances"
  ADD CONSTRAINT "kegiatan_instances_cancelledById_fkey"
    FOREIGN KEY ("cancelledById") REFERENCES "users"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "kegiatan_instances_lastRescheduledById_fkey"
    FOREIGN KEY ("lastRescheduledById") REFERENCES "users"("id") ON DELETE SET NULL;

-- ============================================================
-- 4. EXTEND Attendance (additive — all nullable or with defaults)
-- ============================================================

ALTER TABLE "attendances"
  ADD COLUMN IF NOT EXISTS "notedById" TEXT,
  ADD COLUMN IF NOT EXISTS "scanMethod" "ScanMethod" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "scannedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "scanLocation" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "clientScanId" VARCHAR(36),
  ADD COLUMN IF NOT EXISTS "qrSessionId" TEXT,
  ADD COLUMN IF NOT EXISTS "isWalkin" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "verifierId" TEXT;

-- CHECK constraint for notes max 200 chars
ALTER TABLE "attendances"
  ADD CONSTRAINT "attendances_notes_max_200"
    CHECK (char_length("notes") <= 200);

-- FK constraints for M08 Attendance extensions
ALTER TABLE "attendances"
  ADD CONSTRAINT "attendances_notedById_fkey"
    FOREIGN KEY ("notedById") REFERENCES "users"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "attendances_verifierId_fkey"
    FOREIGN KEY ("verifierId") REFERENCES "users"("id") ON DELETE SET NULL;
-- qrSessionId FK added after KegiatanQRSession table is created below

-- ============================================================
-- 5. CREATE TABLE: kegiatan_qr_sessions
-- ============================================================

CREATE TABLE "kegiatan_qr_sessions" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organizationId"  TEXT NOT NULL,
  "instanceId"      TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "status"          "KegiatanQRSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expiresAt"       TIMESTAMPTZ NOT NULL,
  "revokedAt"       TIMESTAMPTZ,
  "revokedReason"   TEXT,
  "scanCount"       INTEGER NOT NULL DEFAULT 0,
  "shortCode"       VARCHAR(6) NOT NULL,

  CONSTRAINT "kegiatan_qr_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "kegiatan_qr_sessions_shortCode_key" UNIQUE ("shortCode"),
  CONSTRAINT "kegiatan_qr_sessions_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT,
  CONSTRAINT "kegiatan_qr_sessions_instanceId_fkey"
    FOREIGN KEY ("instanceId") REFERENCES "kegiatan_instances"("id") ON DELETE CASCADE,
  CONSTRAINT "kegiatan_qr_sessions_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE INDEX "kegiatan_qr_sessions_orgId_instanceId_status_idx"
  ON "kegiatan_qr_sessions" ("organizationId", "instanceId", "status");
CREATE INDEX "kegiatan_qr_sessions_expiresAt_status_idx"
  ON "kegiatan_qr_sessions" ("expiresAt", "status");
CREATE INDEX "kegiatan_qr_sessions_createdByUserId_idx"
  ON "kegiatan_qr_sessions" ("createdByUserId");

-- Now add FK from attendances.qrSessionId to kegiatan_qr_sessions
ALTER TABLE "attendances"
  ADD CONSTRAINT "attendances_qrSessionId_fkey"
    FOREIGN KEY ("qrSessionId") REFERENCES "kegiatan_qr_sessions"("id") ON DELETE SET NULL;

-- ============================================================
-- 6. CREATE TABLE: output_uploads
-- ============================================================

CREATE TABLE "output_uploads" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organizationId"   TEXT NOT NULL,
  "instanceId"       TEXT NOT NULL,
  "uploaderId"       TEXT NOT NULL,
  "type"             "OutputType" NOT NULL,
  "url"              TEXT NOT NULL,
  "s3Key"            VARCHAR(1000),
  "s3Bucket"         VARCHAR(200),
  "caption"          VARCHAR(200) NOT NULL,
  "originalFilename" VARCHAR(500),
  "mimeType"         VARCHAR(200),
  "realMimeType"     VARCHAR(200),
  "sizeBytes"        INTEGER,
  "scanStatus"       "OutputScanStatus" NOT NULL DEFAULT 'NA',
  "scanNote"         TEXT,
  "checksumSha256"   VARCHAR(64),
  "uploadedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "output_uploads_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "output_uploads_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT,
  CONSTRAINT "output_uploads_instanceId_fkey"
    FOREIGN KEY ("instanceId") REFERENCES "kegiatan_instances"("id") ON DELETE CASCADE,
  CONSTRAINT "output_uploads_uploaderId_fkey"
    FOREIGN KEY ("uploaderId") REFERENCES "users"("id") ON DELETE RESTRICT,
  -- CHECK: FILE must have s3Key + mimeType; non-FILE must not have s3Key
  CONSTRAINT "output_uploads_type_s3_check"
    CHECK (
      (type = 'FILE' AND "s3Key" IS NOT NULL AND "mimeType" IS NOT NULL)
      OR (type IN ('LINK', 'VIDEO', 'REPO') AND "s3Key" IS NULL)
    ),
  -- CHECK: caption max 200 chars
  CONSTRAINT "output_uploads_caption_max_200"
    CHECK (char_length("caption") <= 200),
  -- CHECK: file size max 50MB (52428800 bytes)
  CONSTRAINT "output_uploads_size_max_50mb"
    CHECK ("sizeBytes" IS NULL OR "sizeBytes" <= 52428800)
);

CREATE INDEX "output_uploads_instanceId_uploadedAt_idx"
  ON "output_uploads" ("instanceId", "uploadedAt" DESC);
CREATE INDEX "output_uploads_orgId_instanceId_idx"
  ON "output_uploads" ("organizationId", "instanceId");
CREATE INDEX "output_uploads_uploaderId_idx"
  ON "output_uploads" ("uploaderId");
CREATE INDEX "output_uploads_scanStatus_uploadedAt_idx"
  ON "output_uploads" ("scanStatus", "uploadedAt");

-- ============================================================
-- 7. CREATE TABLE: kegiatan_evaluations
-- ============================================================

CREATE TABLE "kegiatan_evaluations" (
  "id"                              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organizationId"                  TEXT NOT NULL,
  "instanceId"                      TEXT NOT NULL,
  "filledById"                      TEXT NOT NULL,
  "attendancePct"                   DOUBLE PRECISION,
  "attendancePctOverride"           DOUBLE PRECISION,
  "attendancePctOverrideReason"     TEXT,
  "npsScore"                        DOUBLE PRECISION,
  "npsScoreOverride"                DOUBLE PRECISION,
  "npsScoreOverrideReason"          TEXT,
  "npsResponseCount"                INTEGER,
  "redFlagsCount"                   INTEGER,
  "scoreL2agg"                      DOUBLE PRECISION,
  "notes"                           TEXT,
  "filledAt"                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "submittedLate"                   BOOLEAN NOT NULL DEFAULT false,
  "createdAt"                       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"                       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "kegiatan_evaluations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "kegiatan_evaluations_instanceId_key" UNIQUE ("instanceId"),
  CONSTRAINT "kegiatan_evaluations_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT,
  CONSTRAINT "kegiatan_evaluations_instanceId_fkey"
    FOREIGN KEY ("instanceId") REFERENCES "kegiatan_instances"("id") ON DELETE CASCADE,
  CONSTRAINT "kegiatan_evaluations_filledById_fkey"
    FOREIGN KEY ("filledById") REFERENCES "users"("id") ON DELETE RESTRICT,
  -- Range checks
  CONSTRAINT "kegiatan_evaluations_attendancePct_range"
    CHECK ("attendancePct" IS NULL OR ("attendancePct" >= 0 AND "attendancePct" <= 1)),
  CONSTRAINT "kegiatan_evaluations_npsScore_range"
    CHECK ("npsScore" IS NULL OR ("npsScore" >= 0 AND "npsScore" <= 10)),
  CONSTRAINT "kegiatan_evaluations_scoreL2agg_range"
    CHECK ("scoreL2agg" IS NULL OR ("scoreL2agg" >= 0 AND "scoreL2agg" <= 100)),
  CONSTRAINT "kegiatan_evaluations_redFlagsCount_nonneg"
    CHECK ("redFlagsCount" IS NULL OR "redFlagsCount" >= 0)
);

CREATE INDEX "kegiatan_evaluations_orgId_filledAt_idx"
  ON "kegiatan_evaluations" ("organizationId", "filledAt" DESC);
CREATE INDEX "kegiatan_evaluations_filledById_filledAt_idx"
  ON "kegiatan_evaluations" ("filledById", "filledAt" DESC);
CREATE INDEX "kegiatan_evaluations_orgId_redFlagsCount_idx"
  ON "kegiatan_evaluations" ("organizationId", "redFlagsCount");

-- ============================================================
-- 8. PARTIAL UNIQUE INDEX — Attendance clientScanId (multiple NULL allowed)
-- ============================================================

CREATE UNIQUE INDEX "attendances_client_scan_unique"
  ON "attendances" ("clientScanId")
  WHERE "clientScanId" IS NOT NULL;

-- ============================================================
-- 9. ROW LEVEL SECURITY — 3 new tables
-- ============================================================

ALTER TABLE "output_uploads" ENABLE ROW LEVEL SECURITY;
CREATE POLICY output_upload_org_isolation ON "output_uploads"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR "uploaderId" = NULLIF(current_setting('app.current_user_id', true), '')::text
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE "kegiatan_evaluations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY kegiatan_evaluation_org_isolation ON "kegiatan_evaluations"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR "filledById" = NULLIF(current_setting('app.current_user_id', true), '')::text
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE "kegiatan_qr_sessions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY kegiatan_qr_session_org_isolation ON "kegiatan_qr_sessions"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR current_setting('app.bypass_rls', true) = 'true'
  );
