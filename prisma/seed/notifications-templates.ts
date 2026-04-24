/**
 * prisma/seed/notifications-templates.ts
 * NAWASENA M15 — Seed 16 notification templates with v1.0.0 versions.
 *
 * Idempotent: uses upsert by unique key (organizationId null + templateKey).
 * Global templates (organizationId = null) are shared across all orgs.
 */

import { PrismaClient, ChannelType, NotificationCategory, TemplateFormat } from '@prisma/client';
import { createLogger } from '../../src/lib/logger';

const log = createLogger('seed:notifications-templates');

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
      whatsapp?: { body: string };
    };
  };
}

const TEMPLATES: TemplateDefinition[] = [
  {
    templateKey: 'MABA_PULSE_DAILY',
    description: 'Daily Maba Pulse check-in reminder',
    category: NotificationCategory.FORM_REMINDER,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        userName: { type: 'string' },
        pulseUrl: { type: 'string' },
      },
      required: ['userName'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Isi Pulse Harian Kamu',
          body: 'Hei {{userName}}, jangan lupa isi Pulse harian kamu hari ini ya!',
        },
        email: {
          subject: 'Pengingat: Isi Pulse Harian NAWASENA',
          reactComponent: 'src/emails/MabaPulseDaily',
          fallbackHtml: '<p>Hei {{userName}}, jangan lupa isi Pulse harian kamu hari ini ya!</p>',
        },
        whatsapp: {
          body: 'Hei {{userName}}, jangan lupa isi Pulse harian kamu hari ini ya!',
        },
      },
    },
  },
  {
    templateKey: 'MABA_JOURNAL_WEEKLY',
    description: 'Weekly Maba Journal reflection reminder',
    category: NotificationCategory.FORM_REMINDER,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        userName: { type: 'string' },
        journalUrl: { type: 'string' },
        weekNumber: { type: 'number' },
      },
      required: ['userName'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Waktu Menulis Jurnal Mingguan',
          body: 'Hei {{userName}}, saatnya refleksi seminggu ini di Jurnal Mingguan kamu!',
        },
        email: {
          subject: 'Pengingat: Jurnal Mingguan NAWASENA Minggu Ini',
          reactComponent: 'src/emails/MabaJournalWeekly',
          fallbackHtml: '<p>Hei {{userName}}, saatnya refleksi di Jurnal Mingguan kamu!</p>',
        },
        whatsapp: {
          body: 'Hei {{userName}}, saatnya refleksi di Jurnal Mingguan kamu!',
        },
      },
    },
  },
  {
    templateKey: 'KP_STANDUP_DAILY',
    description: 'Daily KP Stand-up submission reminder',
    category: NotificationCategory.FORM_REMINDER,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        userName: { type: 'string' },
        standupUrl: { type: 'string' },
      },
      required: ['userName'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Isi Stand-up Harian KP',
          body: 'Hei {{userName}}, sudahkah kamu mengisi Stand-up harian hari ini?',
        },
        email: {
          subject: 'Pengingat: Stand-up Harian KP NAWASENA',
          reactComponent: 'src/emails/KpStandupDaily',
          fallbackHtml: '<p>Hei {{userName}}, sudahkah kamu mengisi Stand-up harian hari ini?</p>',
        },
        whatsapp: {
          body: 'Hei {{userName}}, sudahkah kamu mengisi Stand-up harian hari ini?',
        },
      },
    },
  },
  {
    templateKey: 'KP_DEBRIEF_WEEKLY',
    description: 'Weekly KP Debrief submission reminder (Monday)',
    category: NotificationCategory.FORM_REMINDER,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        userName: { type: 'string' },
        debriefUrl: { type: 'string' },
      },
      required: ['userName'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Isi Debrief Mingguan KP',
          body: 'Hei {{userName}}, jangan lupa mengisi Debrief Mingguan KP kamu!',
        },
        email: {
          subject: 'Pengingat: Debrief Mingguan KP NAWASENA',
          reactComponent: 'src/emails/KpDebriefWeekly',
          fallbackHtml: '<p>Hei {{userName}}, jangan lupa mengisi Debrief Mingguan KP kamu!</p>',
        },
        whatsapp: {
          body: 'Hei {{userName}}, jangan lupa mengisi Debrief Mingguan KP kamu!',
        },
      },
    },
  },
  {
    templateKey: 'KASUH_LOGBOOK_BIWEEKLY',
    description: 'Biweekly Kasuh Logbook reminder (alternate Saturday)',
    category: NotificationCategory.FORM_REMINDER,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        userName: { type: 'string' },
        logbookUrl: { type: 'string' },
      },
      required: ['userName'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Buka Logbook KASUH',
          body: 'Hei {{userName}}, saatnya membuka Logbook KASUH dua mingguan!',
        },
        email: {
          subject: 'Pengingat: Logbook KASUH Dua Mingguan NAWASENA',
          reactComponent: 'src/emails/KasuhLogbookBiweekly',
          fallbackHtml: '<p>Hei {{userName}}, saatnya membuka Logbook KASUH dua mingguan!</p>',
        },
        whatsapp: {
          body: 'Hei {{userName}}, saatnya membuka Logbook KASUH dua mingguan!',
        },
      },
    },
  },
  {
    templateKey: 'OC_SETUP_H7',
    description: 'H-7 reminder for OC to setup upcoming event',
    category: NotificationCategory.OPS,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        userName: { type: 'string' },
        eventName: { type: 'string' },
        eventDate: { type: 'string' },
        setupUrl: { type: 'string' },
      },
      required: ['userName', 'eventName', 'eventDate'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'H-7: Setup Kegiatan {{eventName}}',
          body: 'Hei {{userName}}, kegiatan {{eventName}} tinggal 7 hari lagi. Sudahkah setup dilakukan?',
        },
        email: {
          subject: 'H-7 Reminder: Setup Kegiatan {{eventName}}',
          reactComponent: 'src/emails/OcSetupH7',
          fallbackHtml: '<p>Hei {{userName}}, kegiatan {{eventName}} tinggal 7 hari lagi. Setup sekarang!</p>',
        },
        whatsapp: {
          body: 'Hei {{userName}}, kegiatan {{eventName}} tinggal 7 hari lagi. Setup sekarang!',
        },
      },
    },
  },
  {
    templateKey: 'SC_TRIWULAN_H7',
    description: 'H-7 reminder for SC to prepare quarterly review',
    category: NotificationCategory.OPS,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        userName: { type: 'string' },
        triwulanName: { type: 'string' },
        reviewDate: { type: 'string' },
        triwulanUrl: { type: 'string' },
      },
      required: ['userName', 'triwulanName', 'reviewDate'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'H-7: Persiapan Triwulan {{triwulanName}}',
          body: 'Hei {{userName}}, Review Triwulan {{triwulanName}} tinggal 7 hari lagi. Persiapkan sekarang!',
        },
        email: {
          subject: 'H-7 Reminder: Persiapan Review Triwulan {{triwulanName}}',
          reactComponent: 'src/emails/ScTriwulanH7',
          fallbackHtml: '<p>Hei {{userName}}, Review Triwulan tinggal 7 hari lagi!</p>',
        },
        whatsapp: {
          body: 'Hei {{userName}}, Review Triwulan tinggal 7 hari lagi!',
        },
      },
    },
  },
  {
    templateKey: 'MABA_NPS_POST_EVENT',
    description: 'Post-event NPS survey notification for Maba (30 min after event ends)',
    category: NotificationCategory.NORMAL,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        userName: { type: 'string' },
        eventName: { type: 'string' },
        npsUrl: { type: 'string' },
      },
      required: ['userName', 'eventName'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Bagaimana kegiatan {{eventName}}?',
          body: 'Hei {{userName}}, tolong isi survey NPS untuk kegiatan {{eventName}} ya!',
        },
        email: {
          subject: 'Survey NPS: Kegiatan {{eventName}}',
          reactComponent: 'src/emails/MabaNpsPostEvent',
          fallbackHtml: '<p>Hei {{userName}}, tolong isi survey NPS untuk kegiatan {{eventName}} ya!</p>',
        },
        whatsapp: {
          body: 'Hei {{userName}}, tolong isi survey NPS untuk kegiatan {{eventName}} ya!',
        },
      },
    },
  },
  {
    templateKey: 'SAFEGUARD_RED_ALERT',
    description: 'Critical safety incident RED alert — overrides user opt-out',
    category: NotificationCategory.CRITICAL,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        userName: { type: 'string' },
        incidentId: { type: 'string' },
        incidentUrl: { type: 'string' },
      },
      required: ['userName', 'incidentId'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'KRITIS: Insiden Safeguard RED',
          body: 'Ada insiden Safeguard RED yang membutuhkan tindakan segera. Cek sekarang!',
        },
        email: {
          subject: '[KRITIS] Insiden Safeguard RED — Tindakan Diperlukan Segera',
          reactComponent: 'src/emails/CriticalAlert',
          fallbackHtml: '<p>Ada insiden Safeguard RED yang membutuhkan tindakan segera. Cek sekarang!</p>',
        },
        whatsapp: {
          body: '[KRITIS] Ada insiden Safeguard RED yang membutuhkan tindakan segera. Cek sekarang!',
        },
      },
    },
  },
  {
    templateKey: 'ANON_REPORT_NEW',
    description: 'Anonymous report received — notify relevant officers',
    category: NotificationCategory.CRITICAL,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        userName: { type: 'string' },
        reportId: { type: 'string' },
        reportUrl: { type: 'string' },
      },
      required: ['userName', 'reportId'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Laporan Anonim Baru',
          body: 'Ada laporan anonim baru yang membutuhkan penanganan segera.',
        },
        email: {
          subject: '[Laporan Anonim] Laporan Baru — Tindakan Diperlukan',
          reactComponent: 'src/emails/AnonReportSilent',
          fallbackHtml: '<p>Ada laporan anonim baru yang membutuhkan penanganan segera.</p>',
        },
        whatsapp: {
          body: 'Ada laporan anonim baru yang membutuhkan penanganan segera.',
        },
      },
    },
  },
  {
    templateKey: 'MH_RED_SCREENING',
    description: 'Mental health screening RED result — critical alert to counselor',
    category: NotificationCategory.CRITICAL,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        userName: { type: 'string' },
        screeningId: { type: 'string' },
        screeningUrl: { type: 'string' },
      },
      required: ['userName', 'screeningId'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'KRITIS: Hasil Screening MH RED',
          body: 'Ada hasil screening Mental Health RED yang membutuhkan tindakan segera!',
        },
        email: {
          subject: '[KRITIS] Hasil Screening Mental Health RED — Tindakan Segera',
          reactComponent: 'src/emails/CriticalAlert',
          fallbackHtml: '<p>Ada hasil screening Mental Health RED yang membutuhkan tindakan segera!</p>',
        },
        whatsapp: {
          body: '[KRITIS] Ada hasil screening MH RED yang membutuhkan tindakan segera!',
        },
      },
    },
  },
  {
    templateKey: 'PASSPORT_VERIFY_PENDING',
    description: 'Notification to verifier that a passport entry is awaiting verification',
    category: NotificationCategory.NORMAL,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        userName: { type: 'string' },
        mabaName: { type: 'string' },
        passportEntryId: { type: 'string' },
        verifyUrl: { type: 'string' },
      },
      required: ['userName', 'mabaName', 'passportEntryId'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Entri Passport Menunggu Verifikasi',
          body: 'Hei {{userName}}, {{mabaName}} mengirimkan entri Passport yang membutuhkan verifikasi kamu.',
        },
        email: {
          subject: 'Entri Passport {{mabaName}} Menunggu Verifikasi',
          reactComponent: 'src/emails/PassportVerifyPending',
          fallbackHtml: '<p>Hei {{userName}}, {{mabaName}} mengirimkan entri Passport yang membutuhkan verifikasi kamu.</p>',
        },
        whatsapp: {
          body: 'Hei {{userName}}, {{mabaName}} mengirimkan entri Passport yang membutuhkan verifikasi kamu.',
        },
      },
    },
  },
  {
    templateKey: 'PASSPORT_VERIFIED',
    description: 'Notification to Maba that their passport entry has been verified',
    category: NotificationCategory.NORMAL,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        userName: { type: 'string' },
        dimensiName: { type: 'string' },
        passportUrl: { type: 'string' },
      },
      required: ['userName', 'dimensiName'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Entri Passport Kamu Diverifikasi!',
          body: 'Hei {{userName}}, entri Passport dimensi {{dimensiName}} kamu telah diverifikasi.',
        },
        email: {
          subject: 'Entri Passport {{dimensiName}} Berhasil Diverifikasi',
          reactComponent: 'src/emails/PassportVerified',
          fallbackHtml: '<p>Hei {{userName}}, entri Passport dimensi {{dimensiName}} kamu telah diverifikasi.</p>',
        },
        whatsapp: {
          body: 'Hei {{userName}}, entri Passport dimensi {{dimensiName}} kamu telah diverifikasi!',
        },
      },
    },
  },
  {
    templateKey: 'PAKTA_RESIGN_REQUIRED',
    description: 'Notification to users who need to re-sign Pakta when new version is published',
    category: NotificationCategory.NORMAL,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        userName: { type: 'string' },
        paktaType: { type: 'string' },
        paktaUrl: { type: 'string' },
      },
      required: ['userName', 'paktaType'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Tanda Tangan Ulang Pakta Diperlukan',
          body: 'Hei {{userName}}, versi baru {{paktaType}} telah diterbitkan. Tanda tangan ulang diperlukan.',
        },
        email: {
          subject: 'Tanda Tangan Ulang Diperlukan: {{paktaType}}',
          reactComponent: 'src/emails/PaktaResignRequired',
          fallbackHtml: '<p>Hei {{userName}}, versi baru {{paktaType}} telah diterbitkan. Tanda tangan ulang diperlukan.</p>',
        },
        whatsapp: {
          body: 'Hei {{userName}}, versi baru {{paktaType}} terbit. Tanda tangan ulang diperlukan!',
        },
      },
    },
  },
  {
    templateKey: 'TRIWULAN_SIGNOFF_NEEDED',
    description: 'Notification to Pembina that a Triwulan review needs sign-off',
    category: NotificationCategory.OPS,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        userName: { type: 'string' },
        triwulanName: { type: 'string' },
        submittedBy: { type: 'string' },
        triwulanUrl: { type: 'string' },
      },
      required: ['userName', 'triwulanName', 'submittedBy'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Triwulan Perlu Tanda Tangan',
          body: 'Hei {{userName}}, Review Triwulan {{triwulanName}} dari {{submittedBy}} membutuhkan sign-off kamu.',
        },
        email: {
          subject: 'Review Triwulan {{triwulanName}} Perlu Sign-off',
          reactComponent: 'src/emails/TriwulanSignoffNeeded',
          fallbackHtml: '<p>Hei {{userName}}, Review Triwulan {{triwulanName}} dari {{submittedBy}} membutuhkan sign-off kamu.</p>',
        },
        whatsapp: {
          body: 'Hei {{userName}}, Review Triwulan {{triwulanName}} dari {{submittedBy}} butuh sign-off kamu!',
        },
      },
    },
  },
  {
    templateKey: 'KP_ESCALATION_MABA_SILENT',
    description: 'Escalation notification to KP when their Maba has been repeatedly silent',
    category: NotificationCategory.NORMAL,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        userName: { type: 'string' },
        mabaName: { type: 'string' },
        formType: { type: 'string' },
        missCount: { type: 'number' },
      },
      required: ['userName', 'mabaName', 'formType'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Eskalasi: {{mabaName}} Tidak Mengisi',
          body: 'Hei {{userName}}, {{mabaName}} sudah beberapa kali tidak mengisi {{formType}}. Mohon follow-up.',
        },
        email: {
          subject: 'Eskalasi: {{mabaName}} Berulang Kali Tidak Mengisi {{formType}}',
          reactComponent: 'src/emails/KpEscalationMabaSilent',
          fallbackHtml: '<p>Hei {{userName}}, {{mabaName}} berulang kali tidak mengisi {{formType}}. Mohon follow-up.</p>',
        },
        whatsapp: {
          body: 'Hei {{userName}}, {{mabaName}} berulang kali tidak mengisi {{formType}}. Mohon follow-up!',
        },
      },
    },
  },
];

