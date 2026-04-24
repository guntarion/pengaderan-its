/**
 * prisma/seed/master-data/batch-upsert.ts
 * Idempotent batch upsert functions for each entity.
 * Batch size: 50 rows per transaction.
 */

import type { PrismaClient } from '@prisma/client';
import { createLogger } from '../../../src/lib/logger';
import type {
  KegiatanMasterRow,
  TujuanRow,
  KpiDefRow,
  AnchorRefRow,
  PassportItemRow,
  RubrikRow,
  ForbiddenActRow,
  SafeguardProtocolRow,
  TaxonomyMetaRow,
  FormInventoryRow,
  RolePermissionRow,
} from './csv-schemas';
import { computeDiff, type EntityDiff } from './diff-computer';

const log = createLogger('seed:batch-upsert');
const BATCH_SIZE = 50;

/** Chunk an array into batches of at most `size` elements. */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ============================================
// TaxonomyMeta
// ============================================

export async function upsertTaxonomyMeta(
  rows: TaxonomyMetaRow[],
  prisma: PrismaClient,
  organizationId: string,
  dryRun: boolean,
): Promise<EntityDiff> {
  // Build CSV map
  const csvById = new Map(
    rows.map((row, idx) => [
      row.key,
      {
        id: row.key,
        group: row.group,
        labelId: row.label_id,
        labelEn: row.label_en,
        deskripsi: row.deskripsi ?? null,
        displayOrder: idx + 1,
      },
    ]),
  );

  // Load DB state
  const existing = await prisma.taxonomyMeta.findMany({ select: { id: true, group: true, labelId: true, labelEn: true, deskripsi: true, displayOrder: true } });
  const dbById = new Map(existing.map((e) => [e.id, e as Record<string, unknown>]));

  const diff = computeDiff('TaxonomyMeta', csvById as Map<string, Record<string, unknown>>, dbById);

  if (dryRun) return diff;

  // Apply upserts
  const batches = chunk(rows, BATCH_SIZE);
  let count = 0;
  for (const batch of batches) {
    await prisma.$transaction(
      batch.map((row, batchIdx) =>
        prisma.taxonomyMeta.upsert({
          where: { id: row.key },
          create: {
            id: row.key,
            group: row.group as import('@prisma/client').TaxonomyGroup,
            labelId: row.label_id,
            labelEn: row.label_en,
            deskripsi: row.deskripsi ?? null,
            displayOrder: count + batchIdx + 1,
          },
          update: {
            group: row.group as import('@prisma/client').TaxonomyGroup,
            labelId: row.label_id,
            labelEn: row.label_en,
            deskripsi: row.deskripsi ?? null,
            displayOrder: count + batchIdx + 1,
          },
        }),
      ),
    );
    count += batch.length;
    log.debug('TaxonomyMeta upserted batch', { count, total: rows.length });
  }

  log.info('TaxonomyMeta upsert complete', { count });
  return diff;
}

// ============================================
// Rubrik
// ============================================

