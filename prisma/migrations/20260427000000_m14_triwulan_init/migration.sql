-- M14 Triwulan Review, Sign-off & Audit
-- Migration: m14_triwulan_init
-- Tables: TriwulanReview, TriwulanSignatureEvent, AuditSubstansiResult
-- + RLS policies, REVOKE UPDATE/DELETE on signature events, partial unique index

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'SUBMITTED_FOR_PEMBINA', 'PEMBINA_SIGNED', 'BLM_ACKNOWLEDGED', 'FINALIZED', 'ARCHIVED_BY_REGENERATE');

CREATE TYPE "PDFStatus" AS ENUM ('NOT_GENERATED', 'PENDING', 'RENDERING', 'READY', 'FAILED');

CREATE TYPE "TriwulanSignatureAction" AS ENUM ('GENERATE', 'SC_EDIT_DRAFT', 'SUBMIT_TO_PEMBINA', 'PEMBINA_SIGN', 'PEMBINA_REQUEST_REVISION', 'BLM_AUDIT_ITEM_TICK', 'BLM_ACKNOWLEDGE', 'BLM_REQUEST_REVISION', 'FINALIZE', 'PDF_RENDER_SUCCESS', 'PDF_RENDER_FAIL', 'PDF_DOWNLOAD', 'ARCHIVE_VIEW');

CREATE TYPE "MuatanWajibKey" AS ENUM ('NARASI_SEPULUH_NOPEMBER', 'ADVANCING_HUMANITY', 'ENAM_TATA_NILAI_ITS', 'INTEGRALISTIK', 'STRUKTUR_KM_ITS', 'TRI_DHARMA', 'KODE_ETIK_MAHASISWA', 'PERMEN_55_2024_SATGAS', 'RISET_ITS', 'KEINSINYURAN_PII');

CREATE TYPE "MuatanCoverageStatus" AS ENUM ('NOT_ASSESSED', 'COVERED', 'PARTIAL', 'NOT_COVERED');

CREATE TYPE "TriwulanEscalationLevel" AS ENUM ('NONE', 'WARNING', 'URGENT');

CREATE TYPE "EscalationRuleKey" AS ENUM ('RETENTION_LOW', 'FORBIDDEN_ACTS_VIOLATION', 'INCIDENTS_RED_UNRESOLVED', 'ANON_HARASSMENT_PRESENT', 'PAKTA_SIGNING_LOW', 'NPS_NEGATIVE', 'CUSTOM');

-- ============================================
-- TABLE: triwulan_reviews
-- ============================================

CREATE TABLE "triwulan_reviews" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "quarterNumber" INTEGER NOT NULL,
    "quarterStartDate" TIMESTAMP(3) NOT NULL,
    "quarterEndDate" TIMESTAMP(3) NOT NULL,
    "dataSnapshotJsonb" JSONB NOT NULL,
    "snapshotVersion" TEXT NOT NULL DEFAULT '1.0',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedById" TEXT NOT NULL,
    "executiveSummary" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "escalationLevel" "TriwulanEscalationLevel" NOT NULL DEFAULT 'NONE',
    "previousReviewId" TEXT,
    "supersededByReviewId" TEXT,
    "revisionReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "pembinaSignedAt" TIMESTAMP(3),
    "pembinaSignedById" TEXT,
    "pembinaNotes" TEXT,
    "pembinaInPersonReviewed" BOOLEAN NOT NULL DEFAULT false,
    "blmAcknowledgedAt" TIMESTAMP(3),
    "blmAcknowledgedById" TEXT,
    "blmNotes" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "pdfStatus" "PDFStatus" NOT NULL DEFAULT 'NOT_GENERATED',
    "pdfStorageKey" TEXT,
    "pdfRenderedAt" TIMESTAMP(3),
    "pdfLastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "triwulan_reviews_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- TABLE: triwulan_signature_events
-- ============================================

CREATE TABLE "triwulan_signature_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "TriwulanSignatureAction" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "notes" TEXT,
    "metadata" JSONB,

    CONSTRAINT "triwulan_signature_events_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- TABLE: audit_substansi_results
-- ============================================

CREATE TABLE "audit_substansi_results" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "itemKey" "MuatanWajibKey" NOT NULL,
    "coverage" "MuatanCoverageStatus" NOT NULL DEFAULT 'NOT_ASSESSED',
    "evidenceRef" TEXT,
    "notes" TEXT,
    "assessedById" TEXT,
    "assessedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_substansi_results_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX "tr_cohort_q_status" ON "triwulan_reviews"("cohortId", "quarterNumber", "status");
