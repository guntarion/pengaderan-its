-- NAWASENA Foundation Migration (M01)
-- Transforms template schema to NAWASENA multi-tenant schema.
-- Executed in correct dependency order: enums → orgs → users alter → other tables → RLS.

-- ============================================
-- Step 1: Drop old enums (no longer needed)
-- ============================================

-- Drop old template Role enum (referenced by users.role, will be replaced)
-- First drop the column, then the enum
ALTER TABLE "users" DROP COLUMN IF EXISTS "role";
ALTER TABLE "users" DROP COLUMN IF EXISTS "gender";
ALTER TABLE "users" DROP COLUMN IF EXISTS "namaPanggilan";
ALTER TABLE "users" DROP COLUMN IF EXISTS "name";
ALTER TABLE "users" DROP COLUMN IF EXISTS "nomerHandphone";
ALTER TABLE "users" DROP COLUMN IF EXISTS "resetToken";
ALTER TABLE "users" DROP COLUMN IF EXISTS "resetTokenExpiry";
ALTER TABLE "users" DROP COLUMN IF EXISTS "tanggalLahir";

DROP TYPE IF EXISTS "Role";
DROP TYPE IF EXISTS "Gender";

-- Drop old AuditLog table (replaced by nawasena_audit_logs)
DROP TABLE IF EXISTS "audit_logs";

-- ============================================
-- Step 2: Create new NAWASENA enums
-- ============================================

CREATE TYPE "UserRole" AS ENUM ('MABA', 'KP', 'KASUH', 'OC', 'ELDER', 'SC', 'PEMBINA', 'BLM', 'SATGAS', 'ALUMNI', 'DOSEN_WALI', 'SUPERADMIN');

CREATE TYPE "UserStatus" AS ENUM ('PENDING_PROFILE_SETUP', 'PENDING_PAKTA', 'PENDING_RESIGN', 'ACTIVE', 'DEACTIVATED');

CREATE TYPE "UserPaktaStatus" AS ENUM ('PENDING', 'SIGNED', 'REJECTED', 'PENDING_RESIGN');

CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'PENDING_SETUP');

CREATE TYPE "CohortStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

CREATE TYPE "PaktaType" AS ENUM ('PAKTA_PANITIA', 'SOCIAL_CONTRACT_MABA', 'PAKTA_PENGADER_2027');

CREATE TYPE "PaktaVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED');

CREATE TYPE "PaktaSignatureStatus" AS ENUM ('ACTIVE', 'SUPERSEDED');

CREATE TYPE "AuditAction" AS ENUM (
  'USER_CREATE', 'USER_UPDATE', 'USER_DEACTIVATE', 'USER_ROLE_CHANGE', 'USER_BULK_IMPORT',
  'USER_EMERGENCY_CONTACT_ACCESSED',
  'ORG_CREATE', 'ORG_UPDATE', 'ORG_ARCHIVE',
  'COHORT_CREATE', 'COHORT_UPDATE', 'COHORT_ARCHIVE',
  'PAKTA_VERSION_PUBLISH', 'PAKTA_SIGN', 'PAKTA_REJECT', 'PAKTA_RESIGN_TRIGGER',
  'WHITELIST_ADD', 'WHITELIST_REMOVE',
  'LOGIN', 'LOGOUT', 'SESSION_REVOKE',
  'SUPERADMIN_CROSS_ORG_ACCESS', 'FULL_DELETE_USER', 'EMERGENCY_BULK_SIGN'
);

CREATE TYPE "DemographicField" AS ENUM ('IS_RANTAU', 'IS_KIP', 'HAS_DISABILITY', 'PROVINCE', 'EMERGENCY_CONTACT');

CREATE TYPE "AiOperationType" AS ENUM (
  'chat_message', 'text_generate', 'text_improve', 'text_summarize', 'text_translate',
  'content_analyze', 'sentiment_analyze', 'data_extract', 'vision_analyze',
  'web_search', 'web_search_pro'
);

-- ============================================
-- Step 3: Create Organization table (needed before User FK)
-- ============================================

CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "facultyCode" TEXT,
    "contactEmail" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");
CREATE INDEX "organizations_status_idx" ON "organizations"("status");

-- ============================================
-- Step 4: Alter User table to NAWASENA shape
-- ============================================