export async function upsertRubrik(
  rows: RubrikRow[],
  prisma: PrismaClient,
  dryRun: boolean,
): Promise<EntityDiff> {
  // Derive natural ID: rubrik_key + "_L" + level
  const csvById = new Map(
    rows.map((row) => {
      const id = `${row.rubrik_key}_L${row.level}`;
      return [
        id,
        {
          id,
          rubrikKey: row.rubrik_key,
          rubrikLabel: row.rubrik_label,
          level: row.level,
          levelLabel: row.level_label,
          levelDescriptor: row.level_descriptor,
          applicableKegiatanIds: row.applicable_kegiatan,
        },
      ];
    }),
  );

  const existing = await prisma.rubrik.findMany({
    select: { id: true, rubrikKey: true, rubrikLabel: true, level: true, levelLabel: true, levelDescriptor: true, applicableKegiatanIds: true },
  });
  const dbById = new Map(existing.map((e) => [e.id, e as Record<string, unknown>]));

  const diff = computeDiff('Rubrik', csvById as Map<string, Record<string, unknown>>, dbById);

  if (dryRun) return diff;

  const rowsWithIds = rows.map((row) => ({
    ...row,
    id: `${row.rubrik_key}_L${row.level}`,
  }));

  for (const batch of chunk(rowsWithIds, BATCH_SIZE)) {
    await prisma.$transaction(
      batch.map((row) =>
        prisma.rubrik.upsert({
          where: { id: row.id },
          create: {
            id: row.id,
            rubrikKey: row.rubrik_key,
            rubrikLabel: row.rubrik_label,
            level: row.level,
            levelLabel: row.level_label,
            levelDescriptor: row.level_descriptor,
            applicableKegiatanIds: row.applicable_kegiatan,
          },
          update: {
            rubrikKey: row.rubrik_key,
            rubrikLabel: row.rubrik_label,
            levelLabel: row.level_label,
            levelDescriptor: row.level_descriptor,
            applicableKegiatanIds: row.applicable_kegiatan,
          },
        }),
      ),
    );
  }

  log.info('Rubrik upsert complete', { count: rows.length });
  return diff;
}

// ============================================
// ForbiddenAct
// ============================================

export async function upsertForbiddenActs(
  rows: ForbiddenActRow[],
  prisma: PrismaClient,
  dryRun: boolean,
): Promise<EntityDiff> {
  const csvById = new Map(
    rows.map((row, idx) => [
      row.id,
      {
        id: row.id,
        category: row.category,
        description: row.description,
        regulationSource: row.regulation_source,
        severity: row.severity,
        consequence: row.consequence,
        detectionSignal: row.detection_signal,
        ordinal: idx + 1,
      },
    ]),
  );

  const existing = await prisma.forbiddenAct.findMany({
    select: { id: true, category: true, description: true, regulationSource: true, severity: true, consequence: true, detectionSignal: true, ordinal: true },
  });
  const dbById = new Map(existing.map((e) => [e.id, e as Record<string, unknown>]));

  const diff = computeDiff('ForbiddenAct', csvById as Map<string, Record<string, unknown>>, dbById);

  if (dryRun) return diff;

  for (const batch of chunk(rows, BATCH_SIZE)) {
    await prisma.$transaction(
      batch.map((row, batchIdx) =>
        prisma.forbiddenAct.upsert({
          where: { id: row.id },
          create: {
            id: row.id,
            category: row.category,
            description: row.description,
            regulationSource: row.regulation_source,
            severity: row.severity as import('@prisma/client').ForbiddenActSeverity,
            consequence: row.consequence,
            detectionSignal: row.detection_signal,
            ordinal: batchIdx + 1,
          },
          update: {
            category: row.category,
            description: row.description,
            regulationSource: row.regulation_source,
            severity: row.severity as import('@prisma/client').ForbiddenActSeverity,
            consequence: row.consequence,
            detectionSignal: row.detection_signal,
          },
        }),
      ),
    );
  }

  log.info('ForbiddenAct upsert complete', { count: rows.length });
  return diff;
}

// ============================================
// SafeguardProtocol
// ============================================

