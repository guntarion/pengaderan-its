#!/usr/bin/env tsx
/**
 * prisma/seed/master-data.ts
 * CLI entry point for M02 master data seed.
 *
 * Usage:
 *   npm run seed:master-data:preview   # show diff without writing
 *   npm run seed:master-data:apply     # write to DB (idempotent)
 *
 * CLI flags:
 *   --preview   Show diff only, no writes
 *   --apply     Write to DB
 *   --only=<entity>   Seed only one entity (e.g. --only=kegiatan)
 *   --dry-run   Alias for --preview
 */

import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../src/lib/logger';
import { loadAllCsvs } from './master-data/csv-loader';
import {
  kegiatanMasterRowSchema,
  tujuanRowSchema,
  kpiDefRowSchema,
  anchorRefRowSchema,
  passportItemRowSchema,
  rubrikRowSchema,
  forbiddenActRowSchema,
  safeguardProtocolRowSchema,
  taxonomyMetaRowSchema,
  formInventoryRowSchema,
  rolePermissionRowSchema,
} from './master-data/csv-schemas';
import { validateCrossReferences } from './master-data/integrity-check';
import { printDiffReport, serializeDiff, type EntityDiff } from './master-data/diff-computer';
import { acquireAdvisoryLock } from './master-data/lock';
import {
  upsertTaxonomyMeta,
  upsertRubrik,
  upsertForbiddenActs,
  upsertSafeguardProtocols,
  upsertFormInventory,
  upsertRolePermissions,
  upsertKegiatan,
  upsertTujuan,
  upsertKpiDefs,
  upsertAnchorRefs,
  upsertPassportItems,
} from './master-data/batch-upsert';

const log = createLogger('seed:master-data');

// Default organization code (HMTC is the primary org for all seed data)
const DEFAULT_ORG_CODE = process.env.TENANT_ORG_CODE ?? 'HMTC';

// ============================================
// Parse CLI arguments
// ============================================

const args = process.argv.slice(2);
const isPreview = args.includes('--preview') || args.includes('--dry-run');
const isApply = args.includes('--apply');
const onlyArg = args.find((a) => a.startsWith('--only='));
const onlyEntity = onlyArg ? onlyArg.split('=')[1] : null;
const outputJson = args.includes('--json');

if (!isPreview && !isApply) {
  log.error('Must specify --preview or --apply');
  process.exit(1);
}

// ============================================
// Main seed function
// ============================================

