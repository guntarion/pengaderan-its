-- M07: Time Capsule & Personal Life Map — Schema Migration
-- Creates 4 new tables, 3 new enums, extends AuditAction + User + Cohort, enables RLS
-- Additive-only migration.

-- ============================================================
-- Extend AuditAction enum with M07 values
-- PostgreSQL requires separate ALTER TYPE for each new value
-- ============================================================
ALTER TYPE "AuditAction" ADD VALUE 'TIME_CAPSULE_ENTRY_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'TIME_CAPSULE_ENTRY_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'TIME_CAPSULE_ENTRY_DELETE_ADMIN';
ALTER TYPE "AuditAction" ADD VALUE 'TIME_CAPSULE_SHARE_TOGGLE';
ALTER TYPE "AuditAction" ADD VALUE 'TIME_CAPSULE_ATTACHMENT_UPLOAD';
ALTER TYPE "AuditAction" ADD VALUE 'TIME_CAPSULE_ATTACHMENT_DELETE';
ALTER TYPE "AuditAction" ADD VALUE 'LIFE_MAP_GOAL_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'LIFE_MAP_GOAL_UPDATE_STATUS';
ALTER TYPE "AuditAction" ADD VALUE 'LIFE_MAP_MILESTONE_UPDATE_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'LIFE_MAP_MILESTONE_UPDATE_EDIT';
ALTER TYPE "AuditAction" ADD VALUE 'LIFE_MAP_SHARE_TOGGLE';
ALTER TYPE "AuditAction" ADD VALUE 'SHARE_GLOBAL_SETTING_CHANGE';
ALTER TYPE "AuditAction" ADD VALUE 'DATA_RETENTION_PURGE_M07';
ALTER TYPE "AuditAction" ADD VALUE 'PORTFOLIO_VIEW_ACCESS';

-- ============================================================
-- Extend User table with M07 share settings
-- ============================================================
ALTER TABLE "users"
    ADD COLUMN "timeCapsuleShareDefault" BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN "lifeMapShareDefault" BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN "extendedRetention" SMALLINT NOT NULL DEFAULT 0;

ALTER TABLE "users"
    ADD CONSTRAINT "extended_retention_range" CHECK ("extendedRetention" BETWEEN 0 AND 3);

-- ============================================================
-- Extend Cohort table with M07 F2/F4 phase dates
-- ============================================================
ALTER TABLE "cohorts"
    ADD COLUMN "f2StartDate" TIMESTAMP(3),
    ADD COLUMN "f2EndDate" TIMESTAMP(3),
    ADD COLUMN "f4EndDate" TIMESTAMP(3);

ALTER TABLE "cohorts"
    ADD CONSTRAINT "cohort_f2_start_before_end" CHECK (
        "f2StartDate" IS NULL OR "f2EndDate" IS NULL OR "f2StartDate" < "f2EndDate"
    );

-- ============================================================
-- Create M07 Enums
-- ============================================================
CREATE TYPE "LifeArea" AS ENUM (
    'PERSONAL_GROWTH',
    'STUDI_KARIR',
    'FINANSIAL',
    'KESEHATAN',
    'SOSIAL',
    'KELUARGA'
);

CREATE TYPE "LifeMapStatus" AS ENUM (
    'ACTIVE',
    'ACHIEVED',
    'ADJUSTED'
);

CREATE TYPE "MilestoneKey" AS ENUM (
    'M1',
    'M2',
    'M3'
);

-- ============================================================
-- CreateTable: time_capsule_entries
-- ============================================================
CREATE TABLE "time_capsule_entries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(120),
    "body" TEXT NOT NULL,
    "mood" INTEGER,
    "sharedWithKasuh" BOOLEAN NOT NULL DEFAULT FALSE,
    "isHighlighted" BOOLEAN NOT NULL DEFAULT FALSE,
    "isClosingReflection" BOOLEAN NOT NULL DEFAULT FALSE,
    "publishedAt" TIMESTAMP(3),
    "editableUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "time_capsule_entries_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- CreateTable: time_capsule_attachments
-- ============================================================
CREATE TABLE "time_capsule_attachments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryId" TEXT,
    "storageKey" TEXT NOT NULL,
    "originalFilename" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(50) NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "time_capsule_attachments_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- CreateTable: life_maps
-- ============================================================
CREATE TABLE "life_maps" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "area" "LifeArea" NOT NULL,
    "goalText" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "whyMatters" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "achievabilityNote" TEXT,
    "status" "LifeMapStatus" NOT NULL DEFAULT 'ACTIVE',
    "sharedWithKasuh" BOOLEAN NOT NULL DEFAULT FALSE,
    "previousGoalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "achievedAt" TIMESTAMP(3),
    "adjustedAt" TIMESTAMP(3),
    CONSTRAINT "life_maps_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- CreateTable: life_map_updates
-- ============================================================
CREATE TABLE "life_map_updates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lifeMapId" TEXT NOT NULL,
    "milestone" "MilestoneKey" NOT NULL,
    "progressText" TEXT NOT NULL,
    "progressPercent" INTEGER NOT NULL,
    "reflectionText" TEXT NOT NULL,
    "newStatus" "LifeMapStatus",
    "isLate" BOOLEAN NOT NULL DEFAULT FALSE,
    "editableUntil" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "life_map_updates_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- Unique Constraints
