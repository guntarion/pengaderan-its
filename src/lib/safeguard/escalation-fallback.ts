/**
 * src/lib/safeguard/escalation-fallback.ts
 * NAWASENA M10 — Escalation fallback dispatch when M15 is degraded or disabled.
 *
 * When M15 (notification system) times out or the feature flag is off,
 * this module dispatches direct email via nodemailer and web-push via
 * the VAPID-configured push channel — both gracefully skipped if unconfigured.
 *
 * Inserts a SafeguardEscalationFallback row for each receiver per channel.
 */

import { createLogger } from '@/lib/logger';
import { prisma } from '@/utils/prisma';
import nodemailer from 'nodemailer';
import type { IncidentSeverity } from '@prisma/client';
import type { ReceiverUser } from './receivers';

const log = createLogger('safeguard:escalation-fallback');

// ---- Nodemailer transporter (lazy singleton) ----

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (_transporter) return _transporter;

  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT ?? 587);
  const user = process.env.EMAIL_USERNAME;
  const pass = process.env.EMAIL_PASSWORD;

  if (!host || !user || !pass) {
    log.warn('Email not configured — skipping email fallback (missing EMAIL_HOST/USERNAME/PASSWORD)');
    return null;
  }

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return _transporter;
}

// ---- Web-push lazy init ----

let _webpushInitialized = false;

async function getWebPush(): Promise<typeof import('web-push') | null> {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    log.debug('VAPID not configured — skipping web-push fallback');
    return null;
  }

  const webpush = await import('web-push');

  if (!_webpushInitialized) {
    webpush.default.setVapidDetails(subject, publicKey, privateKey);
    _webpushInitialized = true;
    log.debug('VAPID initialized for fallback');
  }

  return webpush.default as unknown as typeof import('web-push');
}

// ---- Email fallback ----

