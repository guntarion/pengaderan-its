-- M01 Revisi Multi-HMJ — Phase RV-A: Schema Migration
-- Covers: RV-01 (Organization fields), RV-02 (Cohort.settings), RV-03 (Cohort partial unique per-org),
--         RV-04 (PaktaVersion.organizationId nullable + indexes), RV-05 (backfill PaktaVersion DIGITAL scope),
--         RV-07 (User.facultyCode + programStudi), RV-08 (RLS pakta_version_dual_scope)
-- RV-06 SKIP — defer to M04: naming clash with SOCIAL_CONTRACT_MABA; see 13-arsitektur §0
--
-- ROLLBACK NOTES:
--   RV-01: DROP COLUMN slug, organization_type, registration_status, is_active, kahima_name, kajur_name;
--          DROP TYPE "OrganizationType", "OrganizationRegistrationStatus";
--   RV-02: ALTER TABLE cohorts DROP COLUMN settings;
--   RV-03: DROP INDEX cohort_active_per_org_unique; (recreate old global: CREATE UNIQUE INDEX cohorts_organizationId_isActive_unique ON cohorts(organizationId) WHERE is_active=true)
--   RV-04: ALTER TABLE pakta_versions ALTER COLUMN organization_id SET NOT NULL; drop new partial uniques
--   RV-05: No surgical rollback — restore from backup snapshot
--   RV-07: ALTER TABLE users DROP COLUMN faculty_code, program_studi;
--   RV-08: DROP POLICY pakta_version_dual_scope ON pakta_versions; re-CREATE POLICY pakta_version_org_isolation ...

-- ============================================
-- RV-01: New enums for Organization
-- ============================================

CREATE TYPE "OrganizationType" AS ENUM ('HMJ', 'ALUMNI_CHAPTER', 'INSTITUSI_PUSAT');

CREATE TYPE "OrganizationRegistrationStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- ============================================
-- RV-01: Add new fields to organizations table
-- ============================================

ALTER TABLE "organizations"
  ADD COLUMN "slug"               TEXT,
  ADD COLUMN "organization_type"  "OrganizationType" NOT NULL DEFAULT 'HMJ',
  ADD COLUMN "registration_status" "OrganizationRegistrationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "is_active"          BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "kahima_name"        TEXT,
  ADD COLUMN "kajur_name"         TEXT;

-- Backfill HMTC existing org: slug, facultyCode already set from seed, set registrationStatus=ACTIVE
UPDATE "organizations"
SET
  "slug"                = LOWER("code"),
  "registration_status" = 'ACTIVE'
WHERE "code" = 'HMTC';

-- Generic backfill for any other existing orgs (fallback)
UPDATE "organizations"
SET "slug" = LOWER("code")
WHERE "slug" IS NULL;

-- Make slug NOT NULL now that all rows have a value
ALTER TABLE "organizations" ALTER COLUMN "slug" SET NOT NULL;

-- Drop Prisma-generated plain unique (if created by validate), replace with case-insensitive unique
DROP INDEX IF EXISTS "organizations_slug_key";

-- Case-insensitive slug unique index
CREATE UNIQUE INDEX "organizations_slug_lower_key" ON "organizations" (LOWER("slug"));

-- New indexes for Organization
CREATE INDEX "organizations_faculty_code_idx" ON "organizations" ("facultyCode");
CREATE INDEX "organizations_active_status_idx" ON "organizations" ("is_active", "registration_status");

-- ============================================
-- RV-02: Add settings JSON to cohorts
-- ============================================

ALTER TABLE "cohorts"
  ADD COLUMN "settings" JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ============================================
-- RV-03: Cohort isActive partial unique — per-org instead of global
-- Note: existing index name from foundation migration is "cohorts_organizationId_isActive_unique"
-- ============================================

DROP INDEX IF EXISTS "cohorts_organizationId_isActive_unique";

-- New compound partial unique: at most 1 active cohort per organization
CREATE UNIQUE INDEX "cohort_active_per_org_unique"
  ON "cohorts" ("organizationId")
  WHERE "isActive" = true;

-- ============================================
-- RV-04: PaktaVersion.organizationId nullable
-- ============================================

-- Drop existing NOT NULL FK constraint
ALTER TABLE "pakta_versions" DROP CONSTRAINT IF EXISTS "pakta_versions_organizationId_fkey";

-- Make organizationId nullable
ALTER TABLE "pakta_versions" ALTER COLUMN "organizationId" DROP NOT NULL;

-- Recreate FK as optional (ON DELETE SET NULL)
ALTER TABLE "pakta_versions"
  ADD CONSTRAINT "pakta_versions_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop the combined unique that included organizationId (Prisma default for @@unique([organizationId, type, versionNumber]))
-- The Prisma @@unique generates an index named after the fields
DROP INDEX IF EXISTS "pakta_versions_organizationId_type_versionNumber_key";

