/**
 * prisma/seed/mh-notification-templates.ts
 * NAWASENA M11 — Seed 8 Mental Health Screening notification templates.
 *
 * Idempotent: upsert by (templateKey + organizationId null).
 * All templates are global (organizationId=null, isGlobal semantics).
 *
 * PRIVACY NOTE:
 *   - CRITICAL templates (SAC, coordinator, immediate) contain NO Maba PII.
 *   - Support alert to KP is anonymous by design.
 *
 * Templates:
 *   MH_REFERRAL_SAC           — CRITICAL to SAC counselor (no PII)
 *   MH_SUPPORT_ALERT_KP       — NORMAL to KP (anonymous, no Maba name)
 *   MH_ESCALATION_COORDINATOR — CRITICAL to Poli Psikologi coordinator
 *   MH_REASSIGN_MABA          — NORMAL to Maba (counselor reassignment)
 *   MH_RETENTION_WARNING      — NORMAL to Maba (14-day pre-delete warning)
 *   MH_REMINDER_F1            — NORMAL opt-in (F1 screening reminder)
 *   MH_REMINDER_F4            — NORMAL opt-in (F4 re-screening reminder)
 *   MH_IMMEDIATE_CONTACT      — CRITICAL to SAC (24h SLA override)
 */

import { PrismaClient, ChannelType, NotificationCategory, TemplateFormat } from '@prisma/client';
import { createLogger } from '../../src/lib/logger';

const log = createLogger('seed:mh-notification-templates');

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
      email?: { subject: string; reactComponent: string; fallbackHtml?: string };
    };
  };
}

const MH_TEMPLATES: TemplateDefinition[] = [
  {
    templateKey: 'MH_REFERRAL_SAC',
    description: 'CRITICAL to SAC counselor — new RED screening referral assigned. NO Maba PII in payload.',
    category: NotificationCategory.CRITICAL,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        referralId: { type: 'string' },
        slaDeadlineAt: { type: 'string', format: 'date-time' },
        immediateContact: { type: 'boolean' },
        queueUrl: { type: 'string' },
      },
      required: ['referralId', 'slaDeadlineAt', 'immediateContact'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: '[KRITIS] Penugasan Konseling Baru',
          body: 'Anda ditugaskan untuk mendampingi satu anggota yang membutuhkan dukungan segera. Batas waktu: {{slaDeadlineAt}}.',
        },
        email: {
          subject: '[KRITIS] Penugasan Konseling Baru — SAC NAWASENA',
          reactComponent: 'src/emails/MhReferralSac',
          fallbackHtml: '<p>Anda ditugaskan untuk mendampingi satu anggota yang membutuhkan dukungan. Batas waktu: {{slaDeadlineAt}}. Lihat antrian konseling Anda segera.</p>',
        },
      },
    },
  },
  {
    templateKey: 'MH_SUPPORT_ALERT_KP',
    description: 'NORMAL to KP — anonymous support alert. No Maba name or data. Just a gentle nudge to support the group.',
    category: NotificationCategory.NORMAL,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        tipsLink: { type: 'string' },
      },
      required: [],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Perhatikan Kondisi Kelompokmu',
          body: 'Ada anggota KP-Group yang mungkin membutuhkan dukungan lebih. Mohon perhatikan kondisi umum anggotamu.',
        },
        email: {
          subject: 'Pesan untuk KP: Perhatikan Kondisi Kelompok',
          reactComponent: 'src/emails/MhSupportAlertKp',
          fallbackHtml: '<p>Ada anggota KP-Group yang mungkin membutuhkan dukungan lebih. Mohon perhatikan kondisi umum anggota kelompokmu secara proaktif. Jangan bertanya siapa yang spesifik.</p>',
        },
      },
    },
  },
  {
    templateKey: 'MH_ESCALATION_COORDINATOR',
    description: 'CRITICAL to Poli Psikologi coordinator — SAC SLA missed, case escalated.',
    category: NotificationCategory.CRITICAL,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        referralId: { type: 'string' },
        originalSACId: { type: 'string' },
        queueUrl: { type: 'string' },
      },
      required: ['referralId', 'originalSACId'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: '[ESKALASI] Kasus Konseling Melewati Batas Waktu',
          body: 'Satu kasus konseling telah melewati batas waktu SLA dan perlu penanganan segera oleh Koordinator.',
        },
        email: {
          subject: '[ESKALASI KRITIS] Kasus Konseling Melewati SLA — Poli Psikologi',
          reactComponent: 'src/emails/MhEscalationCoordinator',
          fallbackHtml: '<p>Satu kasus konseling (ID: {{referralId}}) telah melewati batas waktu SLA. Konselor awal: {{originalSACId}}. Mohon ambil alih penanganan segera.</p>',
        },
      },
    },
  },
  {
    templateKey: 'MH_REASSIGN_MABA',
    description: 'NORMAL to Maba — their SAC counselor has been reassigned.',
    category: NotificationCategory.NORMAL,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        userName: { type: 'string' },
        dashboardUrl: { type: 'string' },
      },
      required: ['userName'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Konselor Pendampingmu Telah Diperbarui',
          body: 'Hei {{userName}}, konselor SAC yang mendampingimu telah digantikan. Proses pendampingan tetap berjalan.',
        },
        email: {
          subject: 'Konselor Pendampingmu Telah Diperbarui — NAWASENA',
          reactComponent: 'src/emails/MhRetentionWarning',
          fallbackHtml: '<p>Hei {{userName}}, konselor SAC yang mendampingimu telah digantikan. Proses pendampingan tetap berlanjut tanpa gangguan.</p>',
        },
      },
    },
  },
  {
    templateKey: 'MH_RETENTION_WARNING',
    description: 'NORMAL to Maba — 14-day pre-delete warning before retention purge.',
    category: NotificationCategory.NORMAL,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        userName: { type: 'string' },
        deleteDate: { type: 'string', format: 'date' },
        privacyUrl: { type: 'string' },
      },
      required: ['userName', 'deleteDate'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Data Skrining Akan Dihapus dalam 14 Hari',
          body: 'Hei {{userName}}, data skrining kesehatanmu akan dihapus otomatis pada {{deleteDate}}. Kamu bisa perpanjang dengan ikut riset anonim.',
        },
        email: {
          subject: 'Pemberitahuan: Data Skrining Kesehatan Mental Akan Dihapus',
          reactComponent: 'src/emails/MhRetentionWarning',
          fallbackHtml: '<p>Hei {{userName}}, data skrining kesehatan mentalmu akan dihapus otomatis pada {{deleteDate}}. Jika ingin berkontribusi pada riset anonim, kamu bisa memilih perpanjangan retensi di menu Privasi.</p>',
        },
      },
    },
  },
  {
    templateKey: 'MH_REMINDER_F1',
    description: 'NORMAL opt-in reminder — F1 phase screening opening.',
    category: NotificationCategory.FORM_REMINDER,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        userName: { type: 'string' },
        screeningUrl: { type: 'string' },
        deadline: { type: 'string', format: 'date' },
      },
      required: ['userName'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Skrining Kesehatan Mental F1 Dibuka',
          body: 'Hei {{userName}}, skrining kesehatan mental F1 NAWASENA kini tersedia. Hanya 5 menit!',
        },
        email: {
          subject: 'Skrining Kesehatan Mental F1 NAWASENA — Tersedia Sekarang',
          reactComponent: 'src/emails/MhRetentionWarning',
          fallbackHtml: '<p>Hei {{userName}}, skrining kesehatan mental F1 NAWASENA kini tersedia. Luangkan 5 menit untuk mengisi dan dapatkan dukungan yang kamu butuhkan.</p>',
        },
      },
    },
  },
  {
    templateKey: 'MH_REMINDER_F4',
    description: 'NORMAL opt-in reminder — F4 phase re-screening.',
    category: NotificationCategory.FORM_REMINDER,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        userName: { type: 'string' },
        screeningUrl: { type: 'string' },
      },
      required: ['userName'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Skrining Ulang Kesehatan Mental F4',
          body: 'Hei {{userName}}, sudah waktunya skrining kesehatan mental F4. Lihat perkembangan kondisimu selama masa angkatan.',
        },
        email: {
          subject: 'Skrining Kesehatan Mental F4 NAWASENA — Lihat Perkembanganmu',
          reactComponent: 'src/emails/MhRetentionWarning',
          fallbackHtml: '<p>Hei {{userName}}, ini adalah kesempatan skrining ulang di fase F4. Luangkan waktu 5 menit untuk membantu kami memastikan kondisimu baik-baik saja.</p>',
        },
      },
    },
  },
  {
    templateKey: 'MH_IMMEDIATE_CONTACT',
    description: 'CRITICAL to SAC — 24h SLA override for immediate contact cases (PHQ-9 item 9 > 0).',
    category: NotificationCategory.CRITICAL,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        referralId: { type: 'string' },
        slaDeadlineAt: { type: 'string', format: 'date-time' },
        queueUrl: { type: 'string' },
      },
      required: ['referralId', 'slaDeadlineAt'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: '[DARURAT] Kontak Segera Diperlukan — 24 Jam',
          body: 'DARURAT: Ada anggota yang membutuhkan kontak langsung dalam 24 jam. Hubungi segera melalui antrian konseling.',
        },
        email: {
          subject: '[DARURAT 24 JAM] Kontak Segera Diperlukan — SAC NAWASENA',
          reactComponent: 'src/emails/MhReferralSac',
          fallbackHtml: '<p>DARURAT: Ada anggota yang membutuhkan kontak langsung dalam 24 jam (ID Referral: {{referralId}}). Batas waktu: {{slaDeadlineAt}}. Hubungi segera dan catat tindakanmu di sistem.</p>',
        },
      },
    },
  },
];

