/**
 * prisma/seed/notifications-rules.ts
 * NAWASENA M15 — Seed 7 default global notification rules (R01–R07).
 *
 * Idempotent: upsert by (name + isGlobal=true + organizationId null).
 * All rules are global (organizationId=null, isGlobal=true).
 */

import { PrismaClient, ChannelType, NotificationCategory } from '@prisma/client';
import { createLogger } from '../../src/lib/logger';

const log = createLogger('seed:notifications-rules');

interface RuleDefinition {
  name: string;
  description: string;
  templateKey: string;
  cronExpression: string;
  timezone: string;
  category: NotificationCategory;
  channels: ChannelType[];
  audienceResolverKey: string;
  maxRemindersPerWeek: number;
}

const RULES: RuleDefinition[] = [
  {
    name: 'Maba Pulse Daily',
    description: 'Daily reminder for Maba to fill Pulse check-in (19:00 WIB = 12:00 UTC)',
    templateKey: 'MABA_PULSE_DAILY',
    cronExpression: '0 12 * * *',
    timezone: 'Asia/Jakarta',
    category: NotificationCategory.FORM_REMINDER,
    channels: [ChannelType.PUSH, ChannelType.EMAIL],
    audienceResolverKey: 'maba-pulse-daily',
    maxRemindersPerWeek: 3,
  },
  {
    name: 'Maba Journal Saturday',
    description: 'Saturday reminder for Maba to fill Weekly Journal (17:00 WIB = 10:00 UTC)',
    templateKey: 'MABA_JOURNAL_WEEKLY',
    cronExpression: '0 10 * * 6',
    timezone: 'Asia/Jakarta',
    category: NotificationCategory.FORM_REMINDER,
    channels: [ChannelType.PUSH, ChannelType.EMAIL],
    audienceResolverKey: 'maba-journal-weekly',
    maxRemindersPerWeek: 2,
  },
  {
    name: 'Maba Journal Sunday',
    description: 'Sunday reminder for Maba to fill Weekly Journal (19:00 WIB = 12:00 UTC)',
    templateKey: 'MABA_JOURNAL_WEEKLY',
    cronExpression: '0 12 * * 0',
    timezone: 'Asia/Jakarta',
    category: NotificationCategory.FORM_REMINDER,
    channels: [ChannelType.PUSH, ChannelType.EMAIL],
    audienceResolverKey: 'maba-journal-weekly',
    maxRemindersPerWeek: 2,
  },
  {
    name: 'KP Stand-up Daily',
    description: 'Weekday reminder for KP to submit daily stand-up (17:00 WIB = 10:00 UTC)',
    templateKey: 'KP_STANDUP_DAILY',
    cronExpression: '0 10 * * 1-5',
    timezone: 'Asia/Jakarta',
    category: NotificationCategory.FORM_REMINDER,
    channels: [ChannelType.PUSH, ChannelType.EMAIL],
    audienceResolverKey: 'kp-standup-daily',
    maxRemindersPerWeek: 3,
  },
  {
    name: 'KP Debrief Weekly',
    description: 'Monday reminder for KP to submit weekly debrief (09:00 WIB = 02:00 UTC)',
    templateKey: 'KP_DEBRIEF_WEEKLY',
    cronExpression: '0 2 * * 1',
    timezone: 'Asia/Jakarta',
    category: NotificationCategory.FORM_REMINDER,
    channels: [ChannelType.PUSH, ChannelType.EMAIL],
    audienceResolverKey: 'kp-debrief-weekly',
    maxRemindersPerWeek: 1,
  },
  {
    name: 'Kasuh Logbook Biweekly',
    description: 'Alternate Saturday reminder for Kasuh to open logbook (10:00 WIB = 03:00 UTC)',
    templateKey: 'KASUH_LOGBOOK_BIWEEKLY',
    cronExpression: '0 3 * * 6',
    timezone: 'Asia/Jakarta',
    category: NotificationCategory.FORM_REMINDER,
    channels: [ChannelType.PUSH, ChannelType.EMAIL],
    audienceResolverKey: 'kasuh-logbook-biweekly',
    maxRemindersPerWeek: 1,
  },
  {
    name: 'Daily Scan (H-7 Events + Triwulan)',
    description: 'Daily scan for H-7 event setup reminders and quarterly review reminders (08:00 WIB = 01:00 UTC)',
    templateKey: 'OC_SETUP_H7',
    cronExpression: '0 1 * * *',
    timezone: 'Asia/Jakarta',
    category: NotificationCategory.OPS,
    channels: [ChannelType.PUSH, ChannelType.EMAIL],
    audienceResolverKey: 'daily-scan',
    maxRemindersPerWeek: 1,
  },
];

export async function seedNotificationRules(
  prisma: PrismaClient,
  superAdminId: string,
): Promise<void> {
  log.info('Seeding notification rules', { count: RULES.length });

  for (const rule of RULES) {
    // Check if global rule with this name + templateKey already exists
    const existingRule = await prisma.notificationRule.findFirst({
      where: {
        name: rule.name,
        isGlobal: true,
        organizationId: null,
      },
    });

    if (existingRule) {
      await prisma.notificationRule.update({
        where: { id: existingRule.id },
        data: {
          description: rule.description,
          cronExpression: rule.cronExpression,
          channels: rule.channels,
          maxRemindersPerWeek: rule.maxRemindersPerWeek,
        },
      });
      log.debug('Updated existing rule', { name: rule.name });
    } else {
      const created = await prisma.notificationRule.create({
        data: {
          name: rule.name,
          description: rule.description,
          templateKey: rule.templateKey,
          cronExpression: rule.cronExpression,
          timezone: rule.timezone,
          category: rule.category,
          channels: rule.channels,
          audienceResolverKey: rule.audienceResolverKey,
          maxRemindersPerWeek: rule.maxRemindersPerWeek,
          isGlobal: true,
          organizationId: null,
          active: true,
          createdById: superAdminId,
        },
      });
      log.debug('Created new rule', { name: rule.name, id: created.id });
    }
  }

  log.info('Notification rules seeded successfully', { count: RULES.length });
}
