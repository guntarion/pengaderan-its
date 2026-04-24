/**
 * POST /api/admin/users/bulk-import/preview
 * Accept a multipart CSV upload, parse + validate, store in Redis, return dry-run summary.
 *
 * Roles: SC, SUPERADMIN
 * Body: multipart/form-data with field "file" (CSV)
 *
 * Response: { token, summary, sample, headerErrors }
 */

import { createApiHandler, ApiResponse } from '@/lib/api';
import { BadRequestError } from '@/lib/api/errors';
import { prisma } from '@/utils/prisma';
import { parseCsv, CSV_MAX_SIZE_BYTES } from '@/lib/bulk-import/csv-parser';
import { storePreview } from '@/lib/bulk-import/preview-cache';
import type { CachedPreview } from '@/lib/bulk-import/preview-cache';
import type { ValidatedRow } from '@/lib/bulk-import/csv-schema';
import crypto from 'crypto';
import { randomUUID } from 'crypto';

// How many sample rows to return (first N valid + first N error)
const SAMPLE_SIZE = 5;

export const POST = createApiHandler({
  roles: ['SC', 'SUPERADMIN'],
  handler: async (req, { user, log }) => {
    // 1. Parse multipart form
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      throw BadRequestError('Request harus berformat multipart/form-data');
    }

    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      throw BadRequestError('Field "file" tidak ditemukan atau bukan file');
    }

    // 2. Validate file type + size
    const fileName = file.name ?? '';
    if (!fileName.toLowerCase().endsWith('.csv')) {
      throw BadRequestError('File harus berformat CSV (.csv)');
    }
    if (file.size > CSV_MAX_SIZE_BYTES) {
      throw BadRequestError(
        `Ukuran file melebihi batas 2 MB (ukuran saat ini: ${(file.size / 1024 / 1024).toFixed(2)} MB)`
      );
    }

    // 3. Read file content + compute SHA-256
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    log.info('Processing bulk import CSV', {
      fileName,
      sizeBytes: file.size,
      fileHash: fileHash.slice(0, 16) + '...',
    });

    // 4. Parse + validate CSV
    const parseResult = parseCsv(buffer);

    // If header errors, return immediately
    if (parseResult.headerErrors.length > 0) {
      return ApiResponse.success({
        token: null,
        summary: null,
        sample: null,
        headerErrors: parseResult.headerErrors,
      });
    }

    // 5. Resolve cohort codes → cohort IDs within this organization
    const orgId = user.organizationId ?? '';
    const allCohortCodes = [
      ...new Set(parseResult.validRows.map((r) => r.data!.cohortCode)),
    ];

    const cohorts = await prisma.cohort.findMany({
      where: {
        organizationId: orgId,
        code: { in: allCohortCodes },
      },
      select: { id: true, code: true },
    });

    const cohortMap: Record<string, string> = {};
    for (const c of cohorts) {
      cohortMap[c.code] = c.id;
    }

    // Identify rows with unknown cohort code → move to error
    const unknownCohortCodes = allCohortCodes.filter((code) => !cohortMap[code]);
    const validRows: ValidatedRow[] = [];
    const extraErrors: ValidatedRow[] = [];

    for (const row of parseResult.validRows) {
      if (!cohortMap[row.data!.cohortCode]) {
        extraErrors.push({
          ...row,
          isValid: false,
          errors: [
            `Kode cohort "${row.data!.cohortCode}" tidak ditemukan di organisasi ini`,
          ],
        });
      } else {
        validRows.push(row);
      }
    }

    const allErrorRows = [...parseResult.errorRows, ...extraErrors];

    // 6. Check which emails already exist in the organization
    const validEmails = validRows.map((r) => r.data!.email);
    const existingUsers = await prisma.user.findMany({
      where: {
        organizationId: orgId,
        email: { in: validEmails },
      },
      select: { email: true, id: true },
    });
    const existingEmailSet = new Set(existingUsers.map((u) => u.email));

    // 7. Build summary
    const existingCount = validRows.filter((r) =>
      existingEmailSet.has(r.data!.email)
    ).length;

    const summary = {
      totalRows: parseResult.totalRows,
      validRows: validRows.length,
      errorRows: allErrorRows.length,
      existingUsers: existingCount,
      newUsers: validRows.length - existingCount,
      unknownCohortCodes,
    };

    // 8. Build sample (first SAMPLE_SIZE valid + first SAMPLE_SIZE error)
    const sampleValid = validRows.slice(0, SAMPLE_SIZE).map((r) => ({
      lineNumber: r.lineNumber,
      data: r.data,
      isExisting: existingEmailSet.has(r.data!.email),
    }));
    const sampleErrors = allErrorRows.slice(0, SAMPLE_SIZE).map((r) => ({
      lineNumber: r.lineNumber,
      raw: r.raw,
      errors: r.errors,
    }));

    // 9. Store preview in cache (only if there are valid rows to commit)
    let token: string | null = null;
    if (validRows.length > 0) {
      token = randomUUID();
      const cached: CachedPreview = {
        organizationId: orgId,
        actorUserId: user.id,
        fileHash,
        parseResult: {
          ...parseResult,
          validRows,
          errorRows: allErrorRows,
        },
        cohortIds: cohortMap,
        createdAt: new Date().toISOString(),
      };
      await storePreview(token, cached);
    }

    log.info('Bulk import preview complete', {
      ...summary,
      token: token ? token.slice(0, 8) + '...' : null,
    });

    return ApiResponse.success({
      token,
      summary,
      sample: {
        valid: sampleValid,
        errors: sampleErrors,
      },
      headerErrors: [],
    });
  },
});
