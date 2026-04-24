/**
 * prisma/seed/master-data/csv-schemas.ts
 * Zod schemas for validating each CSV row before upsert.
 * All schemas are strict — any unknown field will be ignored (passthrough for CSV extra cols).
 */

import { z } from 'zod';

// ============================================
// Enum references (must match Prisma schema)
// ============================================

const NilaiKeyEnum = z.enum([
  'N1_BUDAYA', 'N2_LINGKUNGAN', 'N3_EMPAT_BIDANG', 'N4_KEPROFESIAN',
  'N5_HMTC_ITS', 'N6_REGENERASI', 'N7_KESEJAHTERAAN', 'N8_PENGABDIAN',
]);

const DimensiKeyEnum = z.enum([
  'D1_ORANG', 'D2_FASILITAS', 'D3_BIDANG_PEMBELAJARAN', 'D4_KARIR',
  'D5_KEMAHASISWAAN', 'D6_AKADEMIK', 'D7_KEKOMPAKAN', 'D8_LOYALITAS',
  'D9_MENTAL_POSITIF', 'D10_KEPEDULIAN_SOSIAL', 'D11_KEINSINYURAN',
]);

const FaseKeyEnum = z.enum([
  'F0_PRA', 'F1_FOUNDATION', 'F2_CHALLENGE', 'F3_PEAK', 'F4_INTEGRATION',
]);

const KategoriKeyEnum = z.enum([
  'K1_KONTRAK_SAFEGUARD', 'K2_PENGENALAN_RELASIONAL', 'K3_FASILITAS',
  'K4_AKADEMIK_KEPROFESIAN', 'K5_SOLIDARITAS_ANGKATAN', 'K6_KESEJAHTERAAN', 'K7_PENGABDIAN',
]);

const KegiatanIntensityEnum = z.enum(['RINGAN', 'SEDANG', 'BERAT']);

const KegiatanScaleEnum = z.enum([
  'INDIVIDUAL', 'KP', 'CROSS_KP', 'ANGKATAN', 'MULTI_ANGKATAN',
]);

const KPITypeEnum = z.enum(['HIGHER_BETTER', 'LOWER_BETTER', 'ZERO_ONE', 'RANGE']);

const EvidenceTypeEnum = z.enum([
  'TANDA_TANGAN', 'FOTO', 'QR_STAMP', 'FILE', 'LOGBOOK', 'ATTENDANCE',
]);

const ForbiddenActSeverityEnum = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);

const TaxonomyGroupEnum = z.enum(['NILAI', 'DIMENSI', 'FASE', 'KATEGORI']);

const FormPriorityEnum = z.enum([
  'WAJIB', 'WAJIB_OPT_OUT', 'ENCOURAGED', 'OPTIONAL', 'ON_DEMAND',
]);

const FormFrequencyEnum = z.enum([
  'DAILY', 'WEEKLY', 'BI_WEEKLY', 'PER_EVENT', 'PER_MILESTONE',
  'ON_DEMAND', 'ONE_TIME', 'CUSTOM',
]);

// Helper: parse boolean string ("TRUE"/"FALSE"/"true"/"false"/"1"/"0")
const booleanString = z.string().transform((val) => {
  const normalized = val.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === '') return false;
  throw new Error(`Invalid boolean: ${val}`);
});

// Helper: parse prasyarat column ("-" or "K1.01" or "K1.01;K1.02")
// Only keeps values that match the Kegiatan ID pattern (letters+digits.digits)
// Free-text values like "all KPP" are silently dropped with a log warning
const KEGIATAN_ID_PATTERN = /^[A-Z0-9]+\.[0-9]+$/;
const prasyaratString = z.string().transform((val) => {
  const trimmed = val.trim();
  if (!trimmed || trimmed === '-' || trimmed === 'none' || trimmed === 'N/A') return [];
  return trimmed
    .split(';')
    .map((s) => s.trim())
    .filter((s) => Boolean(s) && KEGIATAN_ID_PATTERN.test(s));
});

// Helper: parse semicolon-separated kegiatan IDs
const semicolonSeparated = z.string().transform((val) => {
  const trimmed = val.trim();
  if (!trimmed || trimmed === '-') return [];
  return trimmed.split(';').map((s) => s.trim()).filter(Boolean);
});

// Helper: optional text (empty string → undefined)
const optionalText = z.string().transform((val) => {
  const trimmed = val.trim();
  return trimmed || undefined;
});