-- ============================================================
ALTER TABLE "time_capsule_attachments"
    ADD CONSTRAINT "time_capsule_attachments_storageKey_key" UNIQUE ("storageKey");

ALTER TABLE "life_map_updates"
    ADD CONSTRAINT "life_map_updates_lifeMapId_milestone_key" UNIQUE ("lifeMapId", "milestone");

-- ============================================================
-- Indexes
-- ============================================================

-- time_capsule_entries indexes
CREATE INDEX "time_capsule_entries_userId_cohortId_publishedAt_idx"
    ON "time_capsule_entries" ("userId", "cohortId", "publishedAt" DESC NULLS LAST);

CREATE INDEX "time_capsule_entries_userId_cohortId_sharedWithKasuh_idx"
    ON "time_capsule_entries" ("userId", "cohortId", "sharedWithKasuh");

CREATE INDEX "time_capsule_entries_organizationId_cohortId_idx"
    ON "time_capsule_entries" ("organizationId", "cohortId");

CREATE INDEX "time_capsule_entries_cohortId_publishedAt_idx"
    ON "time_capsule_entries" ("cohortId", "publishedAt");

-- time_capsule_attachments indexes
CREATE INDEX "time_capsule_attachments_entryId_idx"
    ON "time_capsule_attachments" ("entryId");

CREATE INDEX "time_capsule_attachments_userId_cohortId_uploadedAt_idx"
    ON "time_capsule_attachments" ("userId", "cohortId", "uploadedAt");

CREATE INDEX "time_capsule_attachments_organizationId_cohortId_idx"
    ON "time_capsule_attachments" ("organizationId", "cohortId");

-- Partial index for orphan attachment scan (cron cleanup)
CREATE INDEX "attach_orphan_idx"
    ON "time_capsule_attachments" ("uploadedAt")
    WHERE "entryId" IS NULL;

-- life_maps indexes
CREATE INDEX "life_maps_userId_cohortId_area_status_idx"
    ON "life_maps" ("userId", "cohortId", "area", "status");

CREATE INDEX "life_maps_userId_cohortId_status_idx"
    ON "life_maps" ("userId", "cohortId", "status");

CREATE INDEX "life_maps_organizationId_cohortId_idx"
    ON "life_maps" ("organizationId", "cohortId");

CREATE INDEX "life_maps_cohortId_status_idx"
    ON "life_maps" ("cohortId", "status");

-- life_map_updates indexes
CREATE INDEX "life_map_updates_userId_cohortId_milestone_idx"
    ON "life_map_updates" ("userId", "cohortId", "milestone");

CREATE INDEX "life_map_updates_lifeMapId_idx"
    ON "life_map_updates" ("lifeMapId");

CREATE INDEX "life_map_updates_organizationId_cohortId_idx"
    ON "life_map_updates" ("organizationId", "cohortId");

-- ============================================================
-- Foreign Keys: time_capsule_entries
-- ============================================================
ALTER TABLE "time_capsule_entries"
    ADD CONSTRAINT "time_capsule_entries_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "time_capsule_entries"
    ADD CONSTRAINT "time_capsule_entries_cohortId_fkey"
    FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "time_capsule_entries"
    ADD CONSTRAINT "time_capsule_entries_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- Foreign Keys: time_capsule_attachments
-- ============================================================
ALTER TABLE "time_capsule_attachments"
    ADD CONSTRAINT "time_capsule_attachments_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "time_capsule_attachments"
    ADD CONSTRAINT "time_capsule_attachments_cohortId_fkey"
    FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "time_capsule_attachments"
    ADD CONSTRAINT "time_capsule_attachments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "time_capsule_attachments"
    ADD CONSTRAINT "time_capsule_attachments_entryId_fkey"
    FOREIGN KEY ("entryId") REFERENCES "time_capsule_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- Foreign Keys: life_maps
-- ============================================================
ALTER TABLE "life_maps"
    ADD CONSTRAINT "life_maps_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "life_maps"
    ADD CONSTRAINT "life_maps_cohortId_fkey"
    FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "life_maps"
    ADD CONSTRAINT "life_maps_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "life_maps"
    ADD CONSTRAINT "life_maps_previousGoalId_fkey"
    FOREIGN KEY ("previousGoalId") REFERENCES "life_maps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- Foreign Keys: life_map_updates
-- ============================================================
ALTER TABLE "life_map_updates"
    ADD CONSTRAINT "life_map_updates_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "life_map_updates"
    ADD CONSTRAINT "life_map_updates_cohortId_fkey"
    FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "life_map_updates"
    ADD CONSTRAINT "life_map_updates_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "life_map_updates"
    ADD CONSTRAINT "life_map_updates_lifeMapId_fkey"
    FOREIGN KEY ("lifeMapId") REFERENCES "life_maps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- Enable Row Level Security on all 4 M07 tables