export async function upsertSafeguardProtocols(
  rows: SafeguardProtocolRow[],
  prisma: PrismaClient,
  dryRun: boolean,
): Promise<EntityDiff> {
  const csvById = new Map(
    rows.map((row, idx) => [
      row.id,
      {
        id: row.id,
        mechanism: row.mechanism,
        description: row.description,
        whenActivated: row.when_activated,
        responsibleRole: row.responsible_role,
        protocolSteps: row.protocol_steps,
        dataTable: row.data_table ?? null,
        ordinal: idx + 1,
      },
    ]),
  );

  const existing = await prisma.safeguardProtocol.findMany({
    select: { id: true, mechanism: true, description: true, whenActivated: true, responsibleRole: true, protocolSteps: true, dataTable: true, ordinal: true },
  });
  const dbById = new Map(existing.map((e) => [e.id, e as Record<string, unknown>]));

  const diff = computeDiff('SafeguardProtocol', csvById as Map<string, Record<string, unknown>>, dbById);

  if (dryRun) return diff;

  for (const batch of chunk(rows, BATCH_SIZE)) {
    await prisma.$transaction(
      batch.map((row, batchIdx) =>
        prisma.safeguardProtocol.upsert({
          where: { id: row.id },
          create: {
            id: row.id,
            mechanism: row.mechanism,
            description: row.description,
            whenActivated: row.when_activated,
            responsibleRole: row.responsible_role,
            protocolSteps: row.protocol_steps,
            dataTable: row.data_table ?? null,
            ordinal: batchIdx + 1,
          },
          update: {
            mechanism: row.mechanism,
            description: row.description,
            whenActivated: row.when_activated,
            responsibleRole: row.responsible_role,
            protocolSteps: row.protocol_steps,
            dataTable: row.data_table ?? null,
          },
        }),
      ),
    );
  }

  log.info('SafeguardProtocol upsert complete', { count: rows.length });
  return diff;
}

// ============================================
// FormInventory
// ============================================

export async function upsertFormInventory(
  rows: FormInventoryRow[],
  prisma: PrismaClient,
  dryRun: boolean,
): Promise<EntityDiff> {
  const csvById = new Map(
    rows.map((row) => [
      row.form_id,
      {
        id: row.form_id,
        namaForm: row.nama_form,
        pengisiRole: row.pengisi_role,
        frekuensi: row.frekuensi,
        estimasiMenit: row.estimasi_menit,
        prioritas: row.prioritas,
        devicePrimary: row.device_primary,
        dataTable: row.data_table,
        visibility: row.visibility,
      },
    ]),
  );

  const existing = await prisma.formInventory.findMany({
    select: { id: true, namaForm: true, pengisiRole: true, frekuensi: true, estimasiMenit: true, prioritas: true, devicePrimary: true, dataTable: true, visibility: true },
  });
  const dbById = new Map(existing.map((e) => [e.id, e as Record<string, unknown>]));

  const diff = computeDiff('FormInventory', csvById as Map<string, Record<string, unknown>>, dbById);

  if (dryRun) return diff;

  for (const batch of chunk(rows, BATCH_SIZE)) {
    await prisma.$transaction(
      batch.map((row) =>
        prisma.formInventory.upsert({
          where: { id: row.form_id },
          create: {
            id: row.form_id,
            namaForm: row.nama_form,
            pengisiRole: row.pengisi_role,
            frekuensi: row.frekuensi as import('@prisma/client').FormFrequency,
            estimasiMenit: row.estimasi_menit,
            prioritas: row.prioritas as import('@prisma/client').FormPriority,
            devicePrimary: row.device_primary,
            dataTable: row.data_table,
            visibility: row.visibility,
          },
          update: {
            namaForm: row.nama_form,
            pengisiRole: row.pengisi_role,
            frekuensi: row.frekuensi as import('@prisma/client').FormFrequency,
            estimasiMenit: row.estimasi_menit,
            prioritas: row.prioritas as import('@prisma/client').FormPriority,
            devicePrimary: row.device_primary,
            dataTable: row.data_table,
            visibility: row.visibility,
          },
        }),
      ),
    );
  }

  log.info('FormInventory upsert complete', { count: rows.length });
  return diff;
}

// ============================================
// RolePermission
// ============================================

