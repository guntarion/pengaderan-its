/**
 * src/app/api/webhooks/resend/route.ts
 * NAWASENA M15 — Resend Email Delivery Webhook
 *
 * POST /api/webhooks/resend
 *
 * Handles Resend delivery events:
 *   - email.delivered → update NotificationLog status to DELIVERED
 *   - email.bounced   → update NotificationLog + set emailBouncedAt on preference
 *   - email.complained → update NotificationLog + set emailBouncedAt (conservative)
 *   - email.opened    → optional, mark DELIVERED
 *
 * Resend uses Svix for webhook signatures:
 *   Headers: svix-id, svix-timestamp, svix-signature
 *   Secret: RESEND_WEBHOOK_SECRET (starts with "whsec_...")
 *
 * @see https://resend.com/docs/dashboard/webhooks/introduction
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { createLogger } from '@/lib/logger';
import { createHmac, timingSafeEqual } from 'crypto';

const log = createLogger('webhooks:resend');

/**
 * Verify Resend/Svix webhook signature.
 * Algorithm: HMAC-SHA256 over "{svix-id}.{svix-timestamp}.{rawBody}"
 * Secret is base64url decoded from the "whsec_..." format.
 */
async function verifyResendSignature(
  req: NextRequest,
  rawBody: string,
): Promise<boolean> {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    log.error('RESEND_WEBHOOK_SECRET not configured');
    return false;
  }

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    log.warn('Missing Svix signature headers');
    return false;
  }

  // Validate timestamp to prevent replay attacks (5 minute window)
  const timestampMs = parseInt(svixTimestamp, 10) * 1000;
  const fiveMinutes = 5 * 60 * 1000;
  if (Math.abs(Date.now() - timestampMs) > fiveMinutes) {
    log.warn('Svix timestamp too old or in the future', { svixTimestamp });
    return false;
  }

  // Decode "whsec_..." secret (base64)
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');

  // Compute expected signature
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expectedHmac = createHmac('sha256', secretBytes)
    .update(signedContent)
    .digest('base64');
  const expectedSig = `v1,${expectedHmac}`;

  // Svix sends multiple signatures separated by spaces
  const signatures = svixSignature.split(' ');
  for (const sig of signatures) {
    try {
      const expectedBuf = Buffer.from(expectedSig);
      const actualBuf = Buffer.from(sig);
      if (
        expectedBuf.length === actualBuf.length &&
        timingSafeEqual(expectedBuf, actualBuf)
      ) {
        return true;
      }
    } catch {
      // continue to next signature
    }
  }

  log.warn('Svix signature verification failed');
  return false;
}

interface ResendEmailEvent {
  type: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject?: string;
    created_at?: string;
    tags?: { name: string; value: string }[];
  };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const requestId = req.headers.get('svix-id') ?? 'unknown';

  const reqLog = log.child({ requestId });

  // Verify signature
  const isValid = await verifyResendSignature(req, rawBody);
  if (!isValid) {
    reqLog.warn('Webhook signature verification failed — rejecting');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: ResendEmailEvent;
  try {
    event = JSON.parse(rawBody) as ResendEmailEvent;
  } catch {
    reqLog.warn('Failed to parse webhook payload');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  reqLog.info('Resend webhook received', { type: event.type, emailId: event.data.email_id });

  try {
    switch (event.type) {
      case 'email.delivered':
        await handleDelivered(event, reqLog);
        break;
      case 'email.bounced':
        await handleBounced(event, reqLog);
        break;
      case 'email.complained':
        await handleComplained(event, reqLog);
        break;
      case 'email.opened':
        // Treat as delivered confirmation
        await handleDelivered(event, reqLog);
        break;
      default:
        reqLog.debug('Unhandled Resend webhook event type', { type: event.type });
    }
  } catch (err) {
    reqLog.error('Error processing Resend webhook', { error: err, type: event.type });
    // Return 200 to prevent Resend from retrying (we log the error for investigation)
  }

  return NextResponse.json({ received: true });
}

async function handleDelivered(
  event: ResendEmailEvent,
  reqLog: ReturnType<typeof createLogger>,
): Promise<void> {
  const updated = await prisma.notificationLog.updateMany({
    where: {
      providerMessageId: event.data.email_id,
      channel: 'EMAIL',
    },
    data: {
      status: 'DELIVERED',
      deliveredAt: new Date(),
    },
  });

  reqLog.info('Marked notification as DELIVERED', {
    emailId: event.data.email_id,
    count: updated.count,
  });
}

async function handleBounced(
  event: ResendEmailEvent,
  reqLog: ReturnType<typeof createLogger>,
): Promise<void> {
  // Update notification log
  const logs = await prisma.notificationLog.findMany({
    where: {
      providerMessageId: event.data.email_id,
      channel: 'EMAIL',
    },
    select: { userId: true },
  });

  await prisma.notificationLog.updateMany({
    where: {
      providerMessageId: event.data.email_id,
      channel: 'EMAIL',
    },
    data: {
      status: 'BOUNCED',
      failedAt: new Date(),
    },
  });

  // Set emailBouncedAt on user preference (30-day cooldown)
  if (logs.length > 0) {
    const userIds = [...new Set(logs.map((l) => l.userId))];
    for (const userId of userIds) {
      await prisma.notificationPreference.updateMany({
        where: { userId },
        data: { emailBouncedAt: new Date() },
      });
      reqLog.info('Set emailBouncedAt due to bounce', { userId });
    }
  }

  reqLog.info('Handled email bounce', {
    emailId: event.data.email_id,
    affectedUsers: logs.length,
  });
}

async function handleComplained(
  event: ResendEmailEvent,
  reqLog: ReturnType<typeof createLogger>,
): Promise<void> {
  // Treat complaint like bounce — add 30-day cooldown
  const logs = await prisma.notificationLog.findMany({
    where: {
      providerMessageId: event.data.email_id,
      channel: 'EMAIL',
    },
    select: { userId: true },
  });

  await prisma.notificationLog.updateMany({
    where: {
      providerMessageId: event.data.email_id,
      channel: 'EMAIL',
    },
    data: {
      status: 'COMPLAINED',
      failedAt: new Date(),
    },
  });

  if (logs.length > 0) {
    const userIds = [...new Set(logs.map((l) => l.userId))];
    for (const userId of userIds) {
      await prisma.notificationPreference.updateMany({
        where: { userId },
        data: { emailBouncedAt: new Date() },
      });
      reqLog.info('Set emailBouncedAt due to complaint', { userId });
    }
  }

  reqLog.info('Handled email complaint', {
    emailId: event.data.email_id,
    affectedUsers: logs.length,
  });
}
