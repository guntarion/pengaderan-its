-- M03: Struktur Angkatan — KP Group, Buddy Pair, Kasuh Pair, Pairing Request
-- Migration: nawasena_struktur_angkatan
-- Applied: 2026-04-24

-- ============================================================
-- 1. Add shareContact + interests to User (from M01 extension)
-- ============================================================
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "shareContact" BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "interests" JSONB NOT NULL DEFAULT '[]';

-- ============================================================
-- 2. Extend AuditAction enum with M03 values
-- ============================================================
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KP_GROUP_CREATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KP_GROUP_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KP_GROUP_ARCHIVE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KP_GROUP_ASSIGN_MEMBER';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KP_GROUP_REMOVE_MEMBER';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KP_GROUP_COORDINATOR_REPLACE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BUDDY_PAIR_CREATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BUDDY_PAIR_SWAP';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BUDDY_PAIR_ARCHIVE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KASUH_PAIR_CREATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KASUH_PAIR_REASSIGN';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KASUH_PAIR_ARCHIVE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PAIRING_REQUEST_CREATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PAIRING_REQUEST_APPROVE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PAIRING_REQUEST_REJECT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PAIRING_REQUEST_FULFILL';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PAIRING_REQUEST_CANCEL';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BULK_PAIRING_COMMIT';

-- ============================================================
-- 3. Create M03 enums
-- ============================================================
CREATE TYPE "PairStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'REASSIGNED');
CREATE TYPE "KPGroupStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "PairingRequestType" AS ENUM ('RE_PAIR_KASUH', 'KASUH_UNREACHABLE', 'KP_GROUP_TRANSFER', 'BUDDY_REASSIGN');
CREATE TYPE "PairingRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED', 'CANCELLED');

-- ============================================================
-- 4. Create KPGroup table
-- ============================================================
CREATE TABLE "kp_groups" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kpCoordinatorUserId" TEXT NOT NULL,
    "assistantUserIds" TEXT[] NOT NULL DEFAULT '{}',
    "capacityTarget" INTEGER NOT NULL DEFAULT 12,
    "capacityMax" INTEGER NOT NULL DEFAULT 15,
    "status" "KPGroupStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "kp_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "kp_groups_cohortId_code_key" ON "kp_groups"("cohortId", "code");
CREATE UNIQUE INDEX "kp_groups_cohortId_kpCoordinatorUserId_key" ON "kp_groups"("cohortId", "kpCoordinatorUserId");
CREATE INDEX "kp_groups_organizationId_cohortId_status_idx" ON "kp_groups"("organizationId", "cohortId", "status");
CREATE INDEX "kp_groups_cohortId_status_idx" ON "kp_groups"("cohortId", "status");

