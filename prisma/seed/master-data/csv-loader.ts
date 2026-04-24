/**
 * prisma/seed/master-data/csv-loader.ts
 * Stream CSV files from disk using csv-parse. Returns typed arrays.
 */

import { parse } from 'csv-parse';
import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '../../../src/lib/logger';

const log = createLogger('seed:csv-loader');

const SEED_DATA_DIR = path.resolve(
  __dirname,
  '../../../docs/modul/02-master-data-taksonomi/seed-data',
);

/**
 * Load a CSV file and return all rows as raw string-keyed objects.
 * Uses csv-parse with relaxed_quotes to handle quoted fields containing commas.
 */
export async function loadCsv(filename: string): Promise<Record<string, string>[]> {
  const filePath = path.join(SEED_DATA_DIR, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = [];

    fs.createReadStream(filePath)
      .pipe(
        parse({
          columns: true,          // use first row as column names
          skip_empty_lines: true,
          trim: true,
          relax_quotes: true,
          relax_column_count: true,
        }),
      )
      .on('data', (row: Record<string, string>) => {
        rows.push(row);
      })
      .on('error', (err) => {
        log.error('CSV parse error', { filename, error: err });
        reject(err);
      })
      .on('end', () => {
        log.debug('CSV loaded', { filename, rows: rows.length });
        resolve(rows);
      });
  });
}

/**
 * Load all 11 CSVs at once. Returns a named map.
 */
export async function loadAllCsvs() {
  log.info('Loading all CSV files');

  const [
    kegiatan,
    tujuan,
    kpiDef,
    anchorRef,
    passportItem,
    rubrik,
    forbiddenAct,
    safeguard,
    taxonomy,
    formInventory,
    rolePermission,
  ] = await Promise.all([
    loadCsv('kegiatan_master.csv'),
    loadCsv('tujuan_pembelajaran.csv'),
    loadCsv('kpi_definition.csv'),
    loadCsv('anchor_konsep.csv'),
    loadCsv('passport_items.csv'),
    loadCsv('rubrik_aacu.csv'),
    loadCsv('forbidden_acts.csv'),
    loadCsv('safeguard_protocol.csv'),
    loadCsv('nilai_dimensi_taxonomy.csv'),
    loadCsv('form_inventory.csv'),
    loadCsv('roles_permissions.csv'),
  ]);

  log.info('All CSVs loaded', {
    kegiatan: kegiatan.length,
    tujuan: tujuan.length,
    kpiDef: kpiDef.length,
    anchorRef: anchorRef.length,
    passportItem: passportItem.length,
    rubrik: rubrik.length,
    forbiddenAct: forbiddenAct.length,
    safeguard: safeguard.length,
    taxonomy: taxonomy.length,
    formInventory: formInventory.length,
    rolePermission: rolePermission.length,
  });

  return {
    kegiatan,
    tujuan,
    kpiDef,
    anchorRef,
    passportItem,
    rubrik,
    forbiddenAct,
    safeguard,
    taxonomy,
    formInventory,
    rolePermission,
  };
}
