-- M10: Safeguard & Insiden — Base Schema
-- Creates 4 new tables + 8 enums + isSafeguardOfficer field on users

-- ============================================
-- 1. Create Enums
-- ============================================

CREATE TYPE "IncidentType" AS ENUM ('SAFE_WORD', 'MEDICAL', 'SHUTDOWN', 'INJURY', 'CONFLICT', 'HARASSMENT', 'OTHER');

CREATE TYPE "IncidentSeverity" AS ENUM ('GREEN', 'YELLOW', 'RED');

CREATE TYPE "IncidentStatus" AS ENUM ('PENDING_REVIEW', 'OPEN', 'IN_REVIEW', 'RESOLVED', 'ESCALATED_TO_SATGAS', 'RETRACTED_BY_REPORTER', 'RETRACTED_BY_SC', 'SUPERSEDED');

-- ConsequenceType: STRICT non-physical only. No physical/verbal/psychological punishment values.
-- Permen 55/2024 prohibition enforced at DB enum level.
CREATE TYPE "ConsequenceType" AS ENUM ('REFLEKSI_500_KATA', 'PRESENTASI_ULANG', 'POIN_PASSPORT_DIKURANGI', 'PERINGATAN_TERTULIS', 'TUGAS_PENGABDIAN');

CREATE TYPE "ConsequenceStatus" AS ENUM ('ASSIGNED', 'PENDING_REVIEW', 'NEEDS_REVISION', 'APPROVED', 'OVERDUE', 'FORFEITED', 'CANCELLED');

CREATE TYPE "PassportCascadeStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING', 'APPLIED', 'FAILED', 'SKIPPED_FLAG_OFF');

CREATE TYPE "TimelineAction" AS ENUM ('CREATED', 'STATUS_CHANGED', 'CLAIMED_FOR_REVIEW', 'FIELD_UPDATED', 'NOTE_ADDED', 'ATTACHMENT_ADDED', 'ATTACHMENT_DOWNLOADED', 'CONSEQUENCE_ASSIGNED', 'ESCALATED_TO_SATGAS', 'SATGAS_PDF_GENERATED', 'RESOLVED', 'REOPENED', 'RETRACTED_BY_REPORTER', 'RETRACTED_BY_SC', 'SUPERSEDED', 'PEMBINA_ANNOTATION_ADDED');

CREATE TYPE "EscalationTarget" AS ENUM ('SATGAS_PPKPT_ITS', 'DITMAWA_ITS', 'EXTERNAL_LEGAL');

-- ============================================
-- 2. Extend AuditAction enum with M10 values
-- ============================================

ALTER TYPE "AuditAction" ADD VALUE 'INCIDENT_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'INCIDENT_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'INCIDENT_STATUS_CHANGE';
ALTER TYPE "AuditAction" ADD VALUE 'INCIDENT_CLAIM';
ALTER TYPE "AuditAction" ADD VALUE 'INCIDENT_RESOLVE';
ALTER TYPE "AuditAction" ADD VALUE 'INCIDENT_REOPEN';
ALTER TYPE "AuditAction" ADD VALUE 'INCIDENT_RETRACT';
ALTER TYPE "AuditAction" ADD VALUE 'INCIDENT_ESCALATE';
ALTER TYPE "AuditAction" ADD VALUE 'INCIDENT_NOTE_ADD';
ALTER TYPE "AuditAction" ADD VALUE 'INCIDENT_SUPERSEDE';
ALTER TYPE "AuditAction" ADD VALUE 'CONSEQUENCE_ASSIGN';
ALTER TYPE "AuditAction" ADD VALUE 'CONSEQUENCE_SUBMIT';
ALTER TYPE "AuditAction" ADD VALUE 'CONSEQUENCE_APPROVE';
ALTER TYPE "AuditAction" ADD VALUE 'CONSEQUENCE_REJECT';
ALTER TYPE "AuditAction" ADD VALUE 'CONSEQUENCE_CANCEL';
ALTER TYPE "AuditAction" ADD VALUE 'CONSEQUENCE_DEADLINE_EXTEND';
ALTER TYPE "AuditAction" ADD VALUE 'CONSEQUENCE_PASSPORT_CASCADE';
ALTER TYPE "AuditAction" ADD VALUE 'ATTACHMENT_PRESIGN';
ALTER TYPE "AuditAction" ADD VALUE 'ATTACHMENT_CONFIRM';
ALTER TYPE "AuditAction" ADD VALUE 'ATTACHMENT_DOWNLOAD';
ALTER TYPE "AuditAction" ADD VALUE 'SATGAS_PDF_EXPORT';
ALTER TYPE "AuditAction" ADD VALUE 'PEMBINA_ANNOTATION_ADD';
ALTER TYPE "AuditAction" ADD VALUE 'ESCALATION_FALLBACK_SENT';

