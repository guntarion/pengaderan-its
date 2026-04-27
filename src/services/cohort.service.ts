/**
 * src/services/cohort.service.ts
 * CohortService — settings update with Zod validation + audit.
 * Phase RV-B — M01 Revisi Multi-HMJ
 */

import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { logAudit } from '@/lib/audit/audit-helpers';
import { AuditAction } from '@prisma/client';
import { z } from 'zod';

const log = createLogger('cohort-service');

// ---- Settings schema (14-model-data §3.1) ----

const faseDurasiSchema = z.object({
  phase: z.enum(['F0', 'F1', 'F2', 'F3', 'F4']),
  startDate: z.string().datetime({ message: 'Format tanggal fase tidak valid. Gunakan ISO 8601.' }),
  endDate: z.string().datetime({ message: 'Format tanggal fase tidak valid. Gunakan ISO 8601.' }),
});

export const cohortSettingsSchema = z.object({
  /**
   * Durasi 5 fase (F0–F4). Optional — partial updates allowed.
   */
  fasePhases: z.array(faseDurasiSchema).optional(),

  /**
   * Plafon biaya (Rupiah)
   */
  plafonBiaya: z
    .object({
      iuranKas: z.number().int().min(0, 'Plafon iuran kas tidak boleh negatif').optional(),
      logistik: z.number().int().min(0, 'Plafon logistik tidak boleh negatif').optional(),
    })
    .optional(),

  /**
   * Custom operational flags
   */
  flags: z
    .object({
      allowOnlinePakta: z.boolean().optional(),
      requireFotoMabaResmi: z.boolean().optional(),
      enableTimeCapsule: z.boolean().optional(),
    })
    .optional(),

  /**
   * Free-form extension for future use
   */
  custom: z.record(z.unknown()).optional(),
});

export type CohortSettings = z.infer<typeof cohortSettingsSchema>;

// ---- Service functions ----

/**
 * Update Cohort.settings — validates via cohortSettingsSchema and persists.
 * Audit-logged with before/after snapshot.
 *
 * @param cohortId    - ID of the cohort to update
 * @param settings    - Partial or full settings object
 * @param actorUserId - SC/SUPERADMIN performing the update
 */
export async function updateSettings(
  cohortId: string,
  settings: CohortSettings,
  actorUserId: string,
): Promise<{ id: string; settings: unknown }> {
  // Parse & validate
  const parsed = cohortSettingsSchema.safeParse(settings);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    throw new Error(
      `COHORT_SETTINGS_INVALID:${firstIssue?.path.join('.') ?? 'unknown'}:${firstIssue?.message ?? 'Validation failed'}`,
    );
  }

  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    select: { id: true, organizationId: true, code: true, settings: true },
  });

  if (!cohort) {
    throw new Error('COHORT_NOT_FOUND');
  }

  log.info('Updating cohort settings', {
    cohortId,
    code: cohort.code,
    orgId: cohort.organizationId,
    actorUserId,
  });

  const updated = await prisma.cohort.update({
    where: { id: cohortId },
    data: { settings: JSON.parse(JSON.stringify(parsed.data)) },
    select: { id: true, settings: true },
  });

  await logAudit({
    action: AuditAction.COHORT_UPDATE,
    organizationId: cohort.organizationId,
    actorUserId,
    entityType: 'Cohort',
    entityId: cohortId,
    beforeValue: cohort.settings,
    afterValue: JSON.parse(JSON.stringify(parsed.data)),
    metadata: { settingsUpdate: true },
  });

  log.info('Cohort settings updated', { cohortId });
  return updated;
}

/**
 * Get cohort settings for a given cohort.
 * Returns the raw settings JSON (null if not set).
 */
export async function getSettings(cohortId: string): Promise<CohortSettings | null> {
  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    select: { settings: true },
  });

  if (!cohort) return null;

  const raw = cohort.settings;
  if (!raw || typeof raw !== 'object') return null;

  const parsed = cohortSettingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
