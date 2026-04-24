/**
 * prisma/seed/notifications-preferences.ts
 * NAWASENA M15 — Backfill NotificationPreference for all existing users.
 *
 * Idempotent: skip users who already have a preference record.
 * Creates preference with defaults + unique unsubscribeToken.
 */

import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../src/lib/logger';
import crypto from 'crypto';

const log = createLogger('seed:notifications-preferences');

export async function seedNotificationPreferences(prisma: PrismaClient): Promise<void> {
  log.info('Seeding notification preferences for existing users');

  // Fetch all users that don't have a preference yet
  const usersWithoutPreference = await prisma.user.findMany({
    where: {
      notificationPreference: null,
    },
    select: {
      id: true,
      organizationId: true,
      email: true,
    },
  });

  log.info('Found users without notification preferences', {
    count: usersWithoutPreference.length,
  });

  if (usersWithoutPreference.length === 0) {
    log.info('All users already have notification preferences, skipping');
    return;
  }

  let created = 0;
  let failed = 0;

  for (const user of usersWithoutPreference) {
    try {
      const unsubscribeToken = crypto.randomUUID();

      await prisma.notificationPreference.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          pushEnabled: true,
          emailEnabled: true,
          whatsappEnabled: false,
          digestMode: 'IMMEDIATE',
          unsubscribeToken,
        },
      });

      created++;
      log.debug('Created preference for user', { userId: user.id });
    } catch (err) {
      failed++;
      log.error('Failed to create preference for user', { userId: user.id, error: err });
    }
  }

  log.info('Notification preferences seeded', {
    total: usersWithoutPreference.length,
    created,
    failed,
  });
}
