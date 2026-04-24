/**
 * prisma/seed/m10-safeguard.ts
 * NAWASENA M10 — Seed M10 Safeguard notification templates, rules, and sample incidents.
 *
 * Idempotent: upsert by unique key.
 * Dev-only: sample incidents with timeline entries.
 */

import {
  PrismaClient,
  ChannelType,
  NotificationCategory,
  TemplateFormat,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  TimelineAction,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { createLogger } from '../../src/lib/logger';

const log = createLogger('seed:m10-safeguard');

// ============================================
// M10 Notification Templates
// ============================================

const M10_TEMPLATES = [
  {
    templateKey: 'SAFEGUARD_RED_ALERT',
    description: 'Alert KRITIS untuk SC + Safeguard Officer ketika insiden RED dilaporkan',
    category: NotificationCategory.CRITICAL,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        incidentId: { type: 'string' },
        incidentType: { type: 'string' },
        reporterName: { type: 'string' },
        affectedMabaName: { type: 'string' },
        dashboardUrl: { type: 'string' },
      },
      required: ['incidentId', 'incidentType'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: '🚨 INSIDEN RED — Tindakan Segera Diperlukan',
          body: 'Insiden tingkat RED dilaporkan. Buka dashboard untuk menangani.',
        },
        email: {
          subject: '[KRITIS] Insiden RED Dilaporkan — Tindakan Segera',
          reactComponent: 'src/services/notification-templates/SAFEGUARD_RED_ALERT.tsx',
          fallbackHtml: '<p>Insiden RED dilaporkan. Segera buka dashboard safeguard.</p>',
        },
      },
    },
  },
  {
    templateKey: 'SAFEGUARD_YELLOW_ALERT',
    description: 'Notifikasi untuk SC ketika insiden YELLOW dilaporkan',
    category: NotificationCategory.NORMAL,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        incidentId: { type: 'string' },
        incidentType: { type: 'string' },
        reporterName: { type: 'string' },
        dashboardUrl: { type: 'string' },
      },
      required: ['incidentId', 'incidentType'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: '⚠️ Insiden YELLOW Dilaporkan',
          body: 'Ada insiden yang perlu di-review dalam 24 jam.',
        },
        email: {
          subject: '[Follow-up] Insiden YELLOW — Review dalam 24 Jam',
          reactComponent: 'src/services/notification-templates/SAFEGUARD_YELLOW_ALERT.tsx',
          fallbackHtml: '<p>Insiden YELLOW dilaporkan. Harap review dalam 24 jam.</p>',
        },
      },
    },
  },
  {
    templateKey: 'SAFEGUARD_DRAFT_PENDING_REVIEW',
    description: 'Notifikasi SC bahwa ada draft insiden dari M09 cascade yang perlu elaborasi',
    category: NotificationCategory.NORMAL,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        incidentId: { type: 'string' },
        kpLogDailyId: { type: 'string' },
        dashboardUrl: { type: 'string' },
      },
      required: ['incidentId'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Draft Insiden Perlu Review',
          body: 'Red flag dari logbook KP memerlukan elaborasi oleh SC.',
        },
        email: {
          subject: 'Draft Insiden dari Logbook KP — Perlu Review',
          reactComponent: 'src/services/notification-templates/SAFEGUARD_DRAFT_PENDING_REVIEW.tsx',
          fallbackHtml: '<p>Ada draft insiden dari logbook KP yang perlu di-review.</p>',
        },
      },
    },
  },
  {
    templateKey: 'CONSEQUENCE_ASSIGNED_MABA',
    description: 'Notifikasi ke Maba bahwa konsekuensi pedagogis telah di-assign',
    category: NotificationCategory.NORMAL,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        consequenceType: { type: 'string' },
        deadline: { type: 'string' },
        konsekuensiUrl: { type: 'string' },
      },
      required: ['consequenceType'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Konsekuensi Pedagogis Di-assign',
          body: 'Kamu memiliki konsekuensi baru. Cek detail di dashboard.',
        },
        email: {
          subject: 'Konsekuensi Pedagogis: Perlu Tindakan Kamu',
          reactComponent: 'src/services/notification-templates/CONSEQUENCE_ASSIGNED_MABA.tsx',
          fallbackHtml: '<p>Konsekuensi pedagogis telah di-assign. Buka dashboard untuk detail.</p>',
        },
      },
    },
  },
  {
    templateKey: 'CONSEQUENCE_DEADLINE_H1',
    description: 'Pengingat H-1 sebelum deadline konsekuensi',
    category: NotificationCategory.FORM_REMINDER,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        consequenceType: { type: 'string' },
        deadline: { type: 'string' },
        konsekuensiUrl: { type: 'string' },
      },
      required: ['consequenceType', 'deadline'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: '⏰ Deadline Konsekuensi Besok',
          body: 'Konsekuensimu harus diselesaikan besok. Jangan lupa!',
        },
        email: {
          subject: 'Pengingat: Deadline Konsekuensi H-1',
          reactComponent: 'src/services/notification-templates/CONSEQUENCE_DEADLINE_H1.tsx',
          fallbackHtml: '<p>Deadline konsekuensimu adalah besok. Segera selesaikan.</p>',
        },
      },
    },
  },
  {
    templateKey: 'CONSEQUENCE_DEADLINE_H0',
    description: 'Notifikasi hari-H deadline konsekuensi (overdue warning)',
    category: NotificationCategory.FORM_REMINDER,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        consequenceType: { type: 'string' },
        konsekuensiUrl: { type: 'string' },
      },
      required: ['consequenceType'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: '🚨 Hari Ini Deadline Konsekuensi',
          body: 'Konsekuensimu jatuh tempo hari ini. Selesaikan sekarang.',
        },
        email: {
          subject: '[Terakhir] Deadline Konsekuensi Hari Ini',
          reactComponent: 'src/services/notification-templates/CONSEQUENCE_DEADLINE_H0.tsx',
          fallbackHtml: '<p>Ini adalah hari terakhir untuk menyelesaikan konsekuensimu.</p>',
        },
      },
    },
  },
  {
    templateKey: 'CONSEQUENCE_COMPLETED_SC',
    description: 'Notifikasi ke SC bahwa Maba telah submit penyelesaian konsekuensi',
    category: NotificationCategory.NORMAL,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        mabaNama: { type: 'string' },
        consequenceType: { type: 'string' },
        reviewUrl: { type: 'string' },
      },
      required: ['mabaNama', 'consequenceType'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Konsekuensi Perlu Review',
          body: 'Maba telah submit penyelesaian konsekuensi. Harap review.',
        },
        email: {
          subject: 'Review Diperlukan: Maba Submit Penyelesaian Konsekuensi',
          reactComponent: 'src/services/notification-templates/CONSEQUENCE_COMPLETED_SC.tsx',
          fallbackHtml: '<p>Maba telah submit penyelesaian. Harap review dan approve/reject.</p>',
        },
      },
    },
  },
  {
    templateKey: 'INCIDENT_ESCALATED_PEMBINA',
    description: 'Notifikasi ke Pembina bahwa insiden di-eskalasi ke Satgas',
    category: NotificationCategory.NORMAL,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        incidentId: { type: 'string' },
        escalationReason: { type: 'string' },
        pdfUrl: { type: 'string' },
        dashboardUrl: { type: 'string' },
      },
      required: ['incidentId'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Insiden Di-eskalasi ke Satgas',
          body: 'SC telah mengekskalasi insiden ke Satgas PPKPT ITS.',
        },
        email: {
          subject: 'Insiden Diekskalasi ke Satgas PPKPT ITS',
          reactComponent: 'src/services/notification-templates/INCIDENT_ESCALATED_PEMBINA.tsx',
          fallbackHtml: '<p>Insiden telah diekskalasi ke Satgas PPKPT ITS.</p>',
        },
      },
    },
  },
  {
    templateKey: 'INCIDENT_RESOLVED_REPORTER',
    description: 'Notifikasi ke reporter bahwa insiden yang dilaporkan telah diselesaikan',
    category: NotificationCategory.NORMAL,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        incidentId: { type: 'string' },
        dashboardUrl: { type: 'string' },
      },
      required: ['incidentId'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Insiden Kamu Telah Diselesaikan',
          body: 'SC telah menyelesaikan insiden yang kamu laporkan.',
        },
        email: {
          subject: 'Update: Insiden yang Kamu Laporkan Telah Diselesaikan',
          reactComponent: 'src/services/notification-templates/INCIDENT_RESOLVED_REPORTER.tsx',
          fallbackHtml: '<p>Insiden yang kamu laporkan telah diselesaikan oleh SC.</p>',
        },
      },
    },
  },
  {
    templateKey: 'INCIDENT_RETRACTED_SC',
    description: 'Notifikasi ke SC bahwa insiden di-retract oleh reporter',
    category: NotificationCategory.NORMAL,
    supportedChannels: [ChannelType.PUSH, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        incidentId: { type: 'string' },
        retractionReason: { type: 'string' },
        dashboardUrl: { type: 'string' },
      },
      required: ['incidentId'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Insiden Di-retract oleh Reporter',
          body: 'Reporter telah menarik laporan insiden dalam window 30 menit.',
        },
        email: {
          subject: 'Info: Insiden Di-retract oleh Reporter',
          reactComponent: 'src/services/notification-templates/INCIDENT_RETRACTED_SC.tsx',
          fallbackHtml: '<p>Reporter menarik laporan insiden dalam window 30 menit.</p>',
        },
      },
    },
  },
];