export async function seedNotificationTemplates(
  prisma: PrismaClient,
  superAdminId: string,
): Promise<void> {
  log.info('Seeding notification templates', { count: TEMPLATES.length });

  for (const tmpl of TEMPLATES) {
    // Upsert parent template (global — organizationId null)
    // Note: unique constraint is (organizationId, templateKey)
    // For null organizationId, we use findFirst + upsert workaround
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
          description: tmpl.description,
          category: tmpl.category,
          organizationId: null,
          supportedChannels: tmpl.supportedChannels,
          payloadSchema: tmpl.payloadSchema,
        },
      });
      log.debug('Created new template', { templateKey: tmpl.templateKey, id: template.id });
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

    let version;

    if (existingVersion) {
      version = existingVersion;
      log.debug('Version already exists, skipping', {
        templateKey: tmpl.templateKey,
        version: tmpl.version.version,
      });
    } else {
      version = await prisma.notificationTemplateVersion.create({
        data: {
          templateId: template.id,
          version: tmpl.version.version,
          format: tmpl.version.format,
          content: tmpl.version.content,
          createdById: superAdminId,
          publishedAt: new Date(),
        },
      });
      log.debug('Created version', {
        templateKey: tmpl.templateKey,
        version: tmpl.version.version,
        versionId: version.id,
      });
    }

    // Set activeVersionId if not set
    if (!template.activeVersionId) {
      await prisma.notificationTemplate.update({
        where: { id: template.id },
        data: { activeVersionId: version.id },
      });
      log.debug('Set active version', { templateKey: tmpl.templateKey, versionId: version.id });
    }
  }

  log.info('Notification templates seeded successfully', { count: TEMPLATES.length });
}