async function sendFallbackEmail(
  receiver: ReceiverUser,
  incidentId: string,
  severity: IncidentSeverity,
  payload: Record<string, unknown>,
): Promise<{ status: 'SENT' | 'FAILED'; errorMessage?: string }> {
  const transporter = getTransporter();
  if (!transporter) {
    return { status: 'FAILED', errorMessage: 'Email not configured' };
  }

  const from = process.env.EMAIL_FROM ?? process.env.EMAIL_USERNAME ?? 'noreply@nawasena.its.ac.id';
  const appUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

  const severityLabel = severity === 'RED' ? '🔴 KRITIS' : severity === 'YELLOW' ? '🟡 Perlu Perhatian' : '🟢 Observasi';
  const incidentUrl = `${appUrl}/dashboard/safeguard/incidents/${incidentId}`;

  const subject = `[NAWASENA SAFEGUARD] ${severityLabel} — Insiden ${incidentId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #dc2626;">Laporan Safeguard — ${severityLabel}</h2>
      <p>Halo ${receiver.fullName},</p>
      <p>Telah terjadi insiden safeguard yang memerlukan perhatian segera.</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr>
          <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Incident ID</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${incidentId}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Severity</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${severityLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Tipe</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${payload.incidentType ?? '-'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Reporter</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${payload.reporterName ?? '-'}</td>
        </tr>
      </table>
      <p>
        <a href="${incidentUrl}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Lihat Detail Insiden
        </a>
      </p>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;" />
      <p style="font-size: 12px; color: #64748b;">
        Email ini dikirim secara otomatis oleh sistem NAWASENA Safeguard.
        Notifikasi ini merupakan fallback karena sistem notifikasi utama sedang tidak tersedia.
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({ from, to: receiver.email, subject, html });
    log.info('Fallback email sent', { receiverId: receiver.id, incidentId });
    return { status: 'SENT' };
  } catch (err) {
    const errorMessage = (err as Error).message;
    log.error('Fallback email failed', { receiverId: receiver.id, incidentId, error: err });
    return { status: 'FAILED', errorMessage };
  }
}

// ---- Web-push fallback ----

async function sendFallbackWebPush(
  receiver: ReceiverUser,
  incidentId: string,
  severity: IncidentSeverity,
  payload: Record<string, unknown>,
): Promise<{ status: 'SENT' | 'FAILED' | 'SKIPPED'; errorMessage?: string }> {
  const webpush = await getWebPush();
  if (!webpush) {
    return { status: 'SKIPPED', errorMessage: 'VAPID not configured' };
  }

  // Fetch active subscriptions for this user
  const subscriptions = await prisma.notificationSubscription.findMany({
    where: { userId: receiver.id, status: 'ACTIVE' },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  if (subscriptions.length === 0) {
    return { status: 'SKIPPED', errorMessage: 'No active push subscriptions' };
  }

  const appUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const title = severity === 'RED' ? '🔴 SAFEGUARD KRITIS' : '🟡 Safeguard Alert';
  const body = `Insiden ${payload.incidentType ?? 'baru'} dilaporkan oleh ${payload.reporterName ?? 'panitia'}`;
  const url = `${appUrl}/dashboard/safeguard/incidents/${incidentId}`;

  const pushPayload = JSON.stringify({
    title,
    body,
    icon: '/icon-192x192.png',
    badge: '/badge-96x96.png',
    data: { url, incidentId, severity },
    tag: `safeguard-${incidentId}`,
    renotify: true,
  });

  let sentCount = 0;
  const errors: string[] = [];

  for (const sub of subscriptions) {
    try {
      await (webpush as unknown as { sendNotification: (subscription: unknown, payload: string) => Promise<unknown> }).sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        pushPayload,
      );
      sentCount++;

      // Update lastUsedAt
      await prisma.notificationSubscription.update({
        where: { id: sub.id },
        data: { lastUsedAt: new Date() },
      }).catch(() => {});
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 410) {
        // Expired — mark EXPIRED
        await prisma.notificationSubscription.update({
          where: { id: sub.id },
          data: { status: 'EXPIRED', lastErrorAt: new Date() },
        }).catch(() => {});
      } else {
        errors.push(`subscription ${sub.id}: ${(err as Error).message}`);
        log.warn('Fallback push failed for subscription', {
          subscriptionId: sub.id,
          receiverId: receiver.id,
          error: err,
        });
      }
    }
  }

  if (sentCount > 0) {
    log.info('Fallback push sent', { receiverId: receiver.id, incidentId, sentCount });
    return { status: 'SENT' };
  }

  const errorMessage = errors.length > 0 ? errors.join('; ') : 'All subscriptions expired or failed';
  return { status: 'FAILED', errorMessage };
}

// ---- Record fallback in DB ----

async function recordFallbackRow(params: {
  incidentId: string;
  organizationId: string;
  receiverUserId: string;
  channel: 'EMAIL' | 'PUSH';
  status: 'SENT' | 'FAILED';
  errorMessage?: string;
  m15Attempted: boolean;
}): Promise<void> {
  try {
    await prisma.safeguardEscalationFallback.create({
      data: {
        incidentId: params.incidentId,
        organizationId: params.organizationId,
        receiverUserId: params.receiverUserId,
        channel: params.channel,
        status: params.status,
        errorMessage: params.errorMessage,
        m15Attempted: params.m15Attempted,
        attemptedAt: new Date(),
      },
    });
  } catch (err) {
    log.error('Failed to record escalation fallback row', {
      incidentId: params.incidentId,
      receiverUserId: params.receiverUserId,
      error: err,
    });
  }
}

// ---- Public API ----

/**
 * Dispatch a fallback notification for a single receiver.
 *
 * Attempts email first, then web-push (if VAPID configured).
 * Inserts a SafeguardEscalationFallback row per channel attempt.
 *
 * This function never throws — errors are logged and recorded in DB.
 *
 * @param incidentId    - The safeguard incident ID
 * @param organizationId - Organization for multi-tenant isolation
 * @param receiver      - Receiver user object (id, email, fullName)
 * @param severity      - Incident severity (RED | YELLOW | GREEN)
 * @param payload       - Notification payload for message content
 * @param m15Attempted  - true if this fallback was triggered because M15 failed;
 *                        false if feature flag M10_USE_M15 is off
 */
export async function dispatchFallbackForReceiver(
  incidentId: string,
  organizationId: string,
  receiver: ReceiverUser,
  severity: IncidentSeverity,
  payload: Record<string, unknown>,
  m15Attempted = true,
): Promise<void> {
  const startMs = Date.now();
  log.info('Dispatching fallback for receiver', {
    incidentId,
    receiverId: receiver.id,
    severity,
    m15Attempted,
  });

  // ---- Email ----
  const emailResult = await sendFallbackEmail(receiver, incidentId, severity, payload);
  await recordFallbackRow({
    incidentId,
    organizationId,
    receiverUserId: receiver.id,
    channel: 'EMAIL',
    status: emailResult.status,
    errorMessage: emailResult.errorMessage,
    m15Attempted,
  });

  // ---- Web-push (optional) ----
  const pushResult = await sendFallbackWebPush(receiver, incidentId, severity, payload);
  if (pushResult.status !== 'SKIPPED') {
    await recordFallbackRow({
      incidentId,
      organizationId,
      receiverUserId: receiver.id,
      channel: 'PUSH',
      status: pushResult.status as 'SENT' | 'FAILED',
      errorMessage: pushResult.errorMessage,
      m15Attempted,
    });
  }

  log.info('Fallback dispatch complete', {
    incidentId,
    receiverId: receiver.id,
    emailStatus: emailResult.status,
    pushStatus: pushResult.status,
    durationMs: Date.now() - startMs,
  });
}

/**
 * Dispatch fallback notifications to multiple receivers.
 * Wraps dispatchFallbackForReceiver for a list. Never throws.
 */
export async function dispatchFallbackForAll(
  incidentId: string,
  organizationId: string,
  receivers: ReceiverUser[],
  severity: IncidentSeverity,
  payload: Record<string, unknown>,
  m15Attempted = true,
): Promise<void> {
  const results = await Promise.allSettled(
    receivers.map((receiver) =>
      dispatchFallbackForReceiver(incidentId, organizationId, receiver, severity, payload, m15Attempted),
    ),
  );

  const failed = results.filter((r) => r.status === 'rejected').length;
  if (failed > 0) {
    log.error('Some fallback dispatches failed', { incidentId, failed, total: receivers.length });
  }
}
