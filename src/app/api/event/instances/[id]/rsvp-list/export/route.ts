/**
 * GET /api/event/instances/[id]/rsvp-list/export
 * CSV export of RSVP list. Roles: OC, SC.
 */

import { createApiHandler, validateParams, ForbiddenError } from '@/lib/api';
import { exportRSVPCSV } from '@/lib/event/services/rsvp.service';
import { z } from 'zod';
import { NextResponse } from 'next/server';

const paramsSchema = z.object({ id: z.string().min(1) });

export const GET = createApiHandler({
  auth: true,
  handler: async (_req, { user, params, log }) => {
    if (!['OC', 'SC', 'SUPERADMIN'].includes(user.role)) {
      throw ForbiddenError();
    }

    const { id: instanceId } = validateParams(params, paramsSchema);
    log.info('Exporting RSVP CSV', { instanceId, role: user.role });

    const csv = await exportRSVPCSV(instanceId);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="rsvp-${instanceId}.csv"`,
      },
    }) as never;
  },
});
