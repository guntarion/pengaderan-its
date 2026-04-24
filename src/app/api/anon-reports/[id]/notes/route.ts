/**
 * src/app/api/anon-reports/[id]/notes/route.ts
 * POST /api/anon-reports/[id]/notes
 *
 * Add notes to a report:
 *   - internal: visible to BLM/Satgas/SUPERADMIN only (→ resolutionNotes)
 *   - public: visible to reporter in status tracker (→ publicNote, max 300 chars)
 *   - satgas: Satgas-only notes (→ satgasNotes, role check)
 *
 * MANDATORY: recordAnonAccess must be imported and called.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse, validateBody, validateParams, idParamSchema, NotFoundError, ForbiddenError } from '@/lib/api';
import { setAnonSessionVars } from '@/lib/anon-report/rls-helpers';
import { recordAnonAccess } from '@/lib/anon-report/access-log'; // MANDATORY — do not remove
import { addNoteSchema } from '@/lib/anon-report/schemas';
import { AnonAccessAction } from '@prisma/client';

export const POST = createApiHandler({
  roles: ['BLM', 'SATGAS_PPKPT', 'SUPERADMIN'],
  handler: async (req, { user, params, log }) => {
    const { id } = validateParams(params, idParamSchema);
    const body = await validateBody(req, addNoteSchema);

    // Satgas notes only allowed for Satgas/SUPERADMIN
    if (body.type === 'satgas' && !['SATGAS_PPKPT', 'SUPERADMIN'].includes(user.role)) {
      throw ForbiddenError('Hanya Satgas yang dapat menambahkan catatan Satgas.');
    }

    log.info('Adding note to anon report', { noteType: body.type, role: user.role });

    const result = await prisma.$transaction(async (tx) => {
      await setAnonSessionVars(tx, user);

      const existing = await tx.anonReport.findUnique({
        where: { id },
        select: { id: true, status: true, resolutionNotes: true },
      });

      if (!existing) throw NotFoundError('Laporan');

      const updateData: Record<string, unknown> = {};

      if (body.type === 'internal') {
        // Append to resolution notes
        const existingNotes = existing.resolutionNotes ?? '';
        const separator = existingNotes ? '\n\n---\n\n' : '';
        const timestamp = new Date().toISOString();
        updateData.resolutionNotes = `${existingNotes}${separator}[${timestamp}] ${user.role}: ${body.content}`;
      } else if (body.type === 'public') {
        updateData.publicNote = body.content.slice(0, 300);
      } else if (body.type === 'satgas') {
        updateData.satgasNotes = body.content;
      }

      const updated = await tx.anonReport.update({ where: { id }, data: updateData });

      // Determine audit action based on note type
      const action =
        body.type === 'public'
          ? AnonAccessAction.PUBLIC_NOTE_ADDED
          : AnonAccessAction.INTERNAL_NOTE_ADDED;

      await recordAnonAccess(tx, user, id, action, { noteType: body.type });

      return updated;
    });

    return ApiResponse.success(result);
  },
});
