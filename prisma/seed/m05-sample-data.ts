/**
 * prisma/seed/m05-sample-data.ts
 * NAWASENA M05 — Passport Digital sample data for development.
 *
 * Guard: only runs in non-production environments.
 * Creates: 5 PassportEntry mix status for the first found Maba user,
 *          1 PassportQrSession ACTIVE dummy.
 *
 * Usage: imported by prisma/seed/index.ts
 */

import { PrismaClient, PassportEntryStatus } from '@prisma/client';
import { createLogger } from '../../src/lib/logger';

const log = createLogger('seed:m05-passport');

export async function seedM05SampleData(prisma: PrismaClient): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    log.info('Skipping M05 sample data seed in production');
    return;
  }

  log.info('Seeding M05 Passport Digital sample data...');

  // Find organization, cohort, and users
  const org = await prisma.organization.findFirst();
  if (!org) {
    log.warn('No organization found, skipping M05 seed');
    return;
  }

  const cohort = await prisma.cohort.findFirst({
    where: { organizationId: org.id },
  });
  if (!cohort) {
    log.warn('No cohort found, skipping M05 seed');
    return;
  }

  // Find a Maba user
  const maba = await prisma.user.findFirst({
    where: { organizationId: org.id, role: 'MABA' },
  });
  if (!maba) {
    log.warn('No MABA user found, skipping M05 seed');
    return;
  }

  // Find a KP/KASUH user as verifier
  const verifier = await prisma.user.findFirst({
    where: {
      organizationId: org.id,
      role: { in: ['KP', 'KASUH', 'SC'] },
    },
  });

  // Find passport items
  const items = await prisma.passportItem.findMany({
    take: 6,
  });
  if (items.length < 2) {
    log.warn('Not enough PassportItems found, skipping M05 seed');
    return;
  }

  const statuses: PassportEntryStatus[] = [
    'VERIFIED',
    'VERIFIED',
    'PENDING',
    'REJECTED',
    'CANCELLED',
  ];

  // Upsert sample entries
  for (let i = 0; i < Math.min(statuses.length, items.length); i++) {
    const status = statuses[i];
    const item = items[i];
    const idempotencyKey = `dev-seed-m05-entry-${maba.id}-${item.id}`;

    await prisma.passportEntry.upsert({
      where: { clientIdempotencyKey: idempotencyKey },
      update: {},
      create: {
        organizationId: org.id,
        cohortId: cohort.id,
        userId: maba.id,
        itemId: item.id,
        evidenceType: item.evidenceType,
        status,
        clientIdempotencyKey: idempotencyKey,
        verifierId: verifier?.id ?? null,
        verifiedAt: status === 'VERIFIED' ? new Date() : null,
        verifierNote: status === 'REJECTED' ? 'Bukti tidak cukup jelas, tolong ulangi.' : null,
        cancelledAt: status === 'CANCELLED' ? new Date() : null,
      },
    });
  }

  // Upsert a QR session
  if (items.length > 0 && verifier) {
    const existingQr = await prisma.passportQrSession.findFirst({
      where: { organizationId: org.id, itemId: items[0].id, status: 'ACTIVE' },
    });

    if (!existingQr) {
      await prisma.passportQrSession.create({
        data: {
          organizationId: org.id,
          cohortId: cohort.id,
          itemId: items[0].id,
          createdByUserId: verifier.id,
          eventName: 'Dev Seed Event 2026',
          eventLocation: 'Ruang KM ITS',
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
          scanCount: 0,
        },
      });
    }
  }

  log.info('M05 Passport Digital sample data seeded successfully');
}