// ============================================
// kegiatan_master.csv
// Columns: id,nama,kategori,nilai,dimensi,fase,intensity,scale,
//           durasi_menit,frekuensi,deskripsi_singkat,rasional,
//           pic_role_hint,prasyarat,is_active
// Note: is_global and organization_code not in CSV — set by seed script
// ============================================

export const kegiatanMasterRowSchema = z.object({
  id: z.string().regex(/^[A-Z0-9]+\.[0-9]+$/, 'Kegiatan ID must match pattern like K4.05'),
  nama: z.string().min(1).max(200),
  kategori: KategoriKeyEnum,
  nilai: NilaiKeyEnum,
  dimensi: DimensiKeyEnum,
  fase: FaseKeyEnum,
  intensity: KegiatanIntensityEnum,
  scale: KegiatanScaleEnum,
  durasi_menit: z.string().transform((val) => parseInt(val.trim(), 10)),
  frekuensi: z.string().min(1),
  deskripsi_singkat: z.string().max(500),
  rasional: z.string().min(1),
  pic_role_hint: optionalText.optional(),
  prasyarat: prasyaratString,
  is_active: booleanString,
});

export type KegiatanMasterRow = z.infer<typeof kegiatanMasterRowSchema>;

// ============================================
// tujuan_pembelajaran.csv
// Columns: id,kegiatan_id,ordinal,tujuan_text
// ============================================

export const tujuanRowSchema = z.object({
  id: z.string().min(1),
  kegiatan_id: z.string().min(1),
  ordinal: z.string().transform((val) => parseInt(val.trim(), 10)),
  tujuan_text: z.string().min(1),
});

export type TujuanRow = z.infer<typeof tujuanRowSchema>;

// ============================================
// kpi_definition.csv
// Columns: id,kegiatan_id,kpi_text,type,target_numeric,unit,
//           is_leading,measure_method,output_field,outcome_field
// ============================================

export const kpiDefRowSchema = z.object({
  id: z.string().min(1),
  kegiatan_id: z.string().min(1),
  kpi_text: z.string().min(1),
  type: KPITypeEnum,
  target_numeric: z.string().transform((val) => {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '' || trimmed === '-') return undefined;
    const num = parseFloat(trimmed);
    return isNaN(num) ? undefined : num;
  }),
  unit: optionalText.optional(),
  is_leading: booleanString,
  measure_method: optionalText.optional(),
  output_field: optionalText.optional(),
  outcome_field: optionalText.optional(),
});

export type KpiDefRow = z.infer<typeof kpiDefRowSchema>;

// ============================================
// anchor_konsep.csv
// Columns: id,kegiatan_id,source,link_ref,excerpt_ringkas
// ============================================

export const anchorRefRowSchema = z.object({
  id: z.string().min(1),
  kegiatan_id: z.string().min(1),
  source: z.string().min(1),
  link_ref: optionalText.optional(),
  excerpt_ringkas: optionalText.optional(),
});

export type AnchorRefRow = z.infer<typeof anchorRefRowSchema>;

// ============================================
// passport_items.csv
// Columns: id,dimensi,kegiatan_id,description,target_waktu,
//           evidence_type,verifier_role_hint,order
// Note: evidence_type in CSV may have values outside enum — map to FILE as fallback
// ============================================

const EVIDENCE_TYPE_MAP: Record<string, string> = {
  TANDA_TANGAN: 'TANDA_TANGAN',
  FOTO: 'FOTO',
  QR_STAMP: 'QR_STAMP',
  FILE: 'FILE',
  LOGBOOK: 'LOGBOOK',
  ATTENDANCE: 'ATTENDANCE',
};

export const passportItemRowSchema = z.object({
  id: z.string().min(1),
  dimensi: DimensiKeyEnum,
  kegiatan_id: optionalText.optional(), // optional FK
  description: z.string().min(1),
  target_waktu: z.string().min(1),
  evidence_type: z.string().transform((val) => {
    const trimmed = val.trim().toUpperCase();
    // If it contains '+', split and take first recognized value
    const parts = trimmed.split('+');
    for (const part of parts) {
      if (EVIDENCE_TYPE_MAP[part.trim()]) return EVIDENCE_TYPE_MAP[part.trim()];
    }
    return 'FILE'; // default fallback
  }),
  verifier_role_hint: z.string().min(1),
  order: z.string().transform((val) => parseInt(val.trim(), 10)),
});

export type PassportItemRow = z.infer<typeof passportItemRowSchema>;

