-- M01 RV-A Corrective: Rename snake_case columns to camelCase
-- The M01 migration created columns in snake_case but Prisma schema defines them
-- as camelCase (without @map). This migration aligns DB columns with Prisma expectations.
--
-- ROLLBACK:
--   ALTER TABLE "organizations" RENAME COLUMN "organizationType" TO "organization_type";
--   ALTER TABLE "organizations" RENAME COLUMN "registrationStatus" TO "registration_status";
--   ALTER TABLE "organizations" RENAME COLUMN "isActive" TO "is_active";
--   ALTER TABLE "organizations" RENAME COLUMN "kahimaName" TO "kahima_name";
--   ALTER TABLE "organizations" RENAME COLUMN "kajurName" TO "kajur_name";
--   ALTER TABLE "users" RENAME COLUMN "facultyCode" TO "faculty_code";
--   ALTER TABLE "users" RENAME COLUMN "programStudi" TO "program_studi";

-- ============================================
-- organizations table: rename M01 columns to camelCase
-- ============================================

ALTER TABLE "organizations"
  RENAME COLUMN "organization_type" TO "organizationType";

ALTER TABLE "organizations"
  RENAME COLUMN "registration_status" TO "registrationStatus";

ALTER TABLE "organizations"
  RENAME COLUMN "is_active" TO "isActive";

ALTER TABLE "organizations"
  RENAME COLUMN "kahima_name" TO "kahimaName";

ALTER TABLE "organizations"
  RENAME COLUMN "kajur_name" TO "kajurName";

-- Drop old snake_case index, recreate with camelCase column names
DROP INDEX IF EXISTS "organizations_active_status_idx";
CREATE INDEX "organizations_isActive_registrationStatus_idx"
  ON "organizations" ("isActive", "registrationStatus");

-- ============================================
-- users table: rename M01 columns to camelCase
-- ============================================

ALTER TABLE "users"
  RENAME COLUMN "faculty_code" TO "facultyCode";

ALTER TABLE "users"
  RENAME COLUMN "program_studi" TO "programStudi";

-- Drop old snake_case index, recreate with camelCase
DROP INDEX IF EXISTS "users_faculty_code_idx";
DROP INDEX IF EXISTS "users_org_faculty_idx";
CREATE INDEX "users_facultyCode_idx"
  ON "users" ("facultyCode");
CREATE INDEX "users_organizationId_facultyCode_idx"
  ON "users" ("organizationId", "facultyCode");