async function main() {
  const prisma = new PrismaClient();
  const startMs = Date.now();

  log.info('M02 Master Data Seed started', {
    mode: isPreview ? 'preview' : 'apply',
    onlyEntity,
    defaultOrgCode: DEFAULT_ORG_CODE,
  });

  let lock: Awaited<ReturnType<typeof acquireAdvisoryLock>> | null = null;

  try {
    // Only acquire lock for apply mode
    if (isApply) {
      lock = await acquireAdvisoryLock(prisma);
    }

    // Step 1: Load CSVs
    const rawCsvs = await loadAllCsvs();

    // Step 2: Parse and validate with Zod
    log.info('Validating CSV rows with Zod schemas');

    const parseErrors: string[] = [];

    function parseRows<T>(rows: Record<string, string>[], schema: { safeParse: (row: Record<string, string>) => { success: boolean; data?: T; error?: { issues?: Array<{ message: string }> } } }, entityName: string): T[] {
      const parsed: T[] = [];
      for (let i = 0; i < rows.length; i++) {
        const result = schema.safeParse(rows[i]);
        if (!result.success) {
          const msg = `${entityName} row ${i + 1}: ${result.error?.issues?.map((e: { message: string }) => e.message).join('; ')}`;
          parseErrors.push(msg);
          log.warn(msg);
        } else if (result.data) {
          parsed.push(result.data);
        }
      }
      return parsed;
    }

    const kegiatan = parseRows(rawCsvs.kegiatan, kegiatanMasterRowSchema, 'Kegiatan');
    const tujuan = parseRows(rawCsvs.tujuan, tujuanRowSchema, 'Tujuan');
    const kpiDef = parseRows(rawCsvs.kpiDef, kpiDefRowSchema, 'KPIDef');
    const anchorRef = parseRows(rawCsvs.anchorRef, anchorRefRowSchema, 'AnchorRef');
    const passportItem = parseRows(rawCsvs.passportItem, passportItemRowSchema, 'PassportItem');
    const rubrik = parseRows(rawCsvs.rubrik, rubrikRowSchema, 'Rubrik');
    const forbiddenAct = parseRows(rawCsvs.forbiddenAct, forbiddenActRowSchema, 'ForbiddenAct');
    const safeguard = parseRows(rawCsvs.safeguard, safeguardProtocolRowSchema, 'SafeguardProtocol');
    const taxonomy = parseRows(rawCsvs.taxonomy, taxonomyMetaRowSchema, 'TaxonomyMeta');
    const formInventory = parseRows(rawCsvs.formInventory, formInventoryRowSchema, 'FormInventory');
    const rolePermission = parseRows(rawCsvs.rolePermission, rolePermissionRowSchema, 'RolePermission');

    if (parseErrors.length > 0) {
      log.error('Zod validation failed', { errorCount: parseErrors.length });
      for (const err of parseErrors) {
        log.error(`  ${err}`);
      }
      throw new Error(`CSV validation failed with ${parseErrors.length} errors. Fix before seeding.`);
    }

    log.info('All CSV rows validated successfully');

    // Step 3: Cross-reference integrity check
    const integrity = validateCrossReferences({ kegiatan, tujuan, kpiDef, anchorRef, passportItem, rubrik });
    if (!integrity.valid) {
      throw new Error(`Integrity check failed:\n${integrity.errors.join('\n')}`);
    }

    // Step 4: Resolve organization
    const org = await prisma.organization.findUnique({ where: { code: DEFAULT_ORG_CODE } });
    if (!org) {
      throw new Error(`Organization with code '${DEFAULT_ORG_CODE}' not found. Run M01 seed first.`);
    }
    const organizationId = org.id;
    log.info('Using organization', { code: DEFAULT_ORG_CODE, id: organizationId });

    // Step 5: Run upserts (or dry-run compute diffs)
    const dryRun = isPreview;
    const diffs: EntityDiff[] = [];

    // Order per 06-model-data.md §6.4:
    // TaxonomyMeta → Rubrik → ForbiddenAct → SafeguardProtocol → FormInventory → RolePermission
    // → Kegiatan → Tujuan → KPIDef → AnchorRef → PassportItem

    if (!onlyEntity || onlyEntity === 'taxonomy') {
      diffs.push(await upsertTaxonomyMeta(taxonomy, prisma, organizationId, dryRun));
    }
    if (!onlyEntity || onlyEntity === 'rubrik') {
      diffs.push(await upsertRubrik(rubrik, prisma, dryRun));
    }
    if (!onlyEntity || onlyEntity === 'forbidden-acts') {
      diffs.push(await upsertForbiddenActs(forbiddenAct, prisma, dryRun));
    }
    if (!onlyEntity || onlyEntity === 'safeguard') {
      diffs.push(await upsertSafeguardProtocols(safeguard, prisma, dryRun));
    }
    if (!onlyEntity || onlyEntity === 'form-inventory') {
      diffs.push(await upsertFormInventory(formInventory, prisma, dryRun));
    }
    if (!onlyEntity || onlyEntity === 'roles-permissions') {
      diffs.push(await upsertRolePermissions(rolePermission, prisma, dryRun));
    }
    if (!onlyEntity || onlyEntity === 'kegiatan') {
      diffs.push(await upsertKegiatan(kegiatan, prisma, organizationId, dryRun));
    }
    if (!onlyEntity || onlyEntity === 'tujuan') {
      diffs.push(await upsertTujuan(tujuan, prisma, dryRun));
    }
    if (!onlyEntity || onlyEntity === 'kpi') {
      diffs.push(await upsertKpiDefs(kpiDef, prisma, dryRun));
    }
    if (!onlyEntity || onlyEntity === 'anchor') {
      diffs.push(await upsertAnchorRefs(anchorRef, prisma, dryRun));
    }
    if (!onlyEntity || onlyEntity === 'passport') {
      diffs.push(await upsertPassportItems(passportItem, prisma, dryRun));
    }

    // Step 6: Print report
    printDiffReport(diffs);

    if (outputJson) {
      process.stdout.write(JSON.stringify(serializeDiff(diffs), null, 2) + '\n');
    }

    const durationMs = Date.now() - startMs;

    // Step 7: Write audit log for apply mode
    if (isApply) {
      const summary = serializeDiff(diffs);
      try {
        await prisma.nawasenaAuditLog.create({
          data: {
            action: 'MASTER_DATA_SEED',
            entityType: 'MasterDataSeed',
            entityId: `seed-${Date.now()}`,
            metadata: JSON.parse(JSON.stringify({
              mode: 'apply',
              durationMs,
              summary,
              orgCode: DEFAULT_ORG_CODE,
            })),
          },
        });
        log.info('Audit log entry created for MASTER_DATA_SEED');
      } catch (auditErr) {
        log.warn('Failed to create audit log entry (non-fatal)', { error: auditErr });
      }
    }

    log.info('Seed complete', {
      mode: isPreview ? 'preview' : 'apply',
      durationMs,
    });
  } catch (err) {
    const durationMs = Date.now() - startMs;
    log.error('Seed failed', { error: err, durationMs });

    // Write failure audit log
    if (isApply) {
      try {
        const prismaForAudit = new PrismaClient();
        await prismaForAudit.nawasenaAuditLog.create({
          data: {
            action: 'MASTER_DATA_SEED_FAILED',
            entityType: 'MasterDataSeed',
            entityId: `seed-failed-${Date.now()}`,
            metadata: {
              mode: 'apply',
              durationMs,
              error: String(err),
            },
          },
        });
        await prismaForAudit.$disconnect();
      } catch {
        // Ignore audit failure
      }
    }

    process.exit(1);
  } finally {
    if (lock) {
      await lock.release();
    }
    await prisma.$disconnect();
  }
}

main();