-- Add new columns to users (organizationId is NOT NULL but we need a default for existing rows)
-- We'll add a placeholder org first, then update, then add FK constraint.
-- Insert a temporary org for migration only
INSERT INTO "organizations" ("id", "code", "name", "fullName", "status", "updatedAt")
VALUES ('00000000-0000-0000-0000-000000000001', 'HMTC', 'Himpunan Mahasiswa Teknik Computer-Talk ITS', 'Himpunan Mahasiswa Teknik Computer-Talk ITS', 'ACTIVE', CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

ALTER TABLE "users"
    ADD COLUMN "fullName" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "displayName" TEXT,
    ADD COLUMN "nrp" TEXT,
    ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    ADD COLUMN "currentCohortId" TEXT,
    ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'MABA',
    ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'PENDING_PROFILE_SETUP',
    ADD COLUMN "isRantau" BOOLEAN,
    ADD COLUMN "isKIP" BOOLEAN,
    ADD COLUMN "hasDisability" BOOLEAN,
    ADD COLUMN "disabilityNotes" TEXT,
    ADD COLUMN "province" TEXT,
    ADD COLUMN "emergencyContactName" TEXT,
    ADD COLUMN "emergencyContactRelation" TEXT,
    ADD COLUMN "emergencyContactPhone" TEXT,
    ADD COLUMN "demographicsUpdatedAt" TIMESTAMP(3),
    ADD COLUMN "paktaPanitiaStatus" "UserPaktaStatus",
    ADD COLUMN "socialContractStatus" "UserPaktaStatus",
    ADD COLUMN "paktaPengader2027Status" "UserPaktaStatus",
    ADD COLUMN "deactivatedAt" TIMESTAMP(3),
    ADD COLUMN "deactivatedReason" TEXT,
    ADD COLUMN "lastLoginAt" TIMESTAMP(3),
    ADD COLUMN "lastLoginIp" TEXT,
    ADD COLUMN "sessionEpoch" INTEGER NOT NULL DEFAULT 0;

-- Copy existing name to fullName for old records
UPDATE "users" SET "fullName" = COALESCE("email", 'Unknown') WHERE "fullName" = '';

-- Remove the default for organizationId (now all rows have a value)
ALTER TABLE "users" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "fullName" DROP DEFAULT;

-- Add FK constraint for organizationId
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add new indexes for users
CREATE INDEX "users_organizationId_role_idx" ON "users"("organizationId", "role");
CREATE INDEX "users_organizationId_currentCohortId_idx" ON "users"("organizationId", "currentCohortId");
CREATE INDEX "users_organizationId_status_idx" ON "users"("organizationId", "status");
CREATE UNIQUE INDEX "users_organizationId_nrp_key" ON "users"("organizationId", "nrp") WHERE "nrp" IS NOT NULL;

-- ============================================
-- Step 5: Create Cohort table
-- ============================================

CREATE TABLE "cohorts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "CohortStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "cohorts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cohorts_organizationId_code_key" ON "cohorts"("organizationId", "code");
CREATE INDEX "cohorts_organizationId_status_idx" ON "cohorts"("organizationId", "status");
CREATE INDEX "cohorts_organizationId_isActive_idx" ON "cohorts"("organizationId", "isActive");

-- Partial unique: at most 1 active cohort per organization
CREATE UNIQUE INDEX "cohorts_organizationId_isActive_unique"
    ON "cohorts"("organizationId")
    WHERE "isActive" = true;

ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add FK from users.currentCohortId to cohorts
ALTER TABLE "users" ADD CONSTRAINT "users_currentCohortId_fkey" FOREIGN KEY ("currentCohortId") REFERENCES "cohorts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- Step 6: Create WhitelistEmail table
-- ============================================

CREATE TABLE "whitelist_emails" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "preassignedRole" "UserRole" NOT NULL,
    "preassignedCohortId" TEXT,
    "addedBy" TEXT NOT NULL,
    "note" TEXT,
    "isConsumed" BOOLEAN NOT NULL DEFAULT false,
    "consumedAt" TIMESTAMP(3),
    "consumedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whitelist_emails_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whitelist_emails_organizationId_email_key" ON "whitelist_emails"("organizationId", "email");
CREATE INDEX "whitelist_emails_isConsumed_idx" ON "whitelist_emails"("isConsumed");

ALTER TABLE "whitelist_emails" ADD CONSTRAINT "whitelist_emails_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "whitelist_emails" ADD CONSTRAINT "whitelist_emails_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "whitelist_emails" ADD CONSTRAINT "whitelist_emails_preassignedCohortId_fkey" FOREIGN KEY ("preassignedCohortId") REFERENCES "cohorts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- Step 7: Create RevokedSession table
-- ============================================

CREATE TABLE "revoked_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jti" TEXT,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedBy" TEXT,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revoked_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "revoked_sessions_userId_idx" ON "revoked_sessions"("userId");
CREATE INDEX "revoked_sessions_jti_idx" ON "revoked_sessions"("jti");
CREATE INDEX "revoked_sessions_expiresAt_idx" ON "revoked_sessions"("expiresAt");

-- ============================================
-- Step 8: Create PaktaVersion table
-- ============================================

CREATE TABLE "pakta_versions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "PaktaType" NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "contentMarkdown" TEXT NOT NULL,
    "summaryJson" JSONB,
    "quizQuestions" JSONB NOT NULL,
    "passingScore" INTEGER NOT NULL DEFAULT 80,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "status" "PaktaVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "supersededAt" TIMESTAMP(3),
    "supersededByVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pakta_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pakta_versions_organizationId_type_versionNumber_key" ON "pakta_versions"("organizationId", "type", "versionNumber");
CREATE INDEX "pakta_versions_organizationId_type_status_idx" ON "pakta_versions"("organizationId", "type", "status");

-- Partial unique: at most 1 PUBLISHED version per (organizationId, type)
CREATE UNIQUE INDEX "pakta_versions_published_unique"
    ON "pakta_versions"("organizationId", "type")
    WHERE "status" = 'PUBLISHED';

ALTER TABLE "pakta_versions" ADD CONSTRAINT "pakta_versions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pakta_versions" ADD CONSTRAINT "pakta_versions_publishedBy_fkey" FOREIGN KEY ("publishedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pakta_versions" ADD CONSTRAINT "pakta_versions_supersededByVersionId_fkey" FOREIGN KEY ("supersededByVersionId") REFERENCES "pakta_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- Step 9: Create PaktaSignature table
-- ============================================

CREATE TABLE "pakta_signatures" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paktaVersionId" TEXT NOT NULL,
    "type" "PaktaType" NOT NULL,
    "cohortId" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "quizScore" INTEGER NOT NULL,
    "attachmentUrl" TEXT,
    "status" "PaktaSignatureStatus" NOT NULL DEFAULT 'ACTIVE',
    "supersededAt" TIMESTAMP(3),

    CONSTRAINT "pakta_signatures_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pakta_signatures_userId_paktaVersionId_key" ON "pakta_signatures"("userId", "paktaVersionId");
CREATE INDEX "pakta_signatures_organizationId_type_status_idx" ON "pakta_signatures"("organizationId", "type", "status");
CREATE INDEX "pakta_signatures_userId_type_status_idx" ON "pakta_signatures"("userId", "type", "status");
CREATE INDEX "pakta_signatures_signedAt_idx" ON "pakta_signatures"("signedAt");

-- Partial unique: at most 1 ACTIVE signature per (userId, type)
CREATE UNIQUE INDEX "pakta_signatures_active_unique"
    ON "pakta_signatures"("userId", "type")
    WHERE "status" = 'ACTIVE';

ALTER TABLE "pakta_signatures" ADD CONSTRAINT "pakta_signatures_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pakta_signatures" ADD CONSTRAINT "pakta_signatures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pakta_signatures" ADD CONSTRAINT "pakta_signatures_paktaVersionId_fkey" FOREIGN KEY ("paktaVersionId") REFERENCES "pakta_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pakta_signatures" ADD CONSTRAINT "pakta_signatures_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- Step 10: Create PaktaRejection table
-- ============================================

CREATE TABLE "pakta_rejections" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paktaVersionId" TEXT NOT NULL,
    "type" "PaktaType" NOT NULL,
    "reason" TEXT NOT NULL,
    "rejectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "escalatedToSC" BOOLEAN NOT NULL DEFAULT false,
    "escalatedAt" TIMESTAMP(3),
    "notes" TEXT,
    "supersededBySignatureId" TEXT,

    CONSTRAINT "pakta_rejections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pakta_rejections_organizationId_userId_type_idx" ON "pakta_rejections"("organizationId", "userId", "type");
CREATE INDEX "pakta_rejections_rejectedAt_idx" ON "pakta_rejections"("rejectedAt");

ALTER TABLE "pakta_rejections" ADD CONSTRAINT "pakta_rejections_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pakta_rejections" ADD CONSTRAINT "pakta_rejections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pakta_rejections" ADD CONSTRAINT "pakta_rejections_paktaVersionId_fkey" FOREIGN KEY ("paktaVersionId") REFERENCES "pakta_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- Step 11: Create NawasenaAuditLog table
-- ============================================

CREATE TABLE "nawasena_audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "action" "AuditAction" NOT NULL,
    "actorUserId" TEXT,
    "subjectUserId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeValue" JSONB,
    "afterValue" JSONB,
    "reason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nawasena_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "nawasena_audit_logs_organizationId_createdAt_idx" ON "nawasena_audit_logs"("organizationId", "createdAt" DESC);
CREATE INDEX "nawasena_audit_logs_actorUserId_createdAt_idx" ON "nawasena_audit_logs"("actorUserId", "createdAt" DESC);
CREATE INDEX "nawasena_audit_logs_subjectUserId_createdAt_idx" ON "nawasena_audit_logs"("subjectUserId", "createdAt" DESC);
CREATE INDEX "nawasena_audit_logs_action_createdAt_idx" ON "nawasena_audit_logs"("action", "createdAt" DESC);
CREATE INDEX "nawasena_audit_logs_entityType_entityId_idx" ON "nawasena_audit_logs"("entityType", "entityId");

ALTER TABLE "nawasena_audit_logs" ADD CONSTRAINT "nawasena_audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nawasena_audit_logs" ADD CONSTRAINT "nawasena_audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nawasena_audit_logs" ADD CONSTRAINT "nawasena_audit_logs_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- Step 12: Create AI usage tracking tables
-- ============================================

CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "operationCount" INTEGER NOT NULL DEFAULT 0,
    "limit" INTEGER NOT NULL DEFAULT 300,
    "chatMessages" INTEGER NOT NULL DEFAULT 0,
    "textOperations" INTEGER NOT NULL DEFAULT 0,
    "analysisOperations" INTEGER NOT NULL DEFAULT 0,
    "visionOperations" INTEGER NOT NULL DEFAULT 0,
    "otherOperations" INTEGER NOT NULL DEFAULT 0,
    "totalTokensUsed" INTEGER NOT NULL DEFAULT 0,
    "totalCostUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalInputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalOutputTokens" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_usage_userId_year_month_key" ON "ai_usage"("userId", "year", "month");

ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ai_operation_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "operationType" "AiOperationType" NOT NULL,
    "cost" INTEGER NOT NULL DEFAULT 1,
    "aiProvider" TEXT,
    "modelUsed" TEXT,
    "tokensUsed" INTEGER,
    "responseTime" INTEGER,
    "costUSD" DOUBLE PRECISION,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_operation_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_operation_logs_userId_createdAt_idx" ON "ai_operation_logs"("userId", "createdAt");
CREATE INDEX "ai_operation_logs_operationType_idx" ON "ai_operation_logs"("operationType");

ALTER TABLE "ai_operation_logs" ADD CONSTRAINT "ai_operation_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- Step 13: Enable Row Level Security on sensitive tables
-- ============================================

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cohorts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pakta_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pakta_signatures" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pakta_rejections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "nawasena_audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "whitelist_emails" ENABLE ROW LEVEL SECURITY;

-- RLS: Users can see their own org's data OR bypass if flag set OR see own record
CREATE POLICY "user_org_isolation" ON "users"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR current_setting('app.bypass_rls', true) = 'true'
    OR "id" = NULLIF(current_setting('app.current_user_id', true), '')
  );

CREATE POLICY "cohort_org_isolation" ON "cohorts"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR current_setting('app.bypass_rls', true) = 'true'
  );