-- ============================================
-- 3. Add isSafeguardOfficer to users
-- ============================================

ALTER TABLE "users" ADD COLUMN "isSafeguardOfficer" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "users_organizationId_isSafeguardOfficer_idx" ON "users"("organizationId", "isSafeguardOfficer");

-- ============================================
-- 4. Create SafeguardIncident table
-- ============================================

CREATE TABLE "safeguard_incidents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "kpGroupId" TEXT,
    "type" "IncidentType" NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "actionTaken" TEXT,
    "affectedUserId" TEXT,
    "additionalAffectedUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reportedById" TEXT NOT NULL,
    "claimedById" TEXT,
    "claimedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "escalatedTo" "EscalationTarget",
    "escalatedById" TEXT,
    "escalatedAt" TIMESTAMP(3),
    "escalationReason" TEXT,
    "satgasTicketRef" TEXT,
    "satgasPdfKey" TEXT,
    "attachmentKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "retractedAt" TIMESTAMP(3),
    "retractedById" TEXT,
    "retractionReason" TEXT,
    "pembinaAnnotations" JSONB,
    "notes" JSONB,

    CONSTRAINT "safeguard_incidents_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 5. Create ConsequenceLog table
-- ============================================

CREATE TABLE "consequence_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ConsequenceType" NOT NULL,
    "reasonText" TEXT NOT NULL,
    "forbiddenActCode" TEXT,
    "relatedIncidentId" TEXT,
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline" TIMESTAMP(3),
    "status" "ConsequenceStatus" NOT NULL DEFAULT 'ASSIGNED',
    "submittedAt" TIMESTAMP(3),
    "notesAfter" TEXT,
    "attachmentKey" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "completedAt" TIMESTAMP(3),
    "pointsDeducted" INTEGER,
    "passportCascadeStatus" "PassportCascadeStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "passportCascadeError" TEXT,
    "passportEntryId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consequence_logs_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 6. Create IncidentTimelineEntry table (append-only)
-- ============================================

CREATE TABLE "incident_timeline_entries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "TimelineAction" NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "fieldName" TEXT,
    "noteText" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_timeline_entries_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 7. Create SafeguardEscalationFallback table
-- ============================================

CREATE TABLE "safeguard_escalation_fallbacks" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "receiverUserId" TEXT NOT NULL,
    "channel" "ChannelType" NOT NULL,
    "status" TEXT NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errorMessage" TEXT,
    "m15Attempted" BOOLEAN NOT NULL,

    CONSTRAINT "safeguard_escalation_fallbacks_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 8. Create Indexes
-- ============================================

-- safeguard_incidents
CREATE INDEX "safeguard_incidents_organizationId_status_severity_idx" ON "safeguard_incidents"("organizationId", "status", "severity");
CREATE INDEX "safeguard_incidents_organizationId_createdAt_idx" ON "safeguard_incidents"("organizationId", "createdAt" DESC);
CREATE INDEX "safeguard_incidents_organizationId_cohortId_status_idx" ON "safeguard_incidents"("organizationId", "cohortId", "status");
CREATE INDEX "safeguard_incidents_affectedUserId_idx" ON "safeguard_incidents"("affectedUserId");
CREATE INDEX "safeguard_incidents_reportedById_idx" ON "safeguard_incidents"("reportedById");
CREATE INDEX "safeguard_incidents_claimedById_idx" ON "safeguard_incidents"("claimedById");
CREATE INDEX "safeguard_incidents_occurredAt_idx" ON "safeguard_incidents"("occurredAt" DESC);

-- consequence_logs
CREATE INDEX "consequence_logs_organizationId_userId_status_idx" ON "consequence_logs"("organizationId", "userId", "status");
CREATE INDEX "consequence_logs_organizationId_assignedById_createdAt_idx" ON "consequence_logs"("organizationId", "assignedById", "createdAt" DESC);
CREATE INDEX "consequence_logs_organizationId_status_deadline_idx" ON "consequence_logs"("organizationId", "status", "deadline");
CREATE INDEX "consequence_logs_relatedIncidentId_idx" ON "consequence_logs"("relatedIncidentId");
CREATE INDEX "consequence_logs_type_idx" ON "consequence_logs"("type");