export async function upsertRolePermissions(
  rows: RolePermissionRow[],
  prisma: PrismaClient,
  dryRun: boolean,
): Promise<EntityDiff> {
  // For role_permissions, unique key is (role, resource, action, scope)
  // Use a composite string as the map key for diff computation
  const makeKey = (r: RolePermissionRow) =>
    `${r.role}|${r.resource}|${r.action}|${r.scope ?? 'null'}`;

  const csvById = new Map(
    rows.map((row) => [
      makeKey(row),
      {
        role: row.role,
        resource: row.resource,
        action: row.action,
        scope: row.scope ?? null,
        note: row.note ?? null,
      },
    ]),
  );

  const existing = await prisma.rolePermission.findMany({
    select: { id: true, role: true, resource: true, action: true, scope: true, note: true },
  });
  const dbById = new Map(
    existing.map((e) => [
      `${e.role}|${e.resource}|${e.action}|${e.scope ?? 'null'}`,
      e as Record<string, unknown>,
    ]),
  );

  const diff = computeDiff('RolePermission', csvById as Map<string, Record<string, unknown>>, dbById);

  if (dryRun) return diff;

  for (const batch of chunk(rows, BATCH_SIZE)) {
    await prisma.$transaction(
      batch.map((row) =>
        prisma.rolePermission.upsert({
          where: {
            role_resource_action_scope: {
              role: row.role,
              resource: row.resource,
              action: row.action,
              scope: row.scope ?? '',
            },
          },
          create: {
            role: row.role,
            resource: row.resource,
            action: row.action,
            scope: row.scope ?? null,
            note: row.note ?? null,
          },
          update: {
            note: row.note ?? null,
          },
        }),
      ),
    );
  }

  log.info('RolePermission upsert complete', { count: rows.length });
  return diff;
}

// ============================================
// Kegiatan
// ============================================

export async function upsertKegiatan(
  rows: KegiatanMasterRow[],
  prisma: PrismaClient,
  organizationId: string,
  dryRun: boolean,
): Promise<EntityDiff> {
  const csvById = new Map(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        nama: row.nama,
        deskripsiSingkat: row.deskripsi_singkat,
        deskripsiFull: null,
        rasional: row.rasional,
        safeguardNotes: null,
        nilai: row.nilai,
        dimensi: row.dimensi,
        fase: row.fase,
        kategori: row.kategori,
        intensity: row.intensity,
        scale: row.scale,
        durasiMenit: row.durasi_menit,
        frekuensi: row.frekuensi,
        picRoleHint: row.pic_role_hint ?? null,
        prasyaratIds: row.prasyarat,
        isActive: row.is_active,
        isGlobal: false,
        organizationId,
        displayOrder: 0,
      },
    ]),
  );

  const existing = await prisma.kegiatan.findMany({
    select: {
      id: true, nama: true, deskripsiSingkat: true, rasional: true,
      nilai: true, dimensi: true, fase: true, kategori: true,
      intensity: true, scale: true, durasiMenit: true, frekuensi: true,
      picRoleHint: true, prasyaratIds: true, isActive: true, isGlobal: true,
      organizationId: true, displayOrder: true,
    },
  });
  const dbById = new Map(existing.map((e) => [e.id, e as Record<string, unknown>]));

  const diff = computeDiff('Kegiatan', csvById as Map<string, Record<string, unknown>>, dbById);

  if (dryRun) return diff;

  for (const batch of chunk(rows, BATCH_SIZE)) {
    await prisma.$transaction(
      batch.map((row) =>
        prisma.kegiatan.upsert({
          where: { id: row.id },
          create: {
            id: row.id,
            nama: row.nama,
            deskripsiSingkat: row.deskripsi_singkat,
            rasional: row.rasional,
            nilai: row.nilai as import('@prisma/client').NilaiKey,
            dimensi: row.dimensi as import('@prisma/client').DimensiKey,
            fase: row.fase as import('@prisma/client').FaseKey,
            kategori: row.kategori as import('@prisma/client').KategoriKey,
            intensity: row.intensity as import('@prisma/client').KegiatanIntensity,
            scale: row.scale as import('@prisma/client').KegiatanScale,
            durasiMenit: row.durasi_menit,
            frekuensi: row.frekuensi,
            picRoleHint: row.pic_role_hint ?? null,
            prasyaratIds: row.prasyarat,
            isActive: row.is_active,
            isGlobal: false,
            organizationId,
            displayOrder: 0,
          },
          update: {
            nama: row.nama,
            deskripsiSingkat: row.deskripsi_singkat,
            rasional: row.rasional,
            nilai: row.nilai as import('@prisma/client').NilaiKey,
            dimensi: row.dimensi as import('@prisma/client').DimensiKey,
            fase: row.fase as import('@prisma/client').FaseKey,
            kategori: row.kategori as import('@prisma/client').KategoriKey,
            intensity: row.intensity as import('@prisma/client').KegiatanIntensity,
            scale: row.scale as import('@prisma/client').KegiatanScale,
            durasiMenit: row.durasi_menit,
            frekuensi: row.frekuensi,
            picRoleHint: row.pic_role_hint ?? null,
            prasyaratIds: row.prasyarat,
            isActive: row.is_active,
          },
        }),
      ),
    );
  }

  log.info('Kegiatan upsert complete', { count: rows.length });
  return diff;
}

