-- M06: Event Listing, RSVP & NPS — Schema Migration
-- Creates 4 new tables, 3 new enums, extends AuditAction, enables RLS
-- Additive-only migration. M08 may add fields to Attendance but must NOT remove or rename the 6 core fields.

-- ============================================================
-- Extend AuditAction enum with M06 values
-- PostgreSQL requires separate ALTER TYPE for each new value
-- ============================================================
ALTER TYPE "AuditAction" ADD VALUE 'KEGIATAN_INSTANCE_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'KEGIATAN_INSTANCE_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'KEGIATAN_INSTANCE_STATUS_CHANGE';
ALTER TYPE "AuditAction" ADD VALUE 'RSVP_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'RSVP_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'RSVP_DECLINE';
ALTER TYPE "AuditAction" ADD VALUE 'RSVP_WAITLIST_PROMOTE';
ALTER TYPE "AuditAction" ADD VALUE 'RSVP_WAITLIST_FIFO_SKIP';
ALTER TYPE "AuditAction" ADD VALUE 'EVENT_NPS_SUBMIT';
ALTER TYPE "AuditAction" ADD VALUE 'EVENT_NPS_SUBMIT_REJECTED_DUPLICATE';
ALTER TYPE "AuditAction" ADD VALUE 'EVENT_NPS_SUBMIT_REJECTED_WINDOW';
ALTER TYPE "AuditAction" ADD VALUE 'NPS_TRIGGER_SCHEDULED';
ALTER TYPE "AuditAction" ADD VALUE 'NPS_TRIGGER_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE 'NPS_TRIGGER_MANUAL';
ALTER TYPE "AuditAction" ADD VALUE 'NPS_INDIVIDUAL_DRILLDOWN';
ALTER TYPE "AuditAction" ADD VALUE 'ATTENDANCE_MARK';
ALTER TYPE "AuditAction" ADD VALUE 'DATA_RETENTION_PURGE_M06';

-- ============================================================
-- Create M06 Enums
-- ============================================================
CREATE TYPE "InstanceStatus" AS ENUM ('PLANNED', 'RUNNING', 'DONE', 'CANCELLED');
CREATE TYPE "RSVPStatus" AS ENUM ('CONFIRMED', 'WAITLIST', 'DECLINED');
CREATE TYPE "AttendanceStatus" AS ENUM ('HADIR', 'IZIN', 'SAKIT', 'ALPA');