CREATE INDEX "tr_org_status_finalized" ON "triwulan_reviews"("organizationId", "status", "finalizedAt" DESC);
CREATE INDEX "tr_archive_read" ON "triwulan_reviews"("cohortId", "status", "finalizedAt" DESC);
CREATE INDEX "triwulan_reviews_pembinaSignedById_idx" ON "triwulan_reviews"("pembinaSignedById");
CREATE INDEX "triwulan_reviews_blmAcknowledgedById_idx" ON "triwulan_reviews"("blmAcknowledgedById");

CREATE INDEX "tse_review_timeline" ON "triwulan_signature_events"("reviewId", "timestamp" DESC);
CREATE INDEX "tse_actor_action" ON "triwulan_signature_events"("actorId", "action", "timestamp" DESC);
CREATE INDEX "triwulan_signature_events_organizationId_action_timestamp_idx" ON "triwulan_signature_events"("organizationId", "action", "timestamp" DESC);

CREATE UNIQUE INDEX "asr_review_item_unique" ON "audit_substansi_results"("reviewId", "itemKey");
CREATE INDEX "asr_review_coverage" ON "audit_substansi_results"("reviewId", "coverage");
CREATE INDEX "asr_org_item_analytics" ON "audit_substansi_results"("organizationId", "itemKey", "coverage");

-- CRITICAL: Partial unique index — 1 active (non-superseded) review per cohort + quarter
CREATE UNIQUE INDEX "tr_partial_active_unique" ON "triwulan_reviews" ("cohortId", "quarterNumber") WHERE "supersededByReviewId" IS NULL;

-- ============================================
-- FOREIGN KEYS
-- ============================================

ALTER TABLE "triwulan_reviews" ADD CONSTRAINT "triwulan_reviews_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "triwulan_reviews" ADD CONSTRAINT "triwulan_reviews_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "triwulan_reviews" ADD CONSTRAINT "triwulan_reviews_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "triwulan_reviews" ADD CONSTRAINT "triwulan_reviews_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "triwulan_reviews" ADD CONSTRAINT "triwulan_reviews_pembinaSignedById_fkey" FOREIGN KEY ("pembinaSignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "triwulan_reviews" ADD CONSTRAINT "triwulan_reviews_blmAcknowledgedById_fkey" FOREIGN KEY ("blmAcknowledgedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "triwulan_reviews" ADD CONSTRAINT "triwulan_reviews_previousReviewId_fkey" FOREIGN KEY ("previousReviewId") REFERENCES "triwulan_reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "triwulan_signature_events" ADD CONSTRAINT "triwulan_signature_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "triwulan_signature_events" ADD CONSTRAINT "triwulan_signature_events_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "triwulan_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "triwulan_signature_events" ADD CONSTRAINT "triwulan_signature_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "audit_substansi_results" ADD CONSTRAINT "audit_substansi_results_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_substansi_results" ADD CONSTRAINT "audit_substansi_results_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "triwulan_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_substansi_results" ADD CONSTRAINT "audit_substansi_results_assessedById_fkey" FOREIGN KEY ("assessedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- TriwulanReview
ALTER TABLE "triwulan_reviews" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tr_tenant_select ON "triwulan_reviews"
  FOR SELECT
  USING (
    "organizationId" = current_setting('app.current_org_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'true'
  );

CREATE POLICY tr_tenant_insert ON "triwulan_reviews"
  FOR INSERT
  WITH CHECK (
    "organizationId" = current_setting('app.current_org_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'true'
  );

CREATE POLICY tr_tenant_update ON "triwulan_reviews"
  FOR UPDATE
  USING (
    "organizationId" = current_setting('app.current_org_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- TriwulanSignatureEvent (append-only via RLS + REVOKE)
ALTER TABLE "triwulan_signature_events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tse_tenant_select ON "triwulan_signature_events"
  FOR SELECT
  USING (
    "organizationId" = current_setting('app.current_org_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'true'
  );

CREATE POLICY tse_tenant_insert ON "triwulan_signature_events"
  FOR INSERT
  WITH CHECK (
    "organizationId" = current_setting('app.current_org_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- CRITICAL: DB-level append-only enforcement for signature events
-- app_role cannot modify or delete signature events (tampering protection)
-- NOTE: This REVOKE will silently succeed even if app_role doesn't exist yet.
-- In production, ensure app_role is the role your connection pool uses.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_role') THEN
    REVOKE UPDATE, DELETE ON "triwulan_signature_events" FROM app_role;
  END IF;
END;
$$;

-- AuditSubstansiResult
ALTER TABLE "audit_substansi_results" ENABLE ROW LEVEL SECURITY;

CREATE POLICY asr_tenant_all ON "audit_substansi_results"
  FOR ALL
  USING (
    "organizationId" = current_setting('app.current_org_id', true)::text
    OR current_setting('app.bypass_rls', true) = 'true'
  );
