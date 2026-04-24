/**
 * prisma/seed/master-data/diff-computer.ts
 * Compute added/updated/unchanged/orphan between CSV rows and DB state.
 */

import * as crypto from 'crypto';
import { createLogger } from '../../../src/lib/logger';

const log = createLogger('seed:diff-computer');

export interface DiffResult {
  added: string[];
  updated: string[];
  unchanged: string[];
  orphan: string[];
}

export interface EntityDiff {
  entityName: string;
  result: DiffResult;
}

/**
 * Hash an object to a stable string for comparison.
 * Excludes timestamp fields (updatedAt, createdAt) to avoid false positives.
 */
function hashRow(obj: Record<string, unknown>): string {
  const normalized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key === 'updatedAt' || key === 'createdAt') continue;
    // Normalize arrays to sorted JSON for stable comparison
    if (Array.isArray(val)) {
      normalized[key] = JSON.stringify([...val].sort());
    } else if (val === null || val === undefined) {
      normalized[key] = null;
    } else {
      normalized[key] = val;
    }
  }
  return crypto.createHash('sha1').update(JSON.stringify(normalized)).digest('hex');
}

/**
 * Compare CSV rows against DB rows by natural ID.
 * @param entityName  Human-readable entity name for logging
 * @param csvById     Map of id → CSV-derived record
 * @param dbById      Map of id → DB record (from prisma findMany)
 */
export function computeDiff(
  entityName: string,
  csvById: Map<string, Record<string, unknown>>,
  dbById: Map<string, Record<string, unknown>>,
): EntityDiff {
  const added: string[] = [];
  const updated: string[] = [];
  const unchanged: string[] = [];
  const orphan: string[] = [];

  // Check CSV rows against DB
  for (const [id, csvRow] of csvById) {
    if (!dbById.has(id)) {
      added.push(id);
    } else {
      const dbRow = dbById.get(id)!;
      const csvHash = hashRow(csvRow as Record<string, unknown>);
      const dbHash = hashRow(dbRow as Record<string, unknown>);
      if (csvHash !== dbHash) {
        updated.push(id);
      } else {
        unchanged.push(id);
      }
    }
  }

  // Check DB rows not in CSV (orphans)
  for (const id of dbById.keys()) {
    if (!csvById.has(id)) {
      orphan.push(id);
    }
  }

  const result: DiffResult = { added, updated, unchanged, orphan };

  log.info(`== ${entityName} ==`, {
    added: added.length,
    updated: updated.length,
    unchanged: unchanged.length,
    orphan: orphan.length,
  });

  return { entityName, result };
}

/**
 * Print a human-readable summary report.
 */
export function printDiffReport(diffs: EntityDiff[]): void {
  let totalAdded = 0;
  let totalUpdated = 0;
  let totalUnchanged = 0;
  let totalOrphan = 0;

  log.info('=== Seed Diff Report ===');
  for (const { entityName, result } of diffs) {
    log.info(`${entityName}:`, {
      added: result.added.length,
      updated: result.updated.length,
      unchanged: result.unchanged.length,
      orphan: result.orphan.length,
    });
    if (result.added.length > 0) {
      log.info(`  added IDs: ${result.added.slice(0, 10).join(', ')}${result.added.length > 10 ? '...' : ''}`);
    }
    if (result.updated.length > 0) {
      log.info(`  updated IDs: ${result.updated.slice(0, 10).join(', ')}${result.updated.length > 10 ? '...' : ''}`);
    }
    if (result.orphan.length > 0) {
      log.warn(`  orphan IDs (in DB but not in CSV): ${result.orphan.slice(0, 5).join(', ')}`);
    }
    totalAdded += result.added.length;
    totalUpdated += result.updated.length;
    totalUnchanged += result.unchanged.length;
    totalOrphan += result.orphan.length;
  }
  log.info('=== Grand Total ===', {
    added: totalAdded,
    updated: totalUpdated,
    unchanged: totalUnchanged,
    orphan: totalOrphan,
  });
}

/**
 * Serialize diff for machine-readable JSON output (used by admin UI API).
 */
export function serializeDiff(diffs: EntityDiff[]): Record<string, DiffResult> {
  const result: Record<string, DiffResult> = {};
  for (const { entityName, result: diff } of diffs) {
    result[entityName] = diff;
  }
  return result;
}
