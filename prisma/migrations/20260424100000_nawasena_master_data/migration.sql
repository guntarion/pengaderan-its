-- NAWASENA M02 Master Data Migration
-- Creates 11 master data tables + 12 enums.
-- Extends AuditAction enum with M02 events.
-- Adds publicCatalogEnabled to organizations.
-- Enables RLS on kegiatan table.

-- ============================================
-- Step 1: Extend AuditAction enum (M02 events)
-- ============================================
-- PostgreSQL requires a transaction for ALTER TYPE ADD VALUE in some cases.
-- These are safe to run outside of a transaction (they're not transactional anyway).

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MASTER_DATA_SEED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MASTER_DATA_SEED_FAILED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TAXONOMY_META_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KEGIATAN_TOGGLE_ACTIVE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PUBLIC_CATALOG_TOGGLED';

-- ============================================
-- Step 2: Create M02 enums (12 new types)
-- ============================================

CREATE TYPE "NilaiKey" AS ENUM (
  'N1_BUDAYA', 'N2_LINGKUNGAN', 'N3_EMPAT_BIDANG', 'N4_KEPROFESIAN',
  'N5_HMTC_ITS', 'N6_REGENERASI', 'N7_KESEJAHTERAAN', 'N8_PENGABDIAN'
);

CREATE TYPE "DimensiKey" AS ENUM (
  'D1_ORANG', 'D2_FASILITAS', 'D3_BIDANG_PEMBELAJARAN', 'D4_KARIR',
  'D5_KEMAHASISWAAN', 'D6_AKADEMIK', 'D7_KEKOMPAKAN', 'D8_LOYALITAS',
  'D9_MENTAL_POSITIF', 'D10_KEPEDULIAN_SOSIAL', 'D11_KEINSINYURAN'
);

CREATE TYPE "FaseKey" AS ENUM (
  'F0_PRA', 'F1_FOUNDATION', 'F2_CHALLENGE', 'F3_PEAK', 'F4_INTEGRATION'
);

CREATE TYPE "KategoriKey" AS ENUM (
  'K1_KONTRAK_SAFEGUARD', 'K2_PENGENALAN_RELASIONAL', 'K3_FASILITAS',
  'K4_AKADEMIK_KEPROFESIAN', 'K5_SOLIDARITAS_ANGKATAN', 'K6_KESEJAHTERAAN', 'K7_PENGABDIAN'
);

CREATE TYPE "KegiatanIntensity" AS ENUM ('RINGAN', 'SEDANG', 'BERAT');

CREATE TYPE "KegiatanScale" AS ENUM (
  'INDIVIDUAL', 'KP', 'CROSS_KP', 'ANGKATAN', 'MULTI_ANGKATAN'
);

CREATE TYPE "KPIType" AS ENUM ('HIGHER_BETTER', 'LOWER_BETTER', 'ZERO_ONE', 'RANGE');

CREATE TYPE "EvidenceType" AS ENUM (
  'TANDA_TANGAN', 'FOTO', 'QR_STAMP', 'FILE', 'LOGBOOK', 'ATTENDANCE'
);

CREATE TYPE "ForbiddenActSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

CREATE TYPE "TaxonomyGroup" AS ENUM ('NILAI', 'DIMENSI', 'FASE', 'KATEGORI');

CREATE TYPE "FormPriority" AS ENUM (
  'WAJIB', 'WAJIB_OPT_OUT', 'ENCOURAGED', 'OPTIONAL', 'ON_DEMAND'
);

CREATE TYPE "FormFrequency" AS ENUM (
  'DAILY', 'WEEKLY', 'BI_WEEKLY', 'PER_EVENT', 'PER_MILESTONE',
  'ON_DEMAND', 'ONE_TIME', 'CUSTOM'
);

-- ============================================
-- Step 3: Add publicCatalogEnabled to organizations
-- ============================================

ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "publicCatalogEnabled" BOOLEAN NOT NULL DEFAULT false;

-- ============================================
-- Step 4: Create TaxonomyMeta table (no FK deps)
-- ============================================

CREATE TABLE "taxonomy_meta" (
    "id"           TEXT NOT NULL,
    "group"        "TaxonomyGroup" NOT NULL,
    "labelId"      TEXT NOT NULL,
    "labelEn"      TEXT NOT NULL,
    "deskripsi"    TEXT,
    "displayOrder" INTEGER NOT NULL,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "taxonomy_meta_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "taxonomy_meta_group_displayOrder_idx" ON "taxonomy_meta"("group", "displayOrder");

-- ============================================
-- Step 5: Create Kegiatan table (FK → organizations)
-- ============================================

CREATE TABLE "kegiatan" (
    "id"              TEXT NOT NULL,
    "nama"            TEXT NOT NULL,
    "deskripsiSingkat" VARCHAR(500) NOT NULL,
    "deskripsiFull"   TEXT,
    "rasional"        TEXT NOT NULL,
    "safeguardNotes"  TEXT,
    "nilai"           "NilaiKey" NOT NULL,
    "dimensi"         "DimensiKey" NOT NULL,
    "fase"            "FaseKey" NOT NULL,
    "kategori"        "KategoriKey" NOT NULL,
    "intensity"       "KegiatanIntensity" NOT NULL,
    "scale"           "KegiatanScale" NOT NULL,
    "durasiMenit"     INTEGER NOT NULL,
    "frekuensi"       TEXT NOT NULL,
    "picRoleHint"     TEXT,
    "prasyaratIds"    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "isActive"        BOOLEAN NOT NULL DEFAULT true,
    "isGlobal"        BOOLEAN NOT NULL DEFAULT false,
    "organizationId"  TEXT,
    "displayOrder"    INTEGER NOT NULL DEFAULT 0,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kegiatan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "kegiatan_global_xor_org" CHECK (
        ("isGlobal" = true AND "organizationId" IS NULL)
        OR ("isGlobal" = false AND "organizationId" IS NOT NULL)
    )
);

ALTER TABLE "kegiatan"
    ADD CONSTRAINT "kegiatan_organizationId_fkey"
    FOREIGN KEY ("organizationId")
    REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "kegiatan_fase_idx" ON "kegiatan"("fase");
CREATE INDEX "kegiatan_kategori_idx" ON "kegiatan"("kategori");
CREATE INDEX "kegiatan_nilai_idx" ON "kegiatan"("nilai");
CREATE INDEX "kegiatan_organizationId_isActive_idx" ON "kegiatan"("organizationId", "isActive");
CREATE INDEX "kegiatan_isGlobal_isActive_idx" ON "kegiatan"("isGlobal", "isActive");
CREATE INDEX "kegiatan_displayOrder_idx" ON "kegiatan"("displayOrder");

-- ============================================
-- Step 6: Create Tujuan, KPIDef, AnchorRef, PassportItem (FK → kegiatan)
-- ============================================

CREATE TABLE "tujuan" (
    "id"         TEXT NOT NULL,
    "kegiatanId" TEXT NOT NULL,
    "ordinal"    INTEGER NOT NULL,
    "text"       TEXT NOT NULL,

    CONSTRAINT "tujuan_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "tujuan"
    ADD CONSTRAINT "tujuan_kegiatanId_fkey"
    FOREIGN KEY ("kegiatanId")
    REFERENCES "kegiatan"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "tujuan_kegiatanId_ordinal_idx" ON "tujuan"("kegiatanId", "ordinal");

CREATE TABLE "kpi_defs" (
    "id"            TEXT NOT NULL,
    "kegiatanId"    TEXT NOT NULL,
    "text"          TEXT NOT NULL,
    "type"          "KPIType" NOT NULL,
    "targetNumeric" DOUBLE PRECISION,
    "unit"          TEXT,
    "isLeading"     BOOLEAN NOT NULL DEFAULT true,
    "measureMethod" TEXT,
    "outputField"   TEXT,
    "outcomeField"  TEXT,

    CONSTRAINT "kpi_defs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "kpi_defs"
    ADD CONSTRAINT "kpi_defs_kegiatanId_fkey"
    FOREIGN KEY ("kegiatanId")
    REFERENCES "kegiatan"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "kpi_defs_kegiatanId_idx" ON "kpi_defs"("kegiatanId");

CREATE TABLE "anchor_refs" (
    "id"         TEXT NOT NULL,
    "kegiatanId" TEXT NOT NULL,
    "source"     TEXT NOT NULL,
    "link"       TEXT,
    "excerpt"    TEXT,

    CONSTRAINT "anchor_refs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "anchor_refs"
    ADD CONSTRAINT "anchor_refs_kegiatanId_fkey"
    FOREIGN KEY ("kegiatanId")
    REFERENCES "kegiatan"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "anchor_refs_kegiatanId_idx" ON "anchor_refs"("kegiatanId");

CREATE TABLE "passport_items" (
    "id"               TEXT NOT NULL,
    "dimensi"          "DimensiKey" NOT NULL,
    "kegiatanId"       TEXT,
    "description"      TEXT NOT NULL,
    "targetWaktu"      TEXT NOT NULL,
    "evidenceType"     "EvidenceType" NOT NULL,
    "verifierRoleHint" TEXT NOT NULL,
    "ordinal"          INTEGER NOT NULL,

    CONSTRAINT "passport_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "passport_items"
    ADD CONSTRAINT "passport_items_kegiatanId_fkey"
    FOREIGN KEY ("kegiatanId")
    REFERENCES "kegiatan"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "passport_items_dimensi_ordinal_idx" ON "passport_items"("dimensi", "ordinal");
CREATE INDEX "passport_items_kegiatanId_idx" ON "passport_items"("kegiatanId");

-- ============================================
-- Step 7: Create Rubrik, ForbiddenAct, SafeguardProtocol (global, no FK)
-- ============================================

CREATE TABLE "rubrik" (
    "id"                    TEXT NOT NULL,
    "rubrikKey"             TEXT NOT NULL,
    "rubrikLabel"           TEXT NOT NULL,
    "level"                 INTEGER NOT NULL,
    "levelLabel"            TEXT NOT NULL,
    "levelDescriptor"       TEXT NOT NULL,
    "applicableKegiatanIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "rubrik_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "rubrik_rubrikKey_level_key" UNIQUE ("rubrikKey", "level")
);

CREATE INDEX "rubrik_rubrikKey_idx" ON "rubrik"("rubrikKey");

CREATE TABLE "forbidden_acts" (
    "id"               TEXT NOT NULL,
    "category"         TEXT NOT NULL,
    "description"      TEXT NOT NULL,
    "regulationSource" TEXT NOT NULL,
    "severity"         "ForbiddenActSeverity" NOT NULL,
    "consequence"      TEXT NOT NULL,
    "detectionSignal"  TEXT NOT NULL,
    "ordinal"          INTEGER NOT NULL,

    CONSTRAINT "forbidden_acts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "forbidden_acts_severity_idx" ON "forbidden_acts"("severity");
CREATE INDEX "forbidden_acts_ordinal_idx" ON "forbidden_acts"("ordinal");

CREATE TABLE "safeguard_protocols" (
    "id"              TEXT NOT NULL,
    "mechanism"       TEXT NOT NULL,
    "description"     TEXT NOT NULL,
    "whenActivated"   TEXT NOT NULL,
    "responsibleRole" TEXT NOT NULL,
    "protocolSteps"   TEXT NOT NULL,
    "dataTable"       TEXT,
    "ordinal"         INTEGER NOT NULL,

    CONSTRAINT "safeguard_protocols_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "safeguard_protocols_ordinal_idx" ON "safeguard_protocols"("ordinal");

-- ============================================
-- Step 8: Create FormInventory and RolePermission (global reference)
-- ============================================

CREATE TABLE "form_inventory" (
    "id"            TEXT NOT NULL,
    "namaForm"      TEXT NOT NULL,
    "pengisiRole"   TEXT NOT NULL,
    "frekuensi"     "FormFrequency" NOT NULL,
    "estimasiMenit" INTEGER NOT NULL,
    "prioritas"     "FormPriority" NOT NULL,
    "devicePrimary" TEXT NOT NULL,
    "dataTable"     TEXT NOT NULL,
    "visibility"    TEXT NOT NULL,

    CONSTRAINT "form_inventory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "form_inventory_pengisiRole_idx" ON "form_inventory"("pengisiRole");
CREATE INDEX "form_inventory_prioritas_idx" ON "form_inventory"("prioritas");

CREATE TABLE "role_permissions" (
    "id"       TEXT NOT NULL,
    "role"     TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action"   TEXT NOT NULL,
    "scope"    TEXT,
    "note"     TEXT,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "role_permissions_role_resource_action_scope_key"
        UNIQUE NULLS NOT DISTINCT ("role", "resource", "action", "scope")
);

CREATE INDEX "role_permissions_role_idx" ON "role_permissions"("role");

-- ============================================
-- Step 9: Enable RLS on kegiatan table
-- ============================================

ALTER TABLE "kegiatan" ENABLE ROW LEVEL SECURITY;

CREATE POLICY kegiatan_tenant_isolation ON "kegiatan"
  FOR ALL
  USING (
    "isGlobal" = true
    OR "organizationId" = NULLIF(current_setting('app.current_org_id', true), '')
    OR current_setting('app.bypass_rls', true) = 'true'
  );