-- incident_timeline_entries
CREATE INDEX "incident_timeline_entries_incidentId_createdAt_idx" ON "incident_timeline_entries"("incidentId", "createdAt");
CREATE INDEX "incident_timeline_entries_organizationId_createdAt_idx" ON "incident_timeline_entries"("organizationId", "createdAt" DESC);
CREATE INDEX "incident_timeline_entries_actorId_createdAt_idx" ON "incident_timeline_entries"("actorId", "createdAt" DESC);
CREATE INDEX "incident_timeline_entries_action_idx" ON "incident_timeline_entries"("action");

-- safeguard_escalation_fallbacks
CREATE INDEX "safeguard_escalation_fallbacks_organizationId_attemptedAt_idx" ON "safeguard_escalation_fallbacks"("organizationId", "attemptedAt" DESC);
CREATE INDEX "safeguard_escalation_fallbacks_incidentId_idx" ON "safeguard_escalation_fallbacks"("incidentId");

-- ============================================
-- 9. Add Foreign Keys
-- ============================================

ALTER TABLE "safeguard_incidents" ADD CONSTRAINT "safeguard_incidents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safeguard_incidents" ADD CONSTRAINT "safeguard_incidents_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safeguard_incidents" ADD CONSTRAINT "safeguard_incidents_kpGroupId_fkey" FOREIGN KEY ("kpGroupId") REFERENCES "kp_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "safeguard_incidents" ADD CONSTRAINT "safeguard_incidents_affectedUserId_fkey" FOREIGN KEY ("affectedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "safeguard_incidents" ADD CONSTRAINT "safeguard_incidents_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safeguard_incidents" ADD CONSTRAINT "safeguard_incidents_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "safeguard_incidents" ADD CONSTRAINT "safeguard_incidents_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "safeguard_incidents" ADD CONSTRAINT "safeguard_incidents_escalatedById_fkey" FOREIGN KEY ("escalatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "safeguard_incidents" ADD CONSTRAINT "safeguard_incidents_retractedById_fkey" FOREIGN KEY ("retractedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "consequence_logs" ADD CONSTRAINT "consequence_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consequence_logs" ADD CONSTRAINT "consequence_logs_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consequence_logs" ADD CONSTRAINT "consequence_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consequence_logs" ADD CONSTRAINT "consequence_logs_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consequence_logs" ADD CONSTRAINT "consequence_logs_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "consequence_logs" ADD CONSTRAINT "consequence_logs_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "consequence_logs" ADD CONSTRAINT "consequence_logs_relatedIncidentId_fkey" FOREIGN KEY ("relatedIncidentId") REFERENCES "safeguard_incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incident_timeline_entries" ADD CONSTRAINT "incident_timeline_entries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "incident_timeline_entries" ADD CONSTRAINT "incident_timeline_entries_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "safeguard_incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "incident_timeline_entries" ADD CONSTRAINT "incident_timeline_entries_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "safeguard_escalation_fallbacks" ADD CONSTRAINT "safeguard_escalation_fallbacks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safeguard_escalation_fallbacks" ADD CONSTRAINT "safeguard_escalation_fallbacks_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "safeguard_incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safeguard_escalation_fallbacks" ADD CONSTRAINT "safeguard_escalation_fallbacks_receiverUserId_fkey" FOREIGN KEY ("receiverUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- 10. Enable RLS + Create Policies
-- ============================================

ALTER TABLE "safeguard_incidents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consequence_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "incident_timeline_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "safeguard_escalation_fallbacks" ENABLE ROW LEVEL SECURITY;

CREATE POLICY safeguard_incident_org_isolation ON "safeguard_incidents"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR current_setting('app.bypass_rls', true) = 'true'
  );

CREATE POLICY consequence_log_org_isolation ON "consequence_logs"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR current_setting('app.bypass_rls', true) = 'true'
    OR "userId" = NULLIF(current_setting('app.current_user_id', true), '')::text
  );

CREATE POLICY timeline_read ON "incident_timeline_entries"
  FOR SELECT
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR current_setting('app.bypass_rls', true) = 'true'
  );

CREATE POLICY timeline_insert ON "incident_timeline_entries"
  FOR INSERT
  WITH CHECK (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR current_setting('app.bypass_rls', true) = 'true'
  );

CREATE POLICY escalation_fallback_org_isolation ON "safeguard_escalation_fallbacks"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- ============================================
-- 11. Revoke UPDATE/DELETE on timeline (append-only enforcement)
-- ============================================
-- NOTE: Only revoke if app_user role exists. Skipped silently if role does not exist in dev.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    EXECUTE 'REVOKE UPDATE, DELETE ON incident_timeline_entries FROM app_user';
  END IF;
END
$$;
