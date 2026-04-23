// src/lib/api/webhook.ts
// Generic webhook handler with HMAC signature verification and idempotency.
//
// Usage:
//   // In src/app/api/webhooks/stripe/route.ts:
//   import { createWebhookHandler } from '@/lib/api/webhook';
//
//   export const POST = createWebhookHandler({
//     secret: () => process.env.STRIPE_WEBHOOK_SECRET!,
//     signatureHeader: 'stripe-signature',
//     events: {
//       'payment.completed': async (payload, ctx) => { ... },
//       'subscription.cancelled': async (payload, ctx) => { ... },
//     },
//   });

import { type NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('webhook');

// ---- Types ----

export interface WebhookContext {
  /** The raw request body as string. */
  rawBody: string;
  /** Parsed JSON payload. */
  payload: unknown;
  /** Event type extracted from payload. */
  event: string;
  /** Idempotency key (if present in headers or payload). */
  idempotencyKey?: string;
  /** Request ID for logging. */
  requestId: string;
  /** Child logger with webhook context. */
  log: ReturnType<typeof createLogger>;
}

export type WebhookEventHandler = (
  payload: unknown,
  ctx: WebhookContext,
) => Promise<void>;

export interface WebhookConfig {
  /**
   * Function returning the webhook secret for HMAC verification.
   * Use a function so env vars are read at runtime, not import time.
   */
  secret: () => string;

  /**
   * Header name containing the signature.
   * Default: 'x-webhook-signature'
   */
  signatureHeader?: string;

  /**
   * HMAC algorithm. Default: 'SHA-256'.
   * Common: 'SHA-256' (most services), 'SHA-1' (GitHub).
   */
  algorithm?: string;

  /**
   * How to extract the event type from the parsed payload.
   * Default: looks for `type` or `event` field at root level.
   */
  eventExtractor?: (payload: unknown) => string;

  /**
   * How to extract the idempotency key from the payload or headers.
   * Default: looks for `id` field at root, or `x-idempotency-key` / `x-request-id` header.
   */
  idempotencyExtractor?: (payload: unknown, headers: Headers) => string | undefined;

  /**
   * Map of event type → handler function.
   * Unmatched events return 200 OK (acknowledged but unhandled).
   */
  events: Record<string, WebhookEventHandler>;

  /**
   * Optional: signature format customizer.
   * Some providers prefix the signature (e.g., Stripe uses 't=...,v1=...').
   * This function should extract the raw hex/base64 signature from the header value.
   * Default: uses the full header value as-is.
   */
  signatureParser?: (headerValue: string) => string;

  /**
   * Optional: custom body-to-sign builder.
   * Some providers sign a derived string, not just the raw body.
   * Default: signs the raw body string directly.
   */
  signedPayloadBuilder?: (rawBody: string, headers: Headers) => string;

  /**
   * Skip signature verification. ONLY for development/testing.
   * Default: false.
   */
  skipVerification?: boolean;
}

// ---- Main handler ----

/**
 * Create a webhook endpoint handler with signature verification and event routing.
 */
export function createWebhookHandler(config: WebhookConfig) {
  const {
    signatureHeader = 'x-webhook-signature',
    algorithm = 'SHA-256',
    skipVerification = false,
  } = config;

  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = crypto.randomUUID().slice(0, 8);
    const webhookLog = log.child({ requestId, source: 'webhook' });

    try {
      // Read raw body
      const rawBody = await request.text();
      if (!rawBody) {
        webhookLog.warn('Empty webhook body');
        return NextResponse.json(
          { success: false, error: { code: 'BAD_REQUEST', message: 'Empty body' } },
          { status: 400 },
        );
      }

      // Verify signature
      if (!skipVerification) {
        const signature = request.headers.get(signatureHeader);
        if (!signature) {
          webhookLog.warn('Missing signature header', { header: signatureHeader });
          return NextResponse.json(
            { success: false, error: { code: 'UNAUTHORIZED', message: 'Missing signature' } },
            { status: 401 },
          );
        }

        const secret = config.secret();
        const payloadToSign = config.signedPayloadBuilder
          ? config.signedPayloadBuilder(rawBody, request.headers)
          : rawBody;
        const rawSignature = config.signatureParser
          ? config.signatureParser(signature)
          : signature;

        const valid = await verifyHmacSignature(payloadToSign, rawSignature, secret, algorithm);
        if (!valid) {
          webhookLog.warn('Invalid webhook signature');
          return NextResponse.json(
            { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid signature' } },
            { status: 401 },
          );
        }
      }

      // Parse payload
      let payload: unknown;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        webhookLog.warn('Invalid JSON payload');
        return NextResponse.json(
          { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid JSON' } },
          { status: 400 },
        );
      }

      // Extract event type
      const event = config.eventExtractor
        ? config.eventExtractor(payload)
        : extractDefaultEvent(payload);

      if (!event) {
        webhookLog.warn('Could not extract event type from payload');
        return NextResponse.json(
          { success: false, error: { code: 'BAD_REQUEST', message: 'Missing event type' } },
          { status: 400 },
        );
      }

      // Extract idempotency key
      const idempotencyKey = config.idempotencyExtractor
        ? config.idempotencyExtractor(payload, request.headers)
        : extractDefaultIdempotencyKey(payload, request.headers);

      const ctx: WebhookContext = {
        rawBody,
        payload,
        event,
        idempotencyKey,
        requestId,
        log: webhookLog.child({ event, idempotencyKey }),
      };

      // Route to handler
      const handler = config.events[event];
      if (!handler) {
        ctx.log.info('Unhandled webhook event (acknowledged)');
        return NextResponse.json({ success: true, data: { event, status: 'ignored' } });
      }

      ctx.log.info('Processing webhook event');
      await handler(payload, ctx);
      ctx.log.info('Webhook event processed');

      return NextResponse.json({ success: true, data: { event, status: 'processed' } });
    } catch (err) {
      webhookLog.error('Webhook handler error', { error: err });
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: 'Webhook processing failed' } },
        { status: 500 },
      );
    }
  };
}

