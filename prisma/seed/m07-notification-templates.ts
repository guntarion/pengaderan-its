/**
 * prisma/seed/m07-notification-templates.ts
 * NAWASENA M07 — Seed 6 notification templates for Time Capsule & Life Map.
 *
 * Idempotent: uses findFirst + upsert pattern by templateKey.
 * Global templates (organizationId = null) shared across all orgs.
 */

import { PrismaClient, ChannelType, NotificationCategory, TemplateFormat } from '@prisma/client';
import { createLogger } from '../../src/lib/logger';

const log = createLogger('seed:m07-notification-templates');

interface TemplateDefinition {
  templateKey: string;
  description: string;
  category: NotificationCategory;
  supportedChannels: ChannelType[];
  payloadSchema: object;
  version: {
    version: string;
    format: TemplateFormat;
    content: {
      push?: { title: string; body: string };
      inApp?: { title: string; body: string };
    };
  };
}

const M07_TEMPLATES: TemplateDefinition[] = [
  // ── Life Map Milestone Reminders ────────────────────────────────────────
  {
    templateKey: 'LIFE_MAP_MILESTONE_1_DUE',
    description: 'Reminder pengisian Milestone M1 Life Map (awal F2)',
    category: NotificationCategory.FORM_REMINDER,
    supportedChannels: [ChannelType.IN_APP, ChannelType.PUSH],
    payloadSchema: {
      type: 'object',
      properties: {
        userName: { type: 'string' },
        openDate: { type: 'string' },
        closeDate: { type: 'string' },
        activeGoalCount: { type: 'number' },
      },
      required: ['userName'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.PLAIN,
      content: {
        push: {
          title: 'Waktunya Milestone M1 Life Map!',
          body: 'Hei {{userName}}, window Milestone M1 sudah dibuka. Isi progress goal-mu sekarang!',
        },
        inApp: {
          title: 'Milestone M1 Life Map Dibuka',
          body: 'Window Milestone M1 sudah dibuka ({{openDate}} – {{closeDate}}). Kamu punya {{activeGoalCount}} goal aktif. Isi sekarang!',
        },
      },
    },
  },
  {
    templateKey: 'LIFE_MAP_MILESTONE_2_DUE',
    description: 'Reminder pengisian Milestone M2 Life Map (tengah F2)',
    category: NotificationCategory.FORM_REMINDER,
    supportedChannels: [ChannelType.IN_APP, ChannelType.PUSH],
    payloadSchema: {
      type: 'object',
      properties: {
        userName: { type: 'string' },
        openDate: { type: 'string' },
        closeDate: { type: 'string' },
        activeGoalCount: { type: 'number' },
      },
      required: ['userName'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.PLAIN,
      content: {
        push: {
          title: 'Waktunya Milestone M2 Life Map!',
          body: 'Hei {{userName}}, window Milestone M2 sudah dibuka. Refleksikan progress mid-F2 kamu!',
        },
        inApp: {
          title: 'Milestone M2 Life Map Dibuka',
          body: 'Window Milestone M2 sudah dibuka ({{openDate}} – {{closeDate}}). Evaluasi progress tengah F2 kamu sekarang!',
        },
      },
    },
  },
  {
    templateKey: 'LIFE_MAP_MILESTONE_3_DUE',
    description: 'Reminder pengisian Milestone M3 Life Map (akhir F2)',
    category: NotificationCategory.FORM_REMINDER,
    supportedChannels: [ChannelType.IN_APP, ChannelType.PUSH],
    payloadSchema: {
      type: 'object',
      properties: {
        userName: { type: 'string' },
        openDate: { type: 'string' },
        closeDate: { type: 'string' },
        activeGoalCount: { type: 'number' },
      },
      required: ['userName'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.PLAIN,
      content: {
        push: {
          title: 'Milestone M3 (Final) Life Map!',
          body: 'Hei {{userName}}, ini Milestone terakhir F2. Isi refleksi akhir goal-mu!',
        },
        inApp: {
          title: 'Milestone M3 (Final) Life Map Dibuka',
          body: 'Window Milestone M3 final dibuka ({{openDate}} – {{closeDate}}). Selesaikan refleksi akhir F2 kamu!',
        },
      },
    },
  },
  {
    templateKey: 'LIFE_MAP_MILESTONE_OVERDUE_REMINDER',
    description: 'Reminder keterlambatan pengisian Milestone Life Map (H+7 setelah window tutup)',
    category: NotificationCategory.NORMAL,
    supportedChannels: [ChannelType.IN_APP],
    payloadSchema: {
      type: 'object',
      properties: {
        userName: { type: 'string' },
        milestone: { type: 'string', enum: ['M1', 'M2', 'M3'] },
        daysPastClose: { type: 'number' },
        goalCount: { type: 'number' },
      },
      required: ['userName', 'milestone'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.PLAIN,
      content: {
        inApp: {
          title: 'Milestone {{milestone}} Belum Diisi',
          body: 'Hei {{userName}}, window Milestone {{milestone}} sudah lewat {{daysPastClose}} hari. Kamu masih bisa mengisi (akan ditandai late). Jangan lewatkan!',
        },
      },
    },
  },

  // ── Share Notifications (for Kakak Kasuh) ───────────────────────────────
  {
    templateKey: 'TIME_CAPSULE_NEW_SHARED',
    description: 'Notifikasi ke Kakak Kasuh saat Maba share entry Time Capsule baru',
    category: NotificationCategory.NORMAL,
    supportedChannels: [ChannelType.IN_APP],
    payloadSchema: {
      type: 'object',
      properties: {
        kasuhName: { type: 'string' },
        mabaName: { type: 'string' },
        entryTitle: { type: 'string' },
        entryUrl: { type: 'string' },
      },
      required: ['kasuhName', 'mabaName'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.PLAIN,
      content: {
        inApp: {
          title: '{{mabaName}} Berbagi Catatan Baru',
          body: 'Hei {{kasuhName}}, Adik Asuh-mu {{mabaName}} baru saja berbagi catatan Time Capsule denganmu. Baca sekarang!',
        },
      },
    },
  },
  {
    templateKey: 'LIFE_MAP_UPDATE_SHARED',
    description: 'Notifikasi ke Kakak Kasuh saat Maba share goal Life Map baru',
    category: NotificationCategory.NORMAL,
    supportedChannels: [ChannelType.IN_APP],
    payloadSchema: {
      type: 'object',
      properties: {
        kasuhName: { type: 'string' },
        mabaName: { type: 'string' },
        goalArea: { type: 'string' },
        goalUrl: { type: 'string' },
      },
      required: ['kasuhName', 'mabaName'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.PLAIN,
      content: {
        inApp: {
          title: '{{mabaName}} Berbagi Goal Life Map',
          body: 'Hei {{kasuhName}}, Adik Asuh-mu {{mabaName}} berbagi goal baru di area {{goalArea}}. Lihat sekarang!',
        },
      },
    },
  },
];

export async function seedM07NotificationTemplates(
  prisma: PrismaClient,
  superAdminId: string,
): Promise<void> {
  log.info('Seeding M07 notification templates', { count: M07_TEMPLATES.length });

  for (const tmpl of M07_TEMPLATES) {
    // Upsert parent template (global — organizationId null)
    const existingTemplate = await prisma.notificationTemplate.findFirst({
      where: {
        templateKey: tmpl.templateKey,
        organizationId: null,
      },
    });

    let template;

    if (existingTemplate) {
      template = await prisma.notificationTemplate.update({
        where: { id: existingTemplate.id },
        data: {
          description: tmpl.description,
          category: tmpl.category,
          supportedChannels: tmpl.supportedChannels,
          payloadSchema: tmpl.payloadSchema,
        },
      });
      log.debug('Updated existing template', { templateKey: tmpl.templateKey });
    } else {
      template = await prisma.notificationTemplate.create({
        data: {
          templateKey: tmpl.templateKey,
          organizationId: null,
          description: tmpl.description,
          category: tmpl.category,
          supportedChannels: tmpl.supportedChannels,
          payloadSchema: tmpl.payloadSchema,
        },
      });
      log.debug('Created new template', { templateKey: tmpl.templateKey });
    }

    // Upsert version 1.0.0
    const existingVersion = await prisma.notificationTemplateVersion.findFirst({
      where: {
        templateId: template.id,
        version: tmpl.version.version,
      },
    });

    if (!existingVersion) {
      const version = await prisma.notificationTemplateVersion.create({
        data: {
          templateId: template.id,
          version: tmpl.version.version,
          format: tmpl.version.format,
          content: tmpl.version.content,
          createdById: superAdminId,
          publishedAt: new Date(),
        },
      });

      // Set active version if not set
      if (!template.activeVersionId) {
        await prisma.notificationTemplate.update({
          where: { id: template.id },
          data: { activeVersionId: version.id },
        });
      }

      log.debug('Created template version', {
        templateKey: tmpl.templateKey,
        version: tmpl.version.version,
      });
    } else {
      log.debug('Template version already exists', {
        templateKey: tmpl.templateKey,
        version: tmpl.version.version,
      });
    }
  }

  log.info('M07 notification templates seed complete', { count: M07_TEMPLATES.length });
}