CREATE POLICY "pakta_version_org_isolation" ON "pakta_versions"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR current_setting('app.bypass_rls', true) = 'true'
  );

CREATE POLICY "pakta_signature_org_isolation" ON "pakta_signatures"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR current_setting('app.bypass_rls', true) = 'true'
    OR "userId" = NULLIF(current_setting('app.current_user_id', true), '')
  );

CREATE POLICY "pakta_rejection_org_isolation" ON "pakta_rejections"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR current_setting('app.bypass_rls', true) = 'true'
  );

CREATE POLICY "audit_log_org_isolation" ON "nawasena_audit_logs"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR "organizationId" IS NULL
    OR current_setting('app.bypass_rls', true) = 'true'
  );

CREATE POLICY "whitelist_org_isolation" ON "whitelist_emails"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- ============================================
-- Step 14: Create app_user DB role for runtime (non-migration) connections
-- Note: In development/single-user setup, the app_user role may not be used.
-- The Prisma connection will bypass RLS by default (since it connects as the owner).
-- For production, set DATABASE_URL to use app_user and DIRECT_URL for migrations.
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN;
  END IF;
END
$$;

-- Grant necessary permissions to app_user
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Note: Migration user (current connection owner) has BYPASSRLS by default as table owner.
-- For production: the app runtime user should be 'app_user' (no BYPASSRLS).
-- This enforces RLS policies at DB level as defense-in-depth.
