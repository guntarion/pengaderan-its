#!/usr/bin/env tsx
/**
 * scripts/anon-retention-cron.ts
 * NAWASENA M12 — 3-year retention soft-redaction cron.
 *
 * Finds RESOLVED/ESCALATED_TO_SATGAS reports older than 3 years
 * where bodyRedacted=false, then redacts body text and clears attachmentKey.
 *
 * Usage:
 *   npx tsx scripts/anon-retention-cron.ts           # normal run
 *   npx tsx scripts/anon-retention-cron.ts --dry-run # preview only
 *   npx tsx scripts/anon-retention-cron.ts --force   # skip 100+ batch confirmation
 *
 * Emits metric: anon_retention_redacted_count
 * Guard: manual confirmation if batch > 100 (unless --force)
 */

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const isDryRun = process.argv.includes('--dry-run');
const isForce = process.argv.includes('--force');

const RETENTION_YEARS = 3;
const BATCH_GUARD_THRESHOLD = 100;
const REDACTED_TEXT = '[REDACTED after 3-year retention policy]';

const prisma = new PrismaClient();

/** Simple metric counter (logged at end) */
let retentionRedactedCount = 0;

function getRetentionCutoff(): Date {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - RETENTION_YEARS);
  return cutoff;
}

async function confirmLargeBatch(count: number): Promise<boolean> {
  if (isForce) {
    console.log(`[retention-cron] --force flag: skipping confirmation for ${count} records`);
    return true;
  }

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      `\n[retention-cron] WARNING: About to redact ${count} reports. Type "YES" to confirm: `,
      (answer) => {
        rl.close();
        resolve(answer.trim() === 'YES');
      },
    );
  });
}

async function main(): Promise<void> {
  console.log(
    `[retention-cron] Starting NAWASENA M12 retention cron ${isDryRun ? '(DRY RUN)' : ''}`,
  );

  const cutoff = getRetentionCutoff();
  console.log(
    `[retention-cron] Retention cutoff: ${cutoff.toISOString()} (reports before this date eligible)`,
  );

  // Find eligible reports
  const eligibleReports = await prisma.anonReport.findMany({
    where: {
      recordedAt: { lt: cutoff },
      bodyRedacted: false,
      status: {
        in: ['RESOLVED', 'ESCALATED_TO_SATGAS'],
      },
    },
    select: {
      id: true,
      trackingCode: true,
      recordedAt: true,
      status: true,
    },
    orderBy: { recordedAt: 'asc' },
  });

  const count = eligibleReports.length;
  console.log(`[retention-cron] Found ${count} eligible report(s) for redaction`);

  if (count === 0) {
    console.log('[retention-cron] Nothing to redact. Exiting.');
    await prisma.$disconnect();
    return;
  }

  // Show preview
  console.log('[retention-cron] First 5 eligible reports:');
  eligibleReports.slice(0, 5).forEach((r) => {
    console.log(`  - ${r.trackingCode} | Status: ${r.status} | Recorded: ${r.recordedAt.toISOString()}`);
  });
  if (count > 5) {
    console.log(`  ... and ${count - 5} more`);
  }

  if (isDryRun) {
    console.log(`\n[retention-cron] DRY RUN — would redact ${count} report(s). No changes made.`);
    console.log(`[retention-cron] anon_retention_redacted_count (dry): ${count}`);
    await prisma.$disconnect();
    return;
  }

  // Guard: require confirmation for large batches
  if (count > BATCH_GUARD_THRESHOLD) {
    const confirmed = await confirmLargeBatch(count);
    if (!confirmed) {
      console.log('[retention-cron] Cancelled by user. Exiting.');
      await prisma.$disconnect();
      return;
    }
  }

  // Redact in batches of 50
  const BATCH_SIZE = 50;
  let processed = 0;

  for (let i = 0; i < eligibleReports.length; i += BATCH_SIZE) {
    const batch = eligibleReports.slice(i, i + BATCH_SIZE);
    const ids = batch.map((r) => r.id);

    try {
      const result = await prisma.anonReport.updateMany({
        where: { id: { in: ids } },
        data: {
          bodyText: REDACTED_TEXT,
          bodyRedacted: true,
          attachmentKey: null,
        },
      });

      processed += result.count;
      retentionRedactedCount += result.count;

      console.log(
        `[retention-cron] Batch ${Math.floor(i / BATCH_SIZE) + 1}: redacted ${result.count} records (total: ${processed}/${count})`,
      );
    } catch (err) {
      console.error(`[retention-cron] Batch failed at index ${i}:`, err);
      // Continue with next batch — don't abort entire run
    }
  }

  console.log(`\n[retention-cron] Done. Redacted ${retentionRedactedCount} report(s).`);
  console.log(`[retention-cron] METRIC anon_retention_redacted_count=${retentionRedactedCount}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('[retention-cron] Fatal error:', err);
  void prisma.$disconnect().then(() => process.exit(1));
});