export async function seedMHNotificationTemplates(
  prisma: PrismaClient,
  superAdminId: string,
): Promise<void> {
  log.info('Seeding M11 MH notification templates', { count: MH_TEMPLATES.length });

  for (const tmpl of MH_TEMPLATES) {
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
      log.debug('Updated existing MH template', { templateKey: tmpl.templateKey });
    } else {
      template = await prisma.notificationTemplate.create({
        data: {
          templateKey: tmpl.templateKey,
          description: tmpl.description,
          category: tmpl.category,
          organizationId: null,
          supportedChannels: tmpl.supportedChannels,
          payloadSchema: tmpl.payloadSchema,
        },
      });
      log.debug('Created new MH template', { templateKey: tmpl.templateKey, id: template.id });
    }

    // Upsert version v1.0.0
    const existingVersion = await prisma.notificationTemplateVersion.findUnique({
      where: {
        templateId_version: {
          templateId: template.id,
          version: tmpl.version.version,
        },
      },
    });

    if (existingVersion) {
      log.debug('Version already exists, skipping', {
        templateKey: tmpl.templateKey,
        version: tmpl.version.version,
      });
    } else {
      await prisma.notificationTemplateVersion.create({
        data: {
          templateId: template.id,
          version: tmpl.version.version,
          format: tmpl.version.format,
          content: tmpl.version.content,
          createdById: superAdminId,
          publishedAt: new Date(),
        },
      });
      log.debug('Created MH template version', {
        templateKey: tmpl.templateKey,
        version: tmpl.version.version,
      });
    }
  }

  log.info('M11 MH notification templates seeded successfully', { count: MH_TEMPLATES.length });
}
