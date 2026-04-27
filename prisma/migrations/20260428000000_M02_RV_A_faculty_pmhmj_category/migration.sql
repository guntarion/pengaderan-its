-- M02 Revisi Multi-Fakultas — Phase RV-A: Faculty Entity + PMHMJCategory
-- Covers: RV-A.1 (RumpunKeilmuan enum), RV-A.2 (PMHMJCategory enum),
--         RV-A.3 (Faculty table), RV-A.4 (KegiatanFacultyVariant table),
--         RV-A.5 (Kegiatan.pmHmjCategory + backfill),
--         RV-A.6 (Tujuan.facultyCode), RV-A.7 (AnchorRef.facultyCode + rumpunCode),
--         RV-A.8 (PassportItem.facultyCode), RV-A.9 (Organization.facultyCode FK)
--
-- ROLLBACK NOTES:
--   ALTER TABLE "kegiatan" DROP COLUMN "pmHmjCategory";
--   ALTER TABLE "tujuan" DROP COLUMN "facultyCode";
--   ALTER TABLE "anchor_refs" DROP COLUMN "facultyCode", DROP COLUMN "rumpunCode";
--   ALTER TABLE "passport_items" DROP COLUMN "facultyCode";
--   ALTER TABLE "organizations" DROP CONSTRAINT IF EXISTS "organizations_facultyCode_fkey";
--   DROP TABLE IF EXISTS "kegiatan_faculty_variant";
--   DROP TABLE IF EXISTS "faculty";
--   DROP TYPE IF EXISTS "PMHMJCategory";
--   DROP TYPE IF EXISTS "RumpunKeilmuan";

-- ============================================
-- RV-A.1 + RV-A.2: Create enums
-- ============================================

CREATE TYPE "RumpunKeilmuan" AS ENUM (
  'SAINS', 'TEKNIK', 'PERENCANAAN', 'KELAUTAN',
  'ELEKTRO_IT', 'KREATIF_BISNIS', 'VOKASI', 'KEDOKTERAN'
);

CREATE TYPE "PMHMJCategory" AS ENUM (
  'PRA', 'MASSAL', 'BERKELANJUTAN', 'INSTITUT_INTERFACE'
);

-- ============================================
-- RV-A.3: Create faculty table
-- ============================================

CREATE TABLE "faculty" (
  "code"                    TEXT NOT NULL,
  "name"                    TEXT NOT NULL,
  "rumpun"                  "RumpunKeilmuan" NOT NULL,
  "professionAssociations"  TEXT[] NOT NULL DEFAULT '{}',
  "notes"                   TEXT,
  "isActive"                BOOLEAN NOT NULL DEFAULT true,
  "metadata"                JSONB DEFAULT '{}',
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "faculty_pkey" PRIMARY KEY ("code")
);

CREATE INDEX "faculty_rumpun_idx"    ON "faculty" ("rumpun");
CREATE INDEX "faculty_isActive_idx"  ON "faculty" ("isActive");

-- ============================================
-- RV-A.4: Create kegiatan_faculty_variant table
-- ============================================