-- ============================================================
-- CreateTable: kegiatan_instances
-- ============================================================
CREATE TABLE "kegiatan_instances" (
    "id" TEXT NOT NULL,
    "kegiatanId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "location" VARCHAR(500) NOT NULL,
    "capacity" INTEGER,
    "status" "InstanceStatus" NOT NULL DEFAULT 'PLANNED',
    "notesPanitia" TEXT,
    "materiLinkUrl" TEXT,
    "picRoleHint" TEXT,
    "npsRequestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "kegiatan_instances_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- CreateTable: rsvps
-- ============================================================
CREATE TABLE "rsvps" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "RSVPStatus" NOT NULL,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "promotedAt" TIMESTAMP(3),
    "waitlistPosition" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rsvps_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- CreateTable: event_nps
-- ============================================================
CREATE TABLE "event_nps" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "npsScore" INTEGER NOT NULL,
    "feltSafe" INTEGER NOT NULL,
    "meaningful" INTEGER NOT NULL,
    "comment" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_nps_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- CreateTable: attendances (STUB M06 — 6 core fields locked for M08 contract)
-- M08 may ADD fields but must NOT REMOVE or RENAME the following 6 fields:
--   id, instanceId, userId, organizationId, status, notedAt
-- ============================================================
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "notedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- Unique constraints
-- ============================================================
CREATE UNIQUE INDEX "rsvps_instanceId_userId_key" ON "rsvps"("instanceId", "userId");
CREATE UNIQUE INDEX "event_nps_userId_instanceId_key" ON "event_nps"("userId", "instanceId");
CREATE UNIQUE INDEX "attendances_instanceId_userId_key" ON "attendances"("instanceId", "userId");

-- ============================================================
-- Indexes: kegiatan_instances
-- ============================================================
CREATE INDEX "kegiatan_instances_organizationId_cohortId_status_scheduledAt_idx"
    ON "kegiatan_instances"("organizationId", "cohortId", "status", "scheduledAt");
CREATE INDEX "kegiatan_instances_cohortId_status_scheduledAt_idx"
    ON "kegiatan_instances"("cohortId", "status", "scheduledAt");
CREATE INDEX "kegiatan_instances_kegiatanId_scheduledAt_idx"
    ON "kegiatan_instances"("kegiatanId", "scheduledAt");
CREATE INDEX "kegiatan_instances_status_executedAt_idx"
    ON "kegiatan_instances"("status", "executedAt");
CREATE INDEX "kegiatan_instances_organizationId_status_scheduledAt_idx"
    ON "kegiatan_instances"("organizationId", "status", "scheduledAt");

-- ============================================================
-- Indexes: rsvps
-- ============================================================
CREATE INDEX "rsvps_instanceId_status_respondedAt_idx"
    ON "rsvps"("instanceId", "status", "respondedAt");
CREATE INDEX "rsvps_userId_status_respondedAt_idx"
    ON "rsvps"("userId", "status", "respondedAt" DESC);
CREATE INDEX "rsvps_organizationId_instanceId_idx"
    ON "rsvps"("organizationId", "instanceId");

-- ============================================================
-- Indexes: event_nps
-- ============================================================
CREATE INDEX "event_nps_instanceId_recordedAt_idx"
    ON "event_nps"("instanceId", "recordedAt");
CREATE INDEX "event_nps_organizationId_instanceId_idx"
    ON "event_nps"("organizationId", "instanceId");

-- ============================================================
-- Indexes: attendances
-- ============================================================
CREATE INDEX "attendances_instanceId_status_idx"
    ON "attendances"("instanceId", "status");
CREATE INDEX "attendances_userId_status_notedAt_idx"
    ON "attendances"("userId", "status", "notedAt" DESC);
CREATE INDEX "attendances_organizationId_instanceId_idx"
    ON "attendances"("organizationId", "instanceId");

-- ============================================================
-- CHECK Constraints
-- ============================================================
ALTER TABLE "kegiatan_instances"
    ADD CONSTRAINT "kegiatan_instances_capacity_check"
    CHECK ("capacity" IS NULL OR ("capacity" > 0 AND "capacity" <= 10000));

ALTER TABLE "kegiatan_instances"
    ADD CONSTRAINT "kegiatan_instances_executed_after_scheduled"
    CHECK ("executedAt" IS NULL OR "executedAt" >= "scheduledAt");

ALTER TABLE "event_nps"
    ADD CONSTRAINT "event_nps_nps_score_check"
    CHECK ("npsScore" >= 0 AND "npsScore" <= 10);

ALTER TABLE "event_nps"
    ADD CONSTRAINT "event_nps_felt_safe_check"
    CHECK ("feltSafe" >= 1 AND "feltSafe" <= 5);

ALTER TABLE "event_nps"
    ADD CONSTRAINT "event_nps_meaningful_check"
    CHECK ("meaningful" >= 1 AND "meaningful" <= 5);

-- ============================================================
-- Enable Row Level Security
-- ============================================================
ALTER TABLE "kegiatan_instances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rsvps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "event_nps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendances" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies
-- ============================================================

-- KegiatanInstance: org-scoped + bypass (no self-read — instances are org-level)
CREATE POLICY kegiatan_instance_org_isolation ON "kegiatan_instances"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- RSVP: org-scoped OR self-read + bypass
CREATE POLICY rsvp_org_isolation ON "rsvps"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')
    OR "userId" = NULLIF(current_setting('app.current_user_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- EventNPS: org-scoped OR self-read + bypass
CREATE POLICY event_nps_org_isolation ON "event_nps"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')
    OR "userId" = NULLIF(current_setting('app.current_user_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- Attendance: org-scoped OR self-read + bypass
CREATE POLICY attendance_org_isolation ON "attendances"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')
    OR "userId" = NULLIF(current_setting('app.current_user_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- ============================================================
-- Foreign Keys: kegiatan_instances
-- ============================================================
ALTER TABLE "kegiatan_instances"
    ADD CONSTRAINT "kegiatan_instances_kegiatanId_fkey"
    FOREIGN KEY ("kegiatanId") REFERENCES "kegiatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kegiatan_instances"
    ADD CONSTRAINT "kegiatan_instances_cohortId_fkey"
    FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kegiatan_instances"
    ADD CONSTRAINT "kegiatan_instances_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- Foreign Keys: rsvps
-- ============================================================
ALTER TABLE "rsvps"
    ADD CONSTRAINT "rsvps_instanceId_fkey"
    FOREIGN KEY ("instanceId") REFERENCES "kegiatan_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rsvps"
    ADD CONSTRAINT "rsvps_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rsvps"
    ADD CONSTRAINT "rsvps_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- Foreign Keys: event_nps
-- ============================================================
ALTER TABLE "event_nps"
    ADD CONSTRAINT "event_nps_instanceId_fkey"
    FOREIGN KEY ("instanceId") REFERENCES "kegiatan_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_nps"
    ADD CONSTRAINT "event_nps_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_nps"
    ADD CONSTRAINT "event_nps_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- Foreign Keys: attendances
-- ============================================================
ALTER TABLE "attendances"
    ADD CONSTRAINT "attendances_instanceId_fkey"
    FOREIGN KEY ("instanceId") REFERENCES "kegiatan_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendances"
    ADD CONSTRAINT "attendances_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendances"
    ADD CONSTRAINT "attendances_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
