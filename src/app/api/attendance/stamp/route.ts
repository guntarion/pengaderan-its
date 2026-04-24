/**
 * src/app/api/attendance/stamp/route.ts
 * NAWASENA M08 — Maba QR scan attendance submission.
 *
 * POST /api/attendance/stamp
 *   - Validates QR HMAC signature
 *   - Idempotent via clientScanId
 *   - Detects walkin (no RSVP)
 *   - Roles: all authenticated (MABA primary)
 *
 * GET /api/attendance/stamp
 *   - Browser redirect target when Maba scans QR code with camera.
 *   - Redirects to PWA scan page with QR payload as query param.
 *   - Public (no auth required) — PWA handles auth on client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler, ApiResponse, validateBody } from '@/lib/api';
import { validateScan } from '@/lib/event-execution/services/qr.service';
import { attendanceStampSchema } from '@/lib/event-execution/schemas';
import { createLogger } from '@/lib/logger';

const log = createLogger('attendance:stamp');

/**
 * GET /api/attendance/stamp?sid=...&iid=...&exp=...&sig=...
 * Browser scan redirect — forward to PWA page with encoded payload.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const sid = url.searchParams.get('sid');
  const iid = url.searchParams.get('iid');
  const exp = url.searchParams.get('exp');
  const sig = url.searchParams.get('sig');

  if (!sid || !iid || !exp || !sig) {
    log.warn('QR redirect missing params');
    return NextResponse.redirect(new URL('/dashboard/attendance/scan?error=invalid_qr', req.url));
  }

  // Reconstruct the QR URL and forward to PWA
  const qrPayload = `${url.origin}/api/attendance/stamp?sid=${sid}&iid=${iid}&exp=${encodeURIComponent(exp)}&sig=${sig}`;
  const redirectUrl = new URL('/dashboard/attendance/scan', req.url);
  redirectUrl.searchParams.set('qr', encodeURIComponent(qrPayload));

  return NextResponse.redirect(redirectUrl);
}

/**
 * POST /api/attendance/stamp
 * JSON body: { qrPayload, clientScanId?, scanLocation?, scannedAt? }
 */
export const POST = createApiHandler({
  auth: true,
  handler: async (req, { user, log: ctxLog }) => {
    const body = await validateBody(req, attendanceStampSchema);

    ctxLog.info('Processing attendance stamp', { userId: user.id });

    const result = await validateScan(body, user.id, user.organizationId!);

    if (!result.ok) {
      const errorMessages: Record<string, string> = {
        INVALID_SIG: 'QR code tidak valid atau sudah dimodifikasi.',
        EXPIRED: 'QR code sudah kadaluarsa. Minta OC untuk generate baru.',
        SESSION_INACTIVE: 'Sesi QR sudah tidak aktif. Hubungi OC.',
        INSTANCE_NOT_RUNNING: 'Kegiatan belum dimulai atau sudah berakhir.',
      };

      return ApiResponse.success({
        ok: false,
        reason: result.reason,
        message: errorMessages[result.reason] ?? 'Gagal memproses scan.',
      });
    }

    return ApiResponse.success({
      ok: true,
      attendanceId: result.attendanceId,
      isDuplicate: result.isDuplicate,
      isWalkin: result.isWalkin,
      message: result.isDuplicate
        ? 'Kehadiran sudah tercatat sebelumnya.'
        : result.isWalkin
        ? 'Kehadiran berhasil dicatat (walkin).'
        : 'Kehadiran berhasil dicatat!',
    });
  },
});