ALTER TABLE "kp_groups" ADD CONSTRAINT "kp_groups_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kp_groups" ADD CONSTRAINT "kp_groups_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kp_groups" ADD CONSTRAINT "kp_groups_kpCoordinatorUserId_fkey" FOREIGN KEY ("kpCoordinatorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kp_groups" ADD CONSTRAINT "kp_groups_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- 5. Create KPGroupMember table
-- ============================================================
CREATE TABLE "kp_group_members" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "kpGroupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memberType" TEXT NOT NULL DEFAULT 'MABA',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "leftReason" TEXT,
    "status" "PairStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "kp_group_members_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "kp_group_members_kpGroupId_status_idx" ON "kp_group_members"("kpGroupId", "status");
CREATE INDEX "kp_group_members_organizationId_cohortId_idx" ON "kp_group_members"("organizationId", "cohortId");
CREATE INDEX "kp_group_members_userId_status_idx" ON "kp_group_members"("userId", "status");

ALTER TABLE "kp_group_members" ADD CONSTRAINT "kp_group_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kp_group_members" ADD CONSTRAINT "kp_group_members_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kp_group_members" ADD CONSTRAINT "kp_group_members_kpGroupId_fkey" FOREIGN KEY ("kpGroupId") REFERENCES "kp_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kp_group_members" ADD CONSTRAINT "kp_group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- 6. Create BulkPairingBatch table (before BuddyPair which references it)
-- ============================================================
CREATE TABLE "bulk_pairing_batches" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "batchType" TEXT NOT NULL,
    "algorithmVersion" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "committedBy" TEXT NOT NULL,
    "committedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previewTokenHash" TEXT,

    CONSTRAINT "bulk_pairing_batches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bulk_pairing_batches_cohortId_batchType_committedAt_idx" ON "bulk_pairing_batches"("cohortId", "batchType", "committedAt");
CREATE INDEX "bulk_pairing_batches_organizationId_cohortId_idx" ON "bulk_pairing_batches"("organizationId", "cohortId");

ALTER TABLE "bulk_pairing_batches" ADD CONSTRAINT "bulk_pairing_batches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bulk_pairing_batches" ADD CONSTRAINT "bulk_pairing_batches_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bulk_pairing_batches" ADD CONSTRAINT "bulk_pairing_batches_committedBy_fkey" FOREIGN KEY ("committedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- 7. Create BuddyPair table
-- ============================================================
CREATE TABLE "buddy_pairs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "reasonForPairing" TEXT NOT NULL,
    "isCrossDemographic" BOOLEAN NOT NULL,
    "algorithmVersion" TEXT NOT NULL,
    "algorithmSeed" TEXT NOT NULL,
    "generationBatchId" TEXT,
    "isTriple" BOOLEAN NOT NULL DEFAULT FALSE,
    "status" "PairStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "buddy_pairs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "buddy_pairs_cohortId_status_idx" ON "buddy_pairs"("cohortId", "status");
CREATE INDEX "buddy_pairs_organizationId_cohortId_idx" ON "buddy_pairs"("organizationId", "cohortId");
CREATE INDEX "buddy_pairs_generationBatchId_idx" ON "buddy_pairs"("generationBatchId");

ALTER TABLE "buddy_pairs" ADD CONSTRAINT "buddy_pairs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "buddy_pairs" ADD CONSTRAINT "buddy_pairs_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "buddy_pairs" ADD CONSTRAINT "buddy_pairs_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "buddy_pairs" ADD CONSTRAINT "buddy_pairs_generationBatchId_fkey" FOREIGN KEY ("generationBatchId") REFERENCES "bulk_pairing_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- 8. Create BuddyPairMember table
-- ============================================================
CREATE TABLE "buddy_pair_members" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "buddyPairId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "status" "PairStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "buddy_pair_members_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "buddy_pair_members_buddyPairId_status_idx" ON "buddy_pair_members"("buddyPairId", "status");
CREATE INDEX "buddy_pair_members_cohortId_userId_idx" ON "buddy_pair_members"("cohortId", "userId");

ALTER TABLE "buddy_pair_members" ADD CONSTRAINT "buddy_pair_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "buddy_pair_members" ADD CONSTRAINT "buddy_pair_members_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "buddy_pair_members" ADD CONSTRAINT "buddy_pair_members_buddyPairId_fkey" FOREIGN KEY ("buddyPairId") REFERENCES "buddy_pairs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "buddy_pair_members" ADD CONSTRAINT "buddy_pair_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- 9. Create KasuhPair table (self-referential + FK to PairingRequest resolved after)
-- ============================================================
CREATE TABLE "kasuh_pairs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "mabaUserId" TEXT NOT NULL,
    "kasuhUserId" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "matchReasons" TEXT[] NOT NULL DEFAULT '{}',
    "algorithmVersion" TEXT NOT NULL,
    "status" "PairStatus" NOT NULL DEFAULT 'ACTIVE',
    "previousPairId" TEXT,
    "reassignedFromRequestId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    "endReason" TEXT,

    CONSTRAINT "kasuh_pairs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "kasuh_pairs_cohortId_status_idx" ON "kasuh_pairs"("cohortId", "status");
CREATE INDEX "kasuh_pairs_mabaUserId_status_idx" ON "kasuh_pairs"("mabaUserId", "status");
CREATE INDEX "kasuh_pairs_kasuhUserId_status_idx" ON "kasuh_pairs"("kasuhUserId", "status");
CREATE INDEX "kasuh_pairs_organizationId_cohortId_idx" ON "kasuh_pairs"("organizationId", "cohortId");

ALTER TABLE "kasuh_pairs" ADD CONSTRAINT "kasuh_pairs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kasuh_pairs" ADD CONSTRAINT "kasuh_pairs_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kasuh_pairs" ADD CONSTRAINT "kasuh_pairs_mabaUserId_fkey" FOREIGN KEY ("mabaUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kasuh_pairs" ADD CONSTRAINT "kasuh_pairs_kasuhUserId_fkey" FOREIGN KEY ("kasuhUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kasuh_pairs" ADD CONSTRAINT "kasuh_pairs_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kasuh_pairs" ADD CONSTRAINT "kasuh_pairs_previousPairId_fkey" FOREIGN KEY ("previousPairId") REFERENCES "kasuh_pairs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- 10. Create PairingRequest table
-- ============================================================
CREATE TABLE "pairing_requests" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "subjectUserId" TEXT,
    "type" "PairingRequestType" NOT NULL,
    "status" "PairingRequestStatus" NOT NULL DEFAULT 'PENDING',
    "currentKasuhPairId" TEXT,
    "currentKPGroupMemberId" TEXT,
    "currentBuddyPairMemberId" TEXT,
    "optionalNote" TEXT,
    "preferenceHint" JSONB,
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "fulfilledKasuhPairId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pairing_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pairing_requests_organizationId_cohortId_status_idx" ON "pairing_requests"("organizationId", "cohortId", "status");
CREATE INDEX "pairing_requests_requesterUserId_createdAt_idx" ON "pairing_requests"("requesterUserId", "createdAt" DESC);
CREATE INDEX "pairing_requests_status_createdAt_idx" ON "pairing_requests"("status", "createdAt" DESC);
CREATE INDEX "pairing_requests_type_status_idx" ON "pairing_requests"("type", "status");

ALTER TABLE "pairing_requests" ADD CONSTRAINT "pairing_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pairing_requests" ADD CONSTRAINT "pairing_requests_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pairing_requests" ADD CONSTRAINT "pairing_requests_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pairing_requests" ADD CONSTRAINT "pairing_requests_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pairing_requests" ADD CONSTRAINT "pairing_requests_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pairing_requests" ADD CONSTRAINT "pairing_requests_currentKasuhPairId_fkey" FOREIGN KEY ("currentKasuhPairId") REFERENCES "kasuh_pairs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pairing_requests" ADD CONSTRAINT "pairing_requests_fulfilledKasuhPairId_fkey" FOREIGN KEY ("fulfilledKasuhPairId") REFERENCES "kasuh_pairs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add FK from KasuhPair to PairingRequest (after both tables created)
ALTER TABLE "kasuh_pairs" ADD CONSTRAINT "kasuh_pairs_reassignedFromRequestId_fkey" FOREIGN KEY ("reassignedFromRequestId") REFERENCES "pairing_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- 11. Enable Row Level Security on all M03 tables
-- ============================================================
ALTER TABLE "kp_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "kp_group_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "buddy_pairs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "buddy_pair_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "kasuh_pairs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pairing_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bulk_pairing_batches" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 12. RLS Policies per table (org isolation pattern from M01)
-- ============================================================

-- KPGroup: org isolation
CREATE POLICY kpgroup_org_isolation ON "kp_groups"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- KPGroupMember: org isolation
CREATE POLICY kpgroup_member_org_isolation ON "kp_group_members"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- BuddyPair: org isolation
CREATE POLICY buddy_pair_org_isolation ON "buddy_pairs"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- BuddyPairMember: org isolation
CREATE POLICY buddy_pair_member_org_isolation ON "buddy_pair_members"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- KasuhPair: org isolation + user-self read (maba + kasuh)
CREATE POLICY kasuh_pair_org_isolation ON "kasuh_pairs"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR current_setting('app.bypass_rls', true) = 'true'
    OR "mabaUserId" = NULLIF(current_setting('app.current_user_id', true), '')::text
    OR "kasuhUserId" = NULLIF(current_setting('app.current_user_id', true), '')::text
  );

-- PairingRequest: org isolation + requester can read own
CREATE POLICY pairing_request_org_isolation ON "pairing_requests"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR current_setting('app.bypass_rls', true) = 'true'
    OR "requesterUserId" = NULLIF(current_setting('app.current_user_id', true), '')::text
  );

-- BulkPairingBatch: org isolation
CREATE POLICY bulk_pairing_batch_org_isolation ON "bulk_pairing_batches"
  FOR ALL
  USING (
    "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')::text
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- ============================================================
-- 13. Partial unique indexes (enforce 1 ACTIVE pair per user per cohort)
-- ============================================================

-- One ACTIVE KPGroupMember per user per cohort
CREATE UNIQUE INDEX kpgroup_member_active_unique
  ON "kp_group_members" ("cohortId", "userId")
  WHERE status = 'ACTIVE';

-- One ACTIVE BuddyPairMember per user per cohort
CREATE UNIQUE INDEX buddy_pair_member_active_unique
  ON "buddy_pair_members" ("cohortId", "userId")
  WHERE status = 'ACTIVE';

-- One ACTIVE KasuhPair per maba per cohort
CREATE UNIQUE INDEX kasuh_pair_active_per_maba
  ON "kasuh_pairs" ("cohortId", "mabaUserId")
  WHERE status = 'ACTIVE';

-- ============================================================
-- 14. Performance indexes
-- ============================================================

-- KasuhPair kasuh capacity lookup
CREATE INDEX "kasuh_pairs_kasuhUserId_cohortId_status_idx" ON "kasuh_pairs"("kasuhUserId", "cohortId", "status");

-- PairingRequest re-pair limit check
CREATE INDEX "pairing_requests_requesterUserId_type_createdAt_idx" ON "pairing_requests"("requesterUserId", "type", "createdAt" DESC);