// ============================================
// M10 Notification Rules
// ============================================

const M10_RULES = [
  {
    name: 'Pengingat Deadline Konsekuensi H-1',
    description: 'Scan harian 09:00 untuk konsekuensi yang deadline-nya besok, kirim reminder ke Maba',
    templateKey: 'CONSEQUENCE_DEADLINE_H1',
    category: NotificationCategory.FORM_REMINDER,
    channels: [ChannelType.PUSH, ChannelType.EMAIL] as ChannelType[],
    cronExpression: '0 9 * * *',
    audienceResolverKey: 'consequence-deadline-h1',
    active: true,
    maxRemindersPerWeek: 1,
  },
  {
    name: 'Notifikasi Overdue Konsekuensi H-0',
    description: 'Scan malam 21:00 untuk konsekuensi yang overdue hari ini',
    templateKey: 'CONSEQUENCE_DEADLINE_H0',
    category: NotificationCategory.FORM_REMINDER,
    channels: [ChannelType.PUSH, ChannelType.EMAIL] as ChannelType[],
    cronExpression: '0 21 * * *',
    audienceResolverKey: 'consequence-overdue-h0',
    active: true,
    maxRemindersPerWeek: 1,
  },
  {
    name: 'Alert Insiden IN_REVIEW Overdue 7 Hari',
    description: 'Scan pagi 08:00 untuk insiden IN_REVIEW lebih dari 7 hari tanpa resolusi',
    templateKey: 'SAFEGUARD_YELLOW_ALERT',
    category: NotificationCategory.NORMAL,
    channels: [ChannelType.PUSH, ChannelType.EMAIL] as ChannelType[],
    cronExpression: '0 8 * * *',
    audienceResolverKey: 'incident-in-review-overdue',
    active: true,
    maxRemindersPerWeek: 3,
  },
];

