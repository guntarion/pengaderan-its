/**
 * prisma/seed/m09-notification-rules.ts
 * NAWASENA M09 — Seed 6 M09 KP & Kasuh Logbook notification rules.
 *
 * Idempotent: upsert by (name + isGlobal=true + organizationId null).
 * All rules are global (organizationId=null, isGlobal=true).
 *
 * Rules:
 *   R-M09-DAILY-17        — KP daily reminder weekday 17:00 WIB
 *   R-M09-WEEKLY-MON-09   — KP weekly debrief reminder Monday 09:00 WIB
 *   R-M09-KASUH-SAT-10    — Kasuh biweekly check Saturday 10:00 WIB
 *   R-M09-DAILY-MISS-21   — KP missed daily weekday 21:00 WIB
 *   R-M09-KASUH-OVERDUE-H3 — Kasuh overdue H+3 daily check
 *   R-M09-SC-KP-MISS-H3   — KP miss 3 days → SC notification
 */

import { PrismaClient, ChannelType, NotificationCategory } from '@prisma/client';
import { createLogger } from '../../src/lib/logger';

const log = createLogger('seed:m09-notification-rules');

interface RuleDefinition {
  key: string;
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

const M09_RULES: RuleDefinition[] = [
  {
    key: 'R-M09-DAILY-17',
    name: 'KP Daily Reminder (17:00)',
    description: 'Weekday reminder for KP to submit daily stand-up (17:00 WIB = 10:00 UTC)',
    templateKey: 'KP_DAILY_REMINDER',
    cronExpression: '0 10 * * 1-5',
    timezone: 'Asia/Jakarta',
    category: NotificationCategory.FORM_REMINDER,
    channels: [ChannelType.PUSH, ChannelType.EMAIL],
    audienceResolverKey: 'kp-daily-reminder',
    maxRemindersPerWeek: 5,
  },
  {
    key: 'R-M09-WEEKLY-MON-09',
    name: 'KP Weekly Debrief Reminder (Monday 09:00)',
    description: 'Monday reminder for KP to submit weekly debrief (09:00 WIB = 02:00 UTC)',
    templateKey: 'KP_WEEKLY_DEBRIEF_REMINDER',
    cronExpression: '0 2 * * 1',
    timezone: 'Asia/Jakarta',
    category: NotificationCategory.FORM_REMINDER,
    channels: [ChannelType.PUSH, ChannelType.EMAIL],
    audienceResolverKey: 'kp-weekly-debrief-reminder',
    maxRemindersPerWeek: 1,
  },
  {
    key: 'R-M09-KASUH-SAT-10',
    name: 'Kasuh Biweekly Check (Saturday 10:00)',
    description: 'Saturday biweekly reminder for Kasuh to fill logbook (10:00 WIB = 03:00 UTC)',
    templateKey: 'KASUH_BIWEEKLY_REMINDER',
    cronExpression: '0 3 * * 6',
    timezone: 'Asia/Jakarta',
    category: NotificationCategory.FORM_REMINDER,
    channels: [ChannelType.PUSH, ChannelType.EMAIL],
    audienceResolverKey: 'kasuh-biweekly-check',
    maxRemindersPerWeek: 1,
  },
  {
    key: 'R-M09-DAILY-MISS-21',
    name: 'KP Missed Daily Reminder (21:00)',
    description: 'Weekday late reminder for KP who have not submitted daily stand-up (21:00 WIB = 14:00 UTC)',
    templateKey: 'KP_DAILY_MISS_REMINDER',
    cronExpression: '0 14 * * 1-5',
    timezone: 'Asia/Jakarta',
    category: NotificationCategory.FORM_REMINDER,
    channels: [ChannelType.PUSH, ChannelType.EMAIL],
    audienceResolverKey: 'kp-daily-miss-reminder',
    maxRemindersPerWeek: 5,
  },
  {
    key: 'R-M09-KASUH-OVERDUE-H3',
    name: 'Kasuh Overdue H+3 Check',
    description: 'Daily check for Kasuh who have exceeded H+3 deadline without submitting logbook (08:00 WIB = 01:00 UTC)',
    templateKey: 'KASUH_URGENT_FLAG',
    cronExpression: '0 1 * * *',
    timezone: 'Asia/Jakarta',
    category: NotificationCategory.OPS,
    channels: [ChannelType.PUSH, ChannelType.EMAIL],
    audienceResolverKey: 'kasuh-overdue-h3',
    maxRemindersPerWeek: 3,
  },
  {
    key: 'R-M09-SC-KP-MISS-H3',
    name: 'SC Alert: KP Miss 3 Days',
    description: 'Daily check notifying SC when a KP misses 3 consecutive daily stand-ups (21:30 WIB = 14:30 UTC)',
    templateKey: 'RED_FLAG_NORMAL_KP_LOG',
    cronExpression: '30 14 * * 1-5',
    timezone: 'Asia/Jakarta',
    category: NotificationCategory.OPS,
    channels: [ChannelType.PUSH, ChannelType.EMAIL],
    audienceResolverKey: 'sc-kp-miss-h3',
    maxRemindersPerWeek: 5,
  },
];

export async function seedM09NotificationRules(
  prisma: PrismaClient,
  superAdminId: string,
): Promise<void> {
  log.info('Seeding M09 notification rules', { count: M09_RULES.length });

  for (const rule of M09_RULES) {
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
      log.debug('Updated existing M09 rule', { key: rule.key, name: rule.name });
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
      log.debug('Created new M09 rule', { key: rule.key, name: rule.name, id: created.id });
    }
  }

  log.info('M09 notification rules seeded successfully', { count: M09_RULES.length });
}