CREATE TABLE "kegiatan_faculty_variant" (
  "id"                       TEXT NOT NULL,
  "kegiatanId"               TEXT NOT NULL,
  "facultyCode"              TEXT NOT NULL,
  "deskripsiOverride"        TEXT,
  "tujuanOverride"           TEXT,
  "prerequisitesOverride"    TEXT,
  "contohOverride"           TEXT,
  "kpiThresholdOverrideJson" JSONB,
  "anchorRefAdditional"      TEXT[] NOT NULL DEFAULT '{}',
  "isActive"                 BOOLEAN NOT NULL DEFAULT true,
  "metadata"                 JSONB DEFAULT '{}',
  "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "kegiatan_faculty_variant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "kegiatan_faculty_variant_kegiatanId_facultyCode_key"
  ON "kegiatan_faculty_variant" ("kegiatanId", "facultyCode");

CREATE INDEX "kegiatan_faculty_variant_facultyCode_idx"
  ON "kegiatan_faculty_variant" ("facultyCode");

CREATE INDEX "kegiatan_faculty_variant_kegiatanId_idx"
  ON "kegiatan_faculty_variant" ("kegiatanId");

-- FK constraints for kegiatan_faculty_variant (added after tables ready)
ALTER TABLE "kegiatan_faculty_variant"
  ADD CONSTRAINT "kegiatan_faculty_variant_kegiatanId_fkey"
  FOREIGN KEY ("kegiatanId") REFERENCES "kegiatan" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "kegiatan_faculty_variant"
  ADD CONSTRAINT "kegiatan_faculty_variant_facultyCode_fkey"
  FOREIGN KEY ("facultyCode") REFERENCES "faculty" ("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- RV-A.5: Add pmHmjCategory to kegiatan
-- Step 1: Add column nullable (temporary)
-- ============================================

ALTER TABLE "kegiatan" ADD COLUMN "pmHmjCategory" "PMHMJCategory";

-- Step 2: Backfill based on ID pattern
UPDATE "kegiatan" SET "pmHmjCategory" = 'BERKELANJUTAN' WHERE id LIKE 'K7.%';
UPDATE "kegiatan" SET "pmHmjCategory" = 'INSTITUT_INTERFACE' WHERE id LIKE 'INS.%';
UPDATE "kegiatan" SET "pmHmjCategory" = 'MASSAL'
  WHERE "pmHmjCategory" IS NULL AND id ~ '^K[1-6]\.';

-- Step 3: Manual override for edge cases (K9.01 = Kirkpatrick evaluation = MASSAL scope)
UPDATE "kegiatan" SET "pmHmjCategory" = 'MASSAL' WHERE id = 'K9.01' AND "pmHmjCategory" IS NULL;

-- Step 4: USL.* (universal baseline kegiatan, not phase-specific) → MASSAL as default
UPDATE "kegiatan" SET "pmHmjCategory" = 'MASSAL' WHERE "pmHmjCategory" IS NULL AND id LIKE 'USL.%';

-- Step 5: Catch-all fallback for any remaining NULL
UPDATE "kegiatan" SET "pmHmjCategory" = 'MASSAL' WHERE "pmHmjCategory" IS NULL;

-- Step 6: Verify no NULL remains
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "kegiatan" WHERE "pmHmjCategory" IS NULL) THEN
    RAISE EXCEPTION 'Backfill incomplete: % rows with NULL pmHmjCategory',
      (SELECT COUNT(*) FROM "kegiatan" WHERE "pmHmjCategory" IS NULL);
  END IF;
END $$;

-- Step 7: Set NOT NULL
ALTER TABLE "kegiatan" ALTER COLUMN "pmHmjCategory" SET NOT NULL;

-- Add indexes for pmHmjCategory
CREATE INDEX "kegiatan_pmHmjCategory_idx"      ON "kegiatan" ("pmHmjCategory");
CREATE INDEX "kegiatan_pmHmjCategory_fase_idx"  ON "kegiatan" ("pmHmjCategory", "fase");

-- ============================================
-- RV-A.6: Add facultyCode to tujuan
-- ============================================

ALTER TABLE "tujuan" ADD COLUMN "facultyCode" TEXT;

CREATE INDEX "tujuan_kegiatanId_facultyCode_idx" ON "tujuan" ("kegiatanId", "facultyCode");

-- FK tujuan → faculty (added after faculty table exists and is seeded)
ALTER TABLE "tujuan"
  ADD CONSTRAINT "tujuan_facultyCode_fkey"
  FOREIGN KEY ("facultyCode") REFERENCES "faculty" ("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- RV-A.7: Add facultyCode + rumpunCode to anchor_refs
-- ============================================

ALTER TABLE "anchor_refs"
  ADD COLUMN "facultyCode" TEXT,
  ADD COLUMN "rumpunCode"  "RumpunKeilmuan";

-- XOR constraint: cannot have both facultyCode AND rumpunCode set
ALTER TABLE "anchor_refs" ADD CONSTRAINT "anchor_refs_scoping_xor" CHECK (
  NOT ("facultyCode" IS NOT NULL AND "rumpunCode" IS NOT NULL)
);

CREATE INDEX "anchor_refs_kegiatanId_facultyCode_idx" ON "anchor_refs" ("kegiatanId", "facultyCode");
CREATE INDEX "anchor_refs_kegiatanId_rumpunCode_idx"  ON "anchor_refs" ("kegiatanId", "rumpunCode");

-- FK anchor_refs → faculty
ALTER TABLE "anchor_refs"
  ADD CONSTRAINT "anchor_refs_facultyCode_fkey"
  FOREIGN KEY ("facultyCode") REFERENCES "faculty" ("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- RV-A.8: Add facultyCode to passport_items
-- ============================================

ALTER TABLE "passport_items" ADD COLUMN "facultyCode" TEXT;

CREATE INDEX "passport_items_facultyCode_dimensi_idx"    ON "passport_items" ("facultyCode", "dimensi");
CREATE INDEX "passport_items_facultyCode_kegiatanId_idx" ON "passport_items" ("facultyCode", "kegiatanId");

-- FK passport_items → faculty
ALTER TABLE "passport_items"
  ADD CONSTRAINT "passport_items_facultyCode_fkey"
  FOREIGN KEY ("facultyCode") REFERENCES "faculty" ("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- RV-A.9: Add FK constraint Organization.facultyCode → faculty.code
-- NOTE: Faculty must be seeded BEFORE this constraint can be effectively used.
--       Current HMTC org has facultyCode=NULL which is valid (nullable FK).
--       After seeding Faculty, run: UPDATE "organizations" SET "facultyCode"='FT-EIC' WHERE code='HMTC';
-- ============================================

ALTER TABLE "organizations"
  ADD CONSTRAINT "organizations_facultyCode_fkey"
  FOREIGN KEY ("facultyCode") REFERENCES "faculty" ("code") ON DELETE SET NULL ON UPDATE CASCADE;