export async function seedM10SafeguardData(
  prisma: PrismaClient,
  creatorId: string,
) {
  log.info('Seeding M10 Safeguard notification templates...');

  // ---- Seed notification templates ----
  for (const tmpl of M10_TEMPLATES) {
    // Find or create template
    const existing = await prisma.notificationTemplate.findFirst({
      where: { templateKey: tmpl.templateKey, organizationId: null },
    });

    if (!existing) {
      const template = await prisma.notificationTemplate.create({
        data: {
          templateKey: tmpl.templateKey,
          description: tmpl.description,
          organizationId: null,
          category: tmpl.category,
          supportedChannels: tmpl.supportedChannels,
          payloadSchema: tmpl.payloadSchema,
        },
      });

      // Create version 1.0.0 and set as active
      const version = await prisma.notificationTemplateVersion.create({
        data: {
          templateId: template.id,
          version: tmpl.version.version,
          format: tmpl.version.format,
          content: tmpl.version.content,
          publishedAt: new Date(),
          createdById: creatorId,
        },
      });

      // Set active version
      await prisma.notificationTemplate.update({
        where: { id: template.id },
        data: { activeVersionId: version.id },
      });

      log.info('Template created', { templateKey: tmpl.templateKey });
    } else {
      log.info('Template already exists, skipping', { templateKey: tmpl.templateKey });
    }
  }

  // ---- Seed notification rules ----
  log.info('Seeding M10 notification rules...');

  for (const rule of M10_RULES) {
    const existing = await prisma.notificationRule.findFirst({
      where: { name: rule.name, organizationId: null },
    });

    if (!existing) {
      await prisma.notificationRule.create({
        data: {
          organizationId: null,
          isGlobal: true,
          name: rule.name,
          description: rule.description,
          templateKey: rule.templateKey,
          category: rule.category,
          channels: rule.channels,
          cronExpression: rule.cronExpression,
          audienceResolverKey: rule.audienceResolverKey,
          active: rule.active,
          maxRemindersPerWeek: rule.maxRemindersPerWeek,
          createdById: creatorId,
        },
      });

      log.info('Rule created', { name: rule.name });
    } else {
      log.info('Rule already exists, skipping', { name: rule.name });
    }
  }

  log.info('M10 notification templates and rules seeded successfully');
}

// ============================================
// Sample Incident Data (dev only)
// ============================================

export async function seedM10SampleData(prisma: PrismaClient) {
  log.info('Seeding M10 sample incidents...');

  // Find org + cohort
  const org = await prisma.organization.findFirst({ where: { code: 'HMTC' } });
  if (!org) {
    log.warn('HMTC org not found — skipping M10 sample data');
    return;
  }

  const cohort = await prisma.cohort.findFirst({
    where: { organizationId: org.id, code: 'C26' },
  });
  if (!cohort) {
    log.warn('Cohort C26 not found — skipping M10 sample data');
    return;
  }

  // Find or create Safeguard Officer (set isSafeguardOfficer on SUPERADMIN)
  const scUser = await prisma.user.findFirst({
    where: { organizationId: org.id, role: UserRole.SC },
  });

  const reporterUser = await prisma.user.findFirst({
    where: { organizationId: org.id, role: UserRole.KP },
  });

  // Use SUPERADMIN as fallback reporter/SC if no KP/SC found
  const reporter = reporterUser ?? await prisma.user.findFirst({
    where: { organizationId: org.id, role: UserRole.SUPERADMIN },
  });

  if (!reporter) {
    log.warn('No reporter user found — skipping M10 sample incidents');
    return;
  }

  // Set isSafeguardOfficer on SC user (or SUPERADMIN)
  const safeguardOfficer = scUser ?? reporter;
  await prisma.user.update({
    where: { id: safeguardOfficer.id },
    data: { isSafeguardOfficer: true },
  });

  log.info('Safeguard Officer set', { userId: safeguardOfficer.id });

  // Sample Incident 1: RED severity (SAFE_WORD)
  const existingRed = await prisma.safeguardIncident.findFirst({
    where: {
      organizationId: org.id,
      notes: { path: ['source'], equals: 'SAMPLE_SEED' },
      type: IncidentType.SAFE_WORD,
    },
  });

  if (!existingRed) {
    const redIncident = await prisma.safeguardIncident.create({
      data: {
        organizationId: org.id,
        cohortId: cohort.id,
        type: IncidentType.SAFE_WORD,
        severity: IncidentSeverity.RED,
        status: IncidentStatus.OPEN,
        occurredAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        reportedById: reporter.id,
        additionalAffectedUserIds: [],
        attachmentKeys: [],
        notes: {
          source: 'SAMPLE_SEED',
          description: '[DEV SEED] Sampel insiden RED untuk testing UI',
        },
      },
    });

    await prisma.incidentTimelineEntry.create({
      data: {
        organizationId: org.id,
        incidentId: redIncident.id,
        actorId: reporter.id,
        action: TimelineAction.CREATED,
        newValue: { type: 'SAFE_WORD', severity: 'RED', status: 'OPEN' },
        noteText: '[DEV SEED] Insiden RED dibuat via seed script',
        ipAddress: '127.0.0.1',
      },
    });

    log.info('Sample RED incident created', { id: redIncident.id });
  } else {
    log.info('Sample RED incident already exists, skipping');
  }

  // Sample Incident 2: YELLOW severity (MEDICAL)
  const existingYellow = await prisma.safeguardIncident.findFirst({
    where: {
      organizationId: org.id,
      notes: { path: ['source'], equals: 'SAMPLE_SEED' },
      type: IncidentType.MEDICAL,
    },
  });

  if (!existingYellow) {
    const yellowIncident = await prisma.safeguardIncident.create({
      data: {
        organizationId: org.id,
        cohortId: cohort.id,
        type: IncidentType.MEDICAL,
        severity: IncidentSeverity.YELLOW,
        status: IncidentStatus.IN_REVIEW,
        occurredAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
        reportedById: reporter.id,
        claimedById: safeguardOfficer.id,
        claimedAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
        actionTaken: 'Maba diantar ke klinik kampus. Kondisi sudah stabil.',
        additionalAffectedUserIds: [],
        attachmentKeys: [],
        notes: {
          source: 'SAMPLE_SEED',
          description: '[DEV SEED] Sampel insiden YELLOW untuk testing UI',
        },
      },
    });

    await prisma.incidentTimelineEntry.createMany({
      data: [
        {
          organizationId: org.id,
          incidentId: yellowIncident.id,
          actorId: reporter.id,
          action: TimelineAction.CREATED,
          newValue: { type: 'MEDICAL', severity: 'YELLOW', status: 'OPEN' },
          noteText: '[DEV SEED] Insiden YELLOW dibuat',
          ipAddress: '127.0.0.1',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
        {
          organizationId: org.id,
          incidentId: yellowIncident.id,
          actorId: safeguardOfficer.id,
          action: TimelineAction.CLAIMED_FOR_REVIEW,
          oldValue: { status: 'OPEN' },
          newValue: { status: 'IN_REVIEW' },
          ipAddress: '127.0.0.1',
          createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
        },
      ],
    });

    log.info('Sample YELLOW incident created', { id: yellowIncident.id });
  } else {
    log.info('Sample YELLOW incident already exists, skipping');
  }

  log.info('M10 sample data seeded successfully');
}