// ============================================
// Tujuan
// ============================================

export async function upsertTujuan(
  rows: TujuanRow[],
  prisma: PrismaClient,
  dryRun: boolean,
): Promise<EntityDiff> {
  const csvById = new Map(
    rows.map((row) => [
      row.id,
      { id: row.id, kegiatanId: row.kegiatan_id, ordinal: row.ordinal, text: row.tujuan_text },
    ]),
  );

  const existing = await prisma.tujuan.findMany({
    select: { id: true, kegiatanId: true, ordinal: true, text: true },
  });
  const dbById = new Map(existing.map((e) => [e.id, e as Record<string, unknown>]));

  const diff = computeDiff('Tujuan', csvById as Map<string, Record<string, unknown>>, dbById);

  if (dryRun) return diff;

  for (const batch of chunk(rows, BATCH_SIZE)) {
    await prisma.$transaction(
      batch.map((row) =>
        prisma.tujuan.upsert({
          where: { id: row.id },
          create: { id: row.id, kegiatanId: row.kegiatan_id, ordinal: row.ordinal, text: row.tujuan_text },
          update: { ordinal: row.ordinal, text: row.tujuan_text },
        }),
      ),
    );
  }

  log.info('Tujuan upsert complete', { count: rows.length });
  return diff;
}

// ============================================
// KPIDef
// ============================================

export async function upsertKpiDefs(
  rows: KpiDefRow[],
  prisma: PrismaClient,
  dryRun: boolean,
): Promise<EntityDiff> {
  const csvById = new Map(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        kegiatanId: row.kegiatan_id,
        text: row.kpi_text,
        type: row.type,
        targetNumeric: row.target_numeric ?? null,
        unit: row.unit ?? null,
        isLeading: row.is_leading,
        measureMethod: row.measure_method ?? null,
        outputField: row.output_field ?? null,
        outcomeField: row.outcome_field ?? null,
      },
    ]),
  );

  const existing = await prisma.kPIDef.findMany({
    select: { id: true, kegiatanId: true, text: true, type: true, targetNumeric: true, unit: true, isLeading: true, measureMethod: true, outputField: true, outcomeField: true },
  });
  const dbById = new Map(existing.map((e) => [e.id, e as Record<string, unknown>]));

  const diff = computeDiff('KPIDef', csvById as Map<string, Record<string, unknown>>, dbById);

  if (dryRun) return diff;

  for (const batch of chunk(rows, BATCH_SIZE)) {
    await prisma.$transaction(
      batch.map((row) =>
        prisma.kPIDef.upsert({
          where: { id: row.id },
          create: {
            id: row.id,
            kegiatanId: row.kegiatan_id,
            text: row.kpi_text,
            type: row.type as import('@prisma/client').KPIType,
            targetNumeric: row.target_numeric ?? null,
            unit: row.unit ?? null,
            isLeading: row.is_leading,
            measureMethod: row.measure_method ?? null,
            outputField: row.output_field ?? null,
            outcomeField: row.outcome_field ?? null,
          },
          update: {
            text: row.kpi_text,
            type: row.type as import('@prisma/client').KPIType,
            targetNumeric: row.target_numeric ?? null,
            unit: row.unit ?? null,
            isLeading: row.is_leading,
            measureMethod: row.measure_method ?? null,
            outputField: row.output_field ?? null,
            outcomeField: row.outcome_field ?? null,
          },
        }),
      ),
    );
  }

  log.info('KPIDef upsert complete', { count: rows.length });
  return diff;
}