// ============================================
// rubrik_aacu.csv
// Columns: rubrik_key,rubrik_label,level,level_label,
//           level_descriptor,applicable_kegiatan
// ============================================

export const rubrikRowSchema = z.object({
  rubrik_key: z.string().min(1),
  rubrik_label: z.string().min(1),
  level: z.string().transform((val) => parseInt(val.trim(), 10)).refine(
    (n) => n >= 1 && n <= 4,
    'Level must be 1-4',
  ),
  level_label: z.string().min(1),
  level_descriptor: z.string().min(1),
  applicable_kegiatan: semicolonSeparated,
});

export type RubrikRow = z.infer<typeof rubrikRowSchema>;

// ============================================
// forbidden_acts.csv
// Columns: id,category,description,regulation_source,
//           severity,consequence,detection_signal
// ordinal not in CSV — use row index
// ============================================

export const forbiddenActRowSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  regulation_source: z.string().min(1),
  severity: ForbiddenActSeverityEnum,
  consequence: z.string().min(1),
  detection_signal: z.string().min(1),
});

export type ForbiddenActRow = z.infer<typeof forbiddenActRowSchema>;

// ============================================
// safeguard_protocol.csv
// Columns: id,mechanism,description,when_activated,
//           responsible_role,protocol_steps,data_table
// ordinal not in CSV — use row index
// ============================================

export const safeguardProtocolRowSchema = z.object({
  id: z.string().min(1),
  mechanism: z.string().min(1),
  description: z.string().min(1),
  when_activated: z.string().min(1),
  responsible_role: z.string().min(1),
  protocol_steps: z.string().min(1),
  data_table: optionalText.optional(),
});

export type SafeguardProtocolRow = z.infer<typeof safeguardProtocolRowSchema>;

// ============================================
// nilai_dimensi_taxonomy.csv
// Columns: key,group,label_id,label_en,deskripsi
// group in CSV is lowercase; enum is uppercase
// ============================================

export const taxonomyMetaRowSchema = z.object({
  key: z.string().min(1),
  group: z.string().transform((val) => val.trim().toUpperCase()).pipe(TaxonomyGroupEnum),
  label_id: z.string().min(1),
  label_en: z.string().min(1),
  deskripsi: optionalText.optional(),
});

export type TaxonomyMetaRow = z.infer<typeof taxonomyMetaRowSchema>;

// ============================================
// form_inventory.csv
// Columns: form_id,nama_form,pengisi_role,frekuensi,estimasi_menit,
//           prioritas,device_primary,data_table,visibility
// Note: frekuensi and prioritas in CSV use free-text. Map to closest enum or CUSTOM.
// ============================================

const FREKUENSI_MAP: Record<string, string> = {
  '1x/hari': 'DAILY',
  '1x/minggu': 'WEEKLY',
  'per milestone': 'PER_MILESTONE',
  'on-demand': 'ON_DEMAND',
  'on-demand (per case)': 'ON_DEMAND',
};

const PRIORITAS_MAP: Record<string, string> = {
  'WAJIB': 'WAJIB',
  'WAJIB_OPT_OUT': 'WAJIB_OPT_OUT',
  'ENCOURAGED': 'ENCOURAGED',
  'OPTIONAL': 'OPTIONAL',
  'ON_DEMAND': 'ON_DEMAND',
};

export const formInventoryRowSchema = z.object({
  form_id: z.string().min(1),
  nama_form: z.string().min(1),
  pengisi_role: z.string().min(1),
  frekuensi: z.string().transform((val) => {
    const trimmed = val.trim();
    return FREKUENSI_MAP[trimmed] ?? 'CUSTOM';
  }),
  estimasi_menit: z.string().transform((val) => parseInt(val.trim(), 10)),
  prioritas: z.string().transform((val) => {
    const trimmed = val.trim();
    return PRIORITAS_MAP[trimmed] ?? 'OPTIONAL';
  }),
  device_primary: z.string().min(1),
  data_table: z.string().min(1),
  visibility: z.string().min(1),
});

export type FormInventoryRow = z.infer<typeof formInventoryRowSchema>;

// ============================================
// roles_permissions.csv
// Columns: role,resource,action,scope,note
// ============================================

export const rolePermissionRowSchema = z.object({
  role: z.string().min(1),
  resource: z.string().min(1),
  action: z.string().min(1),
  scope: optionalText.optional(),
  note: optionalText.optional(),
});

export type RolePermissionRow = z.infer<typeof rolePermissionRowSchema>;
