-- M13 Dashboard Multi-Role: KPISignal + RedFlagAlert tables + enums + indexes + RLS policies
-- Migration: 20260426000000_m13_dashboard_schema

-- CreateEnum: KPIPeriod
DO $$ BEGIN
  CREATE TYPE "KPIPeriod" AS ENUM ('REALTIME', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'END_OF_COHORT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: KPISignalSource
DO $$ BEGIN
  CREATE TYPE "KPISignalSource" AS ENUM ('AUTO', 'MANUAL', 'EXTERNAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: RedFlagType
DO $$ BEGIN
  CREATE TYPE "RedFlagType" AS ENUM (
    'PULSE_LOW_3D',
    'JOURNAL_DORMANT_14D',
    'KP_DEBRIEF_OVERDUE_14D',
    'PAKTA_UNSIGNED_7D',
    'INCIDENT_CREATED_UNASSIGNED',
    'ANON_REPORT_RED_NEW',
    'MOOD_COHORT_DROP',
    'NPS_DROP',
    'LOGBOOK_MISSING_WEEK',
    'COMPLIANCE_GAP',
    'CUSTOM'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: RedFlagSeverity
DO $$ BEGIN
  CREATE TYPE "RedFlagSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: AlertStatus
DO $$ BEGIN
  CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'DISMISSED', 'RESOLVED', 'SNOOZED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable: kpi_signals
CREATE TABLE IF NOT EXISTS "kpi_signals" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "cohortId"       TEXT NOT NULL,
  "kpiDefId"       TEXT NOT NULL,
  "value"          DOUBLE PRECISION NOT NULL,
  "valueText"      TEXT,
  "metadata"       JSONB,
  "source"         "KPISignalSource" NOT NULL DEFAULT 'AUTO',
  "period"         "KPIPeriod" NOT NULL,
  "computedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "computedBy"     TEXT,

  CONSTRAINT "kpi_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable: red_flag_alerts
CREATE TABLE IF NOT EXISTS "red_flag_alerts" (
  "id"               TEXT NOT NULL,
  "organizationId"   TEXT NOT NULL,
  "cohortId"         TEXT NOT NULL,
  "type"             "RedFlagType" NOT NULL,
  "severity"         "RedFlagSeverity" NOT NULL,
  "status"           "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
  "targetUserId"     TEXT,
  "targetRoles"      "UserRole"[],
  "targetUrl"        TEXT NOT NULL,
  "title"            TEXT NOT NULL,
  "description"      TEXT,
  "metadata"         JSONB,
  "computedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "firstSeenAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedById" TEXT,
  "acknowledgedAt"   TIMESTAMP(3),
  "dismissedById"    TEXT,
  "dismissedAt"      TIMESTAMP(3),
  "dismissReason"    TEXT,
  "resolvedAt"       TIMESTAMP(3),
  "snoozeUntil"      TIMESTAMP(3),

  CONSTRAINT "red_flag_alerts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: kpi_signals → organizations
ALTER TABLE "kpi_signals" ADD CONSTRAINT "kpi_signals_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: kpi_signals → cohorts
ALTER TABLE "kpi_signals" ADD CONSTRAINT "kpi_signals_cohortId_fkey"
  FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: kpi_signals → kpi_defs
ALTER TABLE "kpi_signals" ADD CONSTRAINT "kpi_signals_kpiDefId_fkey"
  FOREIGN KEY ("kpiDefId") REFERENCES "kpi_defs"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: red_flag_alerts → organizations
ALTER TABLE "red_flag_alerts" ADD CONSTRAINT "red_flag_alerts_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: red_flag_alerts → cohorts
ALTER TABLE "red_flag_alerts" ADD CONSTRAINT "red_flag_alerts_cohortId_fkey"
  FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: red_flag_alerts → users (target)
ALTER TABLE "red_flag_alerts" ADD CONSTRAINT "red_flag_alerts_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: red_flag_alerts → users (ack)
ALTER TABLE "red_flag_alerts" ADD CONSTRAINT "red_flag_alerts_acknowledgedById_fkey"
  FOREIGN KEY ("acknowledgedById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: red_flag_alerts → users (dismiss)
ALTER TABLE "red_flag_alerts" ADD CONSTRAINT "red_flag_alerts_dismissedById_fkey"
  FOREIGN KEY ("dismissedById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: kpi_signal_hot_read
CREATE INDEX IF NOT EXISTS "kpi_signal_hot_read"
  ON "kpi_signals" ("cohortId", "kpiDefId", "period", "computedAt" DESC);

-- CreateIndex: kpi_signal_org_cleanup
CREATE INDEX IF NOT EXISTS "kpi_signal_org_cleanup"
  ON "kpi_signals" ("organizationId", "computedAt");

-- CreateIndex: alert_hot_read
CREATE INDEX IF NOT EXISTS "alert_hot_read"
  ON "red_flag_alerts" ("cohortId", "status", "severity", "computedAt" DESC);

-- CreateIndex: alert_target_user
CREATE INDEX IF NOT EXISTS "alert_target_user"
  ON "red_flag_alerts" ("targetUserId", "status");

-- CreateIndex: alert_org_cleanup
CREATE INDEX IF NOT EXISTS "alert_org_cleanup"
  ON "red_flag_alerts" ("organizationId", "computedAt");

-- Partial unique index for dedup active alerts (native SQL, Prisma can't express partial unique)
CREATE UNIQUE INDEX IF NOT EXISTS "alert_dedup_active_idx"
  ON "red_flag_alerts" ("cohortId", "type", "targetUserId")
  WHERE "status" = 'ACTIVE';

-- ============================================================
-- RLS POLICIES for multi-tenant org isolation
-- ============================================================

-- Enable RLS on kpi_signals
ALTER TABLE "kpi_signals" ENABLE ROW LEVEL SECURITY;

-- SELECT policy: own org or bypass flag
CREATE POLICY kpi_signal_tenant_select ON "kpi_signals"
  FOR SELECT
  USING (
    "organizationId" = current_setting('app.current_org_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- INSERT policy: own org or bypass flag
CREATE POLICY kpi_signal_tenant_insert ON "kpi_signals"
  FOR INSERT
  WITH CHECK (
    "organizationId" = current_setting('app.current_org_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- UPDATE policy
CREATE POLICY kpi_signal_tenant_update ON "kpi_signals"
  FOR UPDATE
  USING (
    "organizationId" = current_setting('app.current_org_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- Enable RLS on red_flag_alerts
ALTER TABLE "red_flag_alerts" ENABLE ROW LEVEL SECURITY;

-- SELECT policy
CREATE POLICY rfa_tenant_select ON "red_flag_alerts"
  FOR SELECT
  USING (
    "organizationId" = current_setting('app.current_org_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- ALL (INSERT + UPDATE + DELETE) policy
CREATE POLICY rfa_tenant_mutate ON "red_flag_alerts"
  FOR ALL
  USING (
    "organizationId" = current_setting('app.current_org_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );
