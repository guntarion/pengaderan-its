/**
 * prisma/seed/m14-notification-templates.ts
 * NAWASENA M14 — Seed 6 Triwulan Review notification templates.
 *
 * Idempotent: upsert by (templateKey + organizationId null).
 * All templates are global (organizationId=null, shared across all orgs).
 *
 * Templates:
 *   TRIWULAN_ESCALATION_URGENT          — CRITICAL to Pembina+SC+SUPERADMIN, IN_APP+EMAIL+PUSH
 *   TRIWULAN_SUBMITTED_WAITING_PEMBINA  — OPS to Pembina, IN_APP+EMAIL
 *   TRIWULAN_PEMBINA_SIGNED_WAITING_BLM — OPS to BLM, IN_APP+EMAIL
 *   TRIWULAN_FINALIZED                  — NORMAL to SC, IN_APP
 *   TRIWULAN_REVISION_REQUESTED         — OPS to SC, IN_APP+EMAIL
 *   TRIWULAN_PDF_EXPORT_FAILED          — CRITICAL to SC+SUPERADMIN, IN_APP+EMAIL
 */

import { PrismaClient, ChannelType, NotificationCategory, TemplateFormat } from '@prisma/client';
import { createLogger } from '../../src/lib/logger';

const log = createLogger('seed:m14-notification-templates');

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

const M14_TEMPLATES: TemplateDefinition[] = [
  {
    templateKey: 'TRIWULAN_ESCALATION_URGENT',
    description: 'CRITICAL alert — triwulan review has URGENT escalation flags (e.g. retention low, forbidden acts). Sent to Pembina, SC, and SUPERADMIN.',
    category: NotificationCategory.CRITICAL,
    supportedChannels: [ChannelType.IN_APP, ChannelType.EMAIL, ChannelType.PUSH],
    payloadSchema: {
      type: 'object',
      properties: {
        reviewId: { type: 'string' },
        cohortCode: { type: 'string' },
        quarterNumber: { type: 'number' },
        escalationFlags: { type: 'array', items: { type: 'string' } },
        reviewUrl: { type: 'string' },
      },
      required: ['reviewId', 'cohortCode', 'quarterNumber', 'escalationFlags'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'URGENT: Eskalasi Review Triwulan {{cohortCode}} Q{{quarterNumber}}',
          body: 'Review triwulan memiliki flag eskalasi URGENT. Tindakan segera diperlukan.',
        },
        email: {
          subject: '[URGENT] Eskalasi Review Triwulan {{cohortCode}} Q{{quarterNumber}} — Tindakan Diperlukan',
          reactComponent: 'src/emails/TriwulanEscalationUrgent',
          fallbackHtml: '<p><strong>URGENT</strong>: Review triwulan {{cohortCode}} Q{{quarterNumber}} memiliki flag eskalasi: {{escalationFlags}}. Segera tindak lanjuti.</p>',
        },
      },
    },
  },
  {
    templateKey: 'TRIWULAN_SUBMITTED_WAITING_PEMBINA',
    description: 'Notification to Pembina — SC has submitted triwulan review and it awaits Pembina signature.',
    category: NotificationCategory.OPS,
    supportedChannels: [ChannelType.IN_APP, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        reviewId: { type: 'string' },
        cohortCode: { type: 'string' },
        quarterNumber: { type: 'number' },
        submittedByName: { type: 'string' },
        reviewUrl: { type: 'string' },
      },
      required: ['reviewId', 'cohortCode', 'quarterNumber', 'submittedByName'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Review Triwulan Menunggu Tanda Tangan Pembina',
          body: 'Review {{cohortCode}} Q{{quarterNumber}} telah disubmit oleh SC. Silakan review dan tandatangani.',
        },
        email: {
          subject: 'Review Triwulan {{cohortCode}} Q{{quarterNumber}} Menunggu Tanda Tangan Pembina',
          reactComponent: 'src/emails/TriwulanSubmittedWaitingPembina',
          fallbackHtml: '<p>Review triwulan {{cohortCode}} Q{{quarterNumber}} telah disubmit oleh {{submittedByName}} dan menunggu tanda tangan Pembina.</p>',
        },
      },
    },
  },
  {
    templateKey: 'TRIWULAN_PEMBINA_SIGNED_WAITING_BLM',
    description: 'Notification to BLM — Pembina has signed triwulan review and it awaits BLM audit substansi acknowledgment.',
    category: NotificationCategory.OPS,
    supportedChannels: [ChannelType.IN_APP, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        reviewId: { type: 'string' },
        cohortCode: { type: 'string' },
        quarterNumber: { type: 'number' },
        pembinaName: { type: 'string' },
        reviewUrl: { type: 'string' },
      },
      required: ['reviewId', 'cohortCode', 'quarterNumber', 'pembinaName'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Review Triwulan Menunggu Audit Substansi BLM',
          body: 'Review {{cohortCode}} Q{{quarterNumber}} sudah ditandatangani Pembina. BLM perlu melakukan audit substansi.',
        },
        email: {
          subject: 'Review Triwulan {{cohortCode}} Q{{quarterNumber}} Menunggu Audit Substansi BLM',
          reactComponent: 'src/emails/TriwulanPembinaSignedWaitingBLM',
          fallbackHtml: '<p>Pembina {{pembinaName}} telah menandatangani review triwulan {{cohortCode}} Q{{quarterNumber}}. BLM perlu melakukan audit substansi dan acknowledging.</p>',
        },
      },
    },
  },
  {
    templateKey: 'TRIWULAN_FINALIZED',
    description: 'Notification to SC — triwulan review has been finalized (BLM acknowledged + PDF rendered).',
    category: NotificationCategory.NORMAL,
    supportedChannels: [ChannelType.IN_APP],
    payloadSchema: {
      type: 'object',
      properties: {
        reviewId: { type: 'string' },
        cohortCode: { type: 'string' },
        quarterNumber: { type: 'number' },
        pdfReady: { type: 'boolean' },
        reviewUrl: { type: 'string' },
      },
      required: ['reviewId', 'cohortCode', 'quarterNumber'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Review Triwulan Difinalisasi',
          body: 'Review {{cohortCode}} Q{{quarterNumber}} telah difinalisasi. PDF siap diunduh.',
        },
        email: {
          subject: 'Review Triwulan {{cohortCode}} Q{{quarterNumber}} Telah Difinalisasi',
          reactComponent: 'src/emails/TriwulanFinalized',
          fallbackHtml: '<p>Review triwulan {{cohortCode}} Q{{quarterNumber}} telah difinalisasi. PDF tersedia untuk diunduh.</p>',
        },
      },
    },
  },
  {
    templateKey: 'TRIWULAN_REVISION_REQUESTED',
    description: 'Notification to SC — Pembina or BLM has requested revision on the triwulan review.',
    category: NotificationCategory.OPS,
    supportedChannels: [ChannelType.IN_APP, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        reviewId: { type: 'string' },
        newReviewId: { type: 'string' },
        cohortCode: { type: 'string' },
        quarterNumber: { type: 'number' },
        requestedByName: { type: 'string' },
        requestedByRole: { type: 'string' },
        reason: { type: 'string' },
        reviewUrl: { type: 'string' },
      },
      required: ['reviewId', 'newReviewId', 'cohortCode', 'quarterNumber', 'requestedByName', 'requestedByRole'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Revisi Diminta untuk Review Triwulan {{cohortCode}} Q{{quarterNumber}}',
          body: '{{requestedByRole}} {{requestedByName}} meminta revisi. Draft baru telah dibuat.',
        },
        email: {
          subject: 'Revisi Diminta: Review Triwulan {{cohortCode}} Q{{quarterNumber}}',
          reactComponent: 'src/emails/TriwulanRevisionRequested',
          fallbackHtml: '<p>{{requestedByRole}} {{requestedByName}} meminta revisi untuk review triwulan {{cohortCode}} Q{{quarterNumber}}. Alasan: {{reason}}. Draft baru telah dibuat untuk Anda revisi.</p>',
        },
      },
    },
  },
  {
    templateKey: 'TRIWULAN_PDF_EXPORT_FAILED',
    description: 'Notification to SC and SUPERADMIN — PDF export for finalized triwulan review has failed after 3 retries.',
    category: NotificationCategory.CRITICAL,
    supportedChannels: [ChannelType.IN_APP, ChannelType.EMAIL],
    payloadSchema: {
      type: 'object',
      properties: {
        reviewId: { type: 'string' },
        cohortCode: { type: 'string' },
        quarterNumber: { type: 'number' },
        errorMessage: { type: 'string' },
        retryCount: { type: 'number' },
        reviewUrl: { type: 'string' },
      },
      required: ['reviewId', 'cohortCode', 'quarterNumber', 'retryCount'],
    },
    version: {
      version: '1.0.0',
      format: TemplateFormat.REACT_EMAIL,
      content: {
        push: {
          title: 'Gagal Ekspor PDF Review Triwulan {{cohortCode}} Q{{quarterNumber}}',
          body: 'Ekspor PDF gagal setelah {{retryCount}} percobaan. SUPERADMIN dapat mencoba ulang secara manual.',
        },
        email: {
          subject: '[GAGAL] Ekspor PDF Review Triwulan {{cohortCode}} Q{{quarterNumber}}',
          reactComponent: 'src/emails/TriwulanPDFExportFailed',
          fallbackHtml: '<p>Ekspor PDF untuk review triwulan {{cohortCode}} Q{{quarterNumber}} gagal setelah {{retryCount}} percobaan. Error: {{errorMessage}}. SUPERADMIN dapat mencoba ulang secara manual melalui dashboard.</p>',
        },
      },
    },
  },
];

export async function seedM14NotificationTemplates(
  prisma: PrismaClient,
  publishedById: string
): Promise<void> {
  log.info('Seeding M14 triwulan notification templates', { count: M14_TEMPLATES.length });

  for (const tmpl of M14_TEMPLATES) {
    // organizationId null = global template; Prisma unique constraint uses null
    const template = await prisma.notificationTemplate.upsert({
      where: {
        organizationId_templateKey: {
          organizationId: null as unknown as string,
          templateKey: tmpl.templateKey,
        },
      },
      create: {
        organizationId: null,
        templateKey: tmpl.templateKey,
        description: tmpl.description,
        category: tmpl.category,
        supportedChannels: tmpl.supportedChannels,
        payloadSchema: tmpl.payloadSchema,
      },
      update: {
        description: tmpl.description,
        category: tmpl.category,
        supportedChannels: tmpl.supportedChannels,
        payloadSchema: tmpl.payloadSchema,
      },
    });

    // Upsert version (createdById is the field, not publishedById)
    const version = await prisma.notificationTemplateVersion.upsert({
      where: {
        templateId_version: {
          templateId: template.id,
          version: tmpl.version.version,
        },
      },
      create: {
        templateId: template.id,
        version: tmpl.version.version,
        format: tmpl.version.format,
        content: tmpl.version.content,
        createdById: publishedById,
        publishedAt: new Date(),
      },
      update: {
        content: tmpl.version.content,
      },
    });

    // Set activeVersionId on template
    await prisma.notificationTemplate.update({
      where: { id: template.id },
      data: { activeVersionId: version.id },
    });

    log.info('Upserted M14 notification template', { templateKey: tmpl.templateKey });
  }

  log.info('M14 notification templates seed complete', { count: M14_TEMPLATES.length });
}
