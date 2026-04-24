/**
 * src/app/api/passport/items/route.ts
 * NAWASENA M05 — GET: List passport items optionally filtered by dimensi.
 *
 * Also attaches the caller's current entry status per item.
 */

import { prisma } from '@/utils/prisma';
import { createApiHandler, ApiResponse } from '@/lib/api';
import { z } from 'zod';

const querySchema = z.object({
  dimensi: z.string().optional(),
  all: z.enum(['true', 'false']).optional(),
});

export const GET = createApiHandler({
  auth: true,
  handler: async (req, { user, log }) => {
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const { dimensi, all } = querySchema.parse(params);

    log.info('Fetching passport items', { userId: user.id, dimensi, all });

    const items = await prisma.passportItem.findMany({
      where: dimensi ? { dimensi: dimensi as never } : undefined,
      orderBy: [{ dimensi: 'asc' }, { ordinal: 'asc' }],
      select: {
        id: true,
        description: true,
        dimensi: true,
        evidenceType: true,
        targetWaktu: true,
        verifierRoleHint: true,
      },
    });

    // Normalize to consistent shape for frontend
    const normalized = items.map((item) => ({
      id: item.id,
      namaItem: item.description,
      dimensi: item.dimensi,
      evidenceType: item.evidenceType,
      keterangan: item.targetWaktu ?? null,
    }));

    // If fetching all (for QR generator dropdown), skip entry lookup
    if (all === 'true') {
      return ApiResponse.success(normalized);
    }

    // Attach caller's most recent entry per item
    const itemIds = items.map((i) => i.id);
    const entries = await prisma.passportEntry.findMany({
      where: {
        userId: user.id,
        itemId: { in: itemIds },
        status: { not: 'CANCELLED' },
      },
      orderBy: { submittedAt: 'desc' },
      select: { id: true, itemId: true, status: true },
    });

    // Latest entry per item (already sorted desc)
    const latestEntry = new Map<string, { id: string; status: string }>();
    for (const entry of entries) {
      if (!latestEntry.has(entry.itemId)) {
        latestEntry.set(entry.itemId, { id: entry.id, status: entry.status });
      }
    }

    const result = normalized.map((item) => {
      const entry = latestEntry.get(item.id);
      return {
        ...item,
        entryStatus: entry?.status ?? null,
        entryId: entry?.id ?? null,
      };
    });

    return ApiResponse.success(result);
  },
});