-- Recreate compound unique (Postgres NULL != NULL, so per-org rows work naturally)
CREATE UNIQUE INDEX "pakta_versions_organizationId_type_versionNumber_key"
  ON "pakta_versions" ("organizationId", "type", "versionNumber");

-- Partial unique for DIGITAL global (organizationId IS NULL): enforce 1 global version per (type, versionNumber)
CREATE UNIQUE INDEX "pakta_version_digital_global_unique"
  ON "pakta_versions" ("type", "versionNumber")
  WHERE "organizationId" IS NULL;

-- Replace old published-per-org partial unique with two policies (NULL + NOT NULL)
DROP INDEX IF EXISTS "pakta_versions_published_unique";

-- For per-org (organizationId NOT NULL): 1 published per (org, type)
CREATE UNIQUE INDEX "pakta_version_published_per_org_unique"
  ON "pakta_versions" ("organizationId", "type")
  WHERE "status" = 'PUBLISHED' AND "organizationId" IS NOT NULL;

-- For institusi-wide DIGITAL (organizationId IS NULL): 1 published per type globally
CREATE UNIQUE INDEX "pakta_version_published_global_unique"
  ON "pakta_versions" ("type")
  WHERE "status" = 'PUBLISHED' AND "organizationId" IS NULL;

-- New compound indexes for dual-scope queries
CREATE INDEX "pakta_version_type_status_org_idx"
  ON "pakta_versions" ("type", "status", "organizationId");

CREATE INDEX "pakta_version_type_org_status_idx"
  ON "pakta_versions" ("type", "organizationId", "status");

-- ============================================
-- RV-05: Backfill PaktaVersion.organizationId for DIGITAL scope
-- Pre-flight: assert HMTC is the only existing org
-- (If DB is empty / no pakta_versions, the UPDATEs are no-ops — safe)
-- ============================================

DO $$
DECLARE
  org_count INT;
BEGIN
  SELECT COUNT(*) INTO org_count FROM "organizations";
  -- If DB is empty (not yet seeded), skip assertion
  IF org_count > 1 THEN
    RAISE EXCEPTION 'RV-05 Backfill assumed single existing org (HMTC). Found %. Aborting.', org_count;
  END IF;
END $$;

-- Backfill DIGITAL (SOCIAL_CONTRACT_MABA) → organizationId = NULL (institusi-wide)
UPDATE "pakta_versions"
SET "organizationId" = NULL
WHERE "type" = 'SOCIAL_CONTRACT_MABA';

-- PAKTA_PANITIA & PAKTA_PENGADER_2027 already have organizationId = HMTC_ID — no-op

-- Post-flight verification
DO $$
DECLARE
  digital_with_org INT;
  etik_without_org INT;
BEGIN
  SELECT COUNT(*) INTO digital_with_org
  FROM "pakta_versions"
  WHERE "type" = 'SOCIAL_CONTRACT_MABA' AND "organizationId" IS NOT NULL;

  IF digital_with_org > 0 THEN
    RAISE EXCEPTION 'RV-05 Backfill failed: % DIGITAL rows still have organizationId set.', digital_with_org;
  END IF;

  SELECT COUNT(*) INTO etik_without_org
  FROM "pakta_versions"
  WHERE "type" IN ('PAKTA_PANITIA', 'PAKTA_PENGADER_2027') AND "organizationId" IS NULL;

  IF etik_without_org > 0 THEN
    RAISE EXCEPTION 'RV-05 Backfill failed: % ETIK rows have NULL organizationId.', etik_without_org;
  END IF;
END $$;

-- ============================================
-- RV-07: User.facultyCode + programStudi
-- ============================================

ALTER TABLE "users"
  ADD COLUMN "faculty_code" TEXT,
  ADD COLUMN "program_studi" TEXT;

-- Backfill facultyCode from current org (no-op if users table is empty)
UPDATE "users" u
SET "faculty_code" = o."facultyCode"
FROM "organizations" o
WHERE u."organizationId" = o."id"
  AND u."faculty_code" IS NULL;

-- New indexes for User
CREATE INDEX "users_faculty_code_idx" ON "users" ("faculty_code");
CREATE INDEX "users_org_faculty_idx"  ON "users" ("organizationId", "faculty_code");

-- ============================================
-- RV-08: RLS — Replace pakta_version_org_isolation with dual-scope policy
-- (DIGITAL/organizationId IS NULL visible to all orgs; ETIK per-org)
-- ROLLBACK: DROP POLICY pakta_version_dual_scope ON "pakta_versions";
--           CREATE POLICY "pakta_version_org_isolation" ON "pakta_versions" FOR ALL
--             USING ("organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
--                    OR current_setting('app.bypass_rls', true) = 'true');
-- ============================================

DROP POLICY IF EXISTS "pakta_version_org_isolation" ON "pakta_versions";

CREATE POLICY "pakta_version_dual_scope" ON "pakta_versions"
  FOR ALL
  USING (
    "organizationId" IS NULL
    OR "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR current_setting('app.bypass_rls', true) = 'true'
  );