// ---- HMAC Verification ----

/**
 * Verify HMAC signature using Web Crypto API (works in Edge Runtime).
 */
async function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: string,
): Promise<boolean> {
  const encoder = new TextEncoder();

  // Determine the SubtleCrypto algorithm name
  const algoMap: Record<string, string> = {
    'SHA-256': 'SHA-256',
    'SHA-1': 'SHA-1',
    'SHA-384': 'SHA-384',
    'SHA-512': 'SHA-512',
  };
  const hashAlgo = algoMap[algorithm] || algorithm;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: hashAlgo },
    false,
    ['sign'],
  );

  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const computed = bufferToHex(signatureBytes);

  // Constant-time comparison
  return timingSafeEqual(computed, signature.toLowerCase());
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ---- Default extractors ----

function extractDefaultEvent(payload: unknown): string | undefined {
  if (typeof payload !== 'object' || payload === null) return undefined;
  const p = payload as Record<string, unknown>;
  if (typeof p.type === 'string') return p.type;
  if (typeof p.event === 'string') return p.event;
  if (typeof p.action === 'string') return p.action;
  return undefined;
}

function extractDefaultIdempotencyKey(
  payload: unknown,
  headers: Headers,
): string | undefined {
  // Check headers first
  const headerKey =
    headers.get('x-idempotency-key') ||
    headers.get('x-request-id') ||
    headers.get('x-webhook-id');
  if (headerKey) return headerKey;

  // Check payload
  if (typeof payload === 'object' && payload !== null) {
    const p = payload as Record<string, unknown>;
    if (typeof p.id === 'string') return p.id;
    if (typeof p.event_id === 'string') return p.event_id;
  }

  return undefined;
}