-- ============================================================
ALTER TABLE "time_capsule_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "time_capsule_attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "life_maps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "life_map_updates" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policy: time_capsule_entries — SELECT (owner + Kasuh conditional)
-- ============================================================
CREATE POLICY "time_capsule_entry_select" ON "time_capsule_entries"
  FOR SELECT
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    AND (
      "userId" = NULLIF(current_setting('app.current_user_id', true), '')::text
      OR (
        "sharedWithKasuh" = true
        AND EXISTS (
          SELECT 1 FROM "kasuh_pairs" kp
          WHERE kp."mabaUserId" = "time_capsule_entries"."userId"
            AND kp."kasuhUserId" = NULLIF(current_setting('app.current_user_id', true), '')::text
            AND kp."status" = 'ACTIVE'
            AND kp."cohortId" = "time_capsule_entries"."cohortId"
        )
      )
      OR current_setting('app.bypass_rls', true) = 'true'
    )
  );

-- RLS Policy: time_capsule_entries — WRITE (owner only)
CREATE POLICY "time_capsule_entry_write" ON "time_capsule_entries"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    AND (
      "userId" = NULLIF(current_setting('app.current_user_id', true), '')::text
      OR current_setting('app.bypass_rls', true) = 'true'
    )
  );

-- ============================================================
-- RLS Policy: time_capsule_attachments — SELECT (owner + Kasuh via entry)
-- ============================================================
CREATE POLICY "time_capsule_attachment_select" ON "time_capsule_attachments"
  FOR SELECT
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    AND (
      "userId" = NULLIF(current_setting('app.current_user_id', true), '')::text
      OR (
        "entryId" IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM "time_capsule_entries" tce
          JOIN "kasuh_pairs" kp ON kp."mabaUserId" = tce."userId"
          WHERE tce."id" = "time_capsule_attachments"."entryId"
            AND tce."sharedWithKasuh" = true
            AND kp."kasuhUserId" = NULLIF(current_setting('app.current_user_id', true), '')::text
            AND kp."status" = 'ACTIVE'
            AND kp."cohortId" = tce."cohortId"
        )
      )
      OR current_setting('app.bypass_rls', true) = 'true'
    )
  );

-- RLS Policy: time_capsule_attachments — WRITE (owner only)
CREATE POLICY "time_capsule_attachment_write" ON "time_capsule_attachments"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    AND (
      "userId" = NULLIF(current_setting('app.current_user_id', true), '')::text
      OR current_setting('app.bypass_rls', true) = 'true'
    )
  );

-- ============================================================
-- RLS Policy: life_maps — SELECT (owner + Kasuh conditional)
-- ============================================================
CREATE POLICY "life_map_select" ON "life_maps"
  FOR SELECT
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    AND (
      "userId" = NULLIF(current_setting('app.current_user_id', true), '')::text
      OR (
        "sharedWithKasuh" = true
        AND EXISTS (
          SELECT 1 FROM "kasuh_pairs" kp
          WHERE kp."mabaUserId" = "life_maps"."userId"
            AND kp."kasuhUserId" = NULLIF(current_setting('app.current_user_id', true), '')::text
            AND kp."status" = 'ACTIVE'
            AND kp."cohortId" = "life_maps"."cohortId"
        )
      )
      OR current_setting('app.bypass_rls', true) = 'true'
    )
  );

-- RLS Policy: life_maps — WRITE (owner only)
CREATE POLICY "life_map_write" ON "life_maps"
  FOR INSERT
  WITH CHECK (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    AND (
      "userId" = NULLIF(current_setting('app.current_user_id', true), '')::text
      OR current_setting('app.bypass_rls', true) = 'true'
    )
  );

CREATE POLICY "life_map_update_delete" ON "life_maps"
  FOR UPDATE
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    AND (
      "userId" = NULLIF(current_setting('app.current_user_id', true), '')::text
      OR current_setting('app.bypass_rls', true) = 'true'
    )
  );

-- ============================================================
-- RLS Policy: life_map_updates — SELECT (owner + Kasuh via parent LifeMap)
-- ============================================================
CREATE POLICY "life_map_update_select" ON "life_map_updates"
  FOR SELECT
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    AND (
      "userId" = NULLIF(current_setting('app.current_user_id', true), '')::text
      OR EXISTS (
        SELECT 1 FROM "life_maps" lm
        JOIN "kasuh_pairs" kp ON kp."mabaUserId" = lm."userId"
        WHERE lm."id" = "life_map_updates"."lifeMapId"
          AND lm."sharedWithKasuh" = true
          AND kp."kasuhUserId" = NULLIF(current_setting('app.current_user_id', true), '')::text
          AND kp."status" = 'ACTIVE'
          AND kp."cohortId" = lm."cohortId"
      )
      OR current_setting('app.bypass_rls', true) = 'true'
    )
  );

-- RLS Policy: life_map_updates — WRITE (owner only)
CREATE POLICY "life_map_update_write" ON "life_map_updates"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    AND (
      "userId" = NULLIF(current_setting('app.current_user_id', true), '')::text
      OR current_setting('app.bypass_rls', true) = 'true'
    )
  );