// ============================================
// AnchorRef
// ============================================

export async function upsertAnchorRefs(
  rows: AnchorRefRow[],
  prisma: PrismaClient,
  dryRun: boolean,
): Promise<EntityDiff> {
  const csvById = new Map(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        kegiatanId: row.kegiatan_id,
        source: row.source,
        link: row.link_ref ?? null,
        excerpt: row.excerpt_ringkas ?? null,
      },
    ]),
  );

  const existing = await prisma.anchorRef.findMany({
    select: { id: true, kegiatanId: true, source: true, link: true, excerpt: true },
  });
  const dbById = new Map(existing.map((e) => [e.id, e as Record<string, unknown>]));

  const diff = computeDiff('AnchorRef', csvById as Map<string, Record<string, unknown>>, dbById);

  if (dryRun) return diff;

  for (const batch of chunk(rows, BATCH_SIZE)) {
    await prisma.$transaction(
      batch.map((row) =>
        prisma.anchorRef.upsert({
          where: { id: row.id },
          create: {
            id: row.id,
            kegiatanId: row.kegiatan_id,
            source: row.source,
            link: row.link_ref ?? null,
            excerpt: row.excerpt_ringkas ?? null,
          },
          update: {
            source: row.source,
            link: row.link_ref ?? null,
            excerpt: row.excerpt_ringkas ?? null,
          },
        }),
      ),
    );
  }

  log.info('AnchorRef upsert complete', { count: rows.length });
  return diff;
}

// ============================================
// PassportItem
// ============================================

export async function upsertPassportItems(
  rows: PassportItemRow[],
  prisma: PrismaClient,
  dryRun: boolean,
): Promise<EntityDiff> {
  const csvById = new Map(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        dimensi: row.dimensi,
        kegiatanId: row.kegiatan_id ?? null,
        description: row.description,
        targetWaktu: row.target_waktu,
        evidenceType: row.evidence_type,
        verifierRoleHint: row.verifier_role_hint,
        ordinal: row.order,
      },
    ]),
  );

  const existing = await prisma.passportItem.findMany({
    select: { id: true, dimensi: true, kegiatanId: true, description: true, targetWaktu: true, evidenceType: true, verifierRoleHint: true, ordinal: true },
  });
  const dbById = new Map(existing.map((e) => [e.id, e as Record<string, unknown>]));

  const diff = computeDiff('PassportItem', csvById as Map<string, Record<string, unknown>>, dbById);

  if (dryRun) return diff;

  for (const batch of chunk(rows, BATCH_SIZE)) {
    await prisma.$transaction(
      batch.map((row) =>
        prisma.passportItem.upsert({
          where: { id: row.id },
          create: {
            id: row.id,
            dimensi: row.dimensi as import('@prisma/client').DimensiKey,
            kegiatanId: row.kegiatan_id ?? null,
            description: row.description,
            targetWaktu: row.target_waktu,
            evidenceType: row.evidence_type as import('@prisma/client').EvidenceType,
            verifierRoleHint: row.verifier_role_hint,
            ordinal: row.order,
          },
          update: {
            dimensi: row.dimensi as import('@prisma/client').DimensiKey,
            kegiatanId: row.kegiatan_id ?? null,
            description: row.description,
            targetWaktu: row.target_waktu,
            evidenceType: row.evidence_type as import('@prisma/client').EvidenceType,
            verifierRoleHint: row.verifier_role_hint,
            ordinal: row.order,
          },
        }),
      ),
    );
  }

  log.info('PassportItem upsert complete', { count: rows.length });
  return diff;
}
