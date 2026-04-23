import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createWebhookHandler } from '../api/webhook';

// Helper to create HMAC signature
async function createHmacSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function createRequest(body: object | string, headers?: Record<string, string>): NextRequest {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  return new NextRequest('http://localhost/api/webhooks/test', {
    method: 'POST',
    body: bodyStr,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  });
}

const TEST_SECRET = 'test-webhook-secret-123';

describe('createWebhookHandler', () => {
  const mockHandler = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects empty body', async () => {
    const handler = createWebhookHandler({
      secret: () => TEST_SECRET,
      skipVerification: true,
      events: {},
    });

    const req = new NextRequest('http://localhost/api/webhooks/test', {
      method: 'POST',
      body: '',
    });
    const res = await handler(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('BAD_REQUEST');
  });

  it('rejects missing signature', async () => {
    const handler = createWebhookHandler({
      secret: () => TEST_SECRET,
      events: {},
    });

    const req = createRequest({ type: 'test.event' });
    const res = await handler(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.message).toBe('Missing signature');
  });

  it('rejects invalid signature', async () => {
    const handler = createWebhookHandler({
      secret: () => TEST_SECRET,
      events: {},
    });

    const req = createRequest(
      { type: 'test.event' },
      { 'x-webhook-signature': 'invalid-signature-hex' },
    );
    const res = await handler(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.message).toBe('Invalid signature');
  });

  it('verifies valid HMAC signature and routes event', async () => {
    const body = JSON.stringify({ type: 'payment.completed', amount: 100 });
    const signature = await createHmacSignature(body, TEST_SECRET);

    const handler = createWebhookHandler({
      secret: () => TEST_SECRET,
      events: {
        'payment.completed': mockHandler,
      },
    });

    mockHandler.mockResolvedValue(undefined);

    const req = createRequest(body, { 'x-webhook-signature': signature });
    const res = await handler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.event).toBe('payment.completed');
    expect(json.data.status).toBe('processed');
    expect(mockHandler).toHaveBeenCalledOnce();
    expect(mockHandler.mock.calls[0][0]).toEqual({ type: 'payment.completed', amount: 100 });
  });

  it('acknowledges unhandled events with 200', async () => {
    const body = JSON.stringify({ type: 'unknown.event' });
    const handler = createWebhookHandler({
      secret: () => TEST_SECRET,
      skipVerification: true,
      events: {
        'payment.completed': mockHandler,
      },
    });

    const req = createRequest(body);
    const res = await handler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.status).toBe('ignored');
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('supports skipVerification for development', async () => {
    const handler = createWebhookHandler({
      secret: () => TEST_SECRET,
      skipVerification: true,
      events: {
        'test.event': mockHandler,
      },
    });
    mockHandler.mockResolvedValue(undefined);

    const req = createRequest({ type: 'test.event', data: { foo: 'bar' } });
    const res = await handler(req);

    expect(res.status).toBe(200);
    expect(mockHandler).toHaveBeenCalledOnce();
  });

  it('uses custom signatureHeader', async () => {
    const body = JSON.stringify({ type: 'test.event' });
    const signature = await createHmacSignature(body, TEST_SECRET);

    const handler = createWebhookHandler({
      secret: () => TEST_SECRET,
      signatureHeader: 'x-custom-sig',
      events: { 'test.event': mockHandler },
    });
    mockHandler.mockResolvedValue(undefined);

    const req = createRequest(body, { 'x-custom-sig': signature });
    const res = await handler(req);

    expect(res.status).toBe(200);
  });

  it('uses custom eventExtractor', async () => {
    const handler = createWebhookHandler({
      secret: () => TEST_SECRET,
      skipVerification: true,
      eventExtractor: (p) => (p as { event_type: string }).event_type,
      events: { 'order.created': mockHandler },
    });
    mockHandler.mockResolvedValue(undefined);

    const req = createRequest({ event_type: 'order.created' });
    const res = await handler(req);

    expect(res.status).toBe(200);
    expect(mockHandler).toHaveBeenCalledOnce();
  });

  it('extracts idempotency key from headers', async () => {
    const handler = createWebhookHandler({
      secret: () => TEST_SECRET,
      skipVerification: true,
      events: { 'test.event': mockHandler },
    });
    mockHandler.mockResolvedValue(undefined);

    const req = createRequest(
      { type: 'test.event' },
      { 'x-idempotency-key': 'idem-123' },
    );
    await handler(req);

    const ctx = mockHandler.mock.calls[0][1];
    expect(ctx.idempotencyKey).toBe('idem-123');
  });

  it('extracts idempotency key from payload id', async () => {
    const handler = createWebhookHandler({
      secret: () => TEST_SECRET,
      skipVerification: true,
      events: { 'test.event': mockHandler },
    });
    mockHandler.mockResolvedValue(undefined);

    const req = createRequest({ type: 'test.event', id: 'evt_abc123' });
    await handler(req);

    const ctx = mockHandler.mock.calls[0][1];
    expect(ctx.idempotencyKey).toBe('evt_abc123');
  });

  it('returns 400 for missing event type', async () => {
    const handler = createWebhookHandler({
      secret: () => TEST_SECRET,
      skipVerification: true,
      events: {},
    });

    const req = createRequest({ data: 'no event field' });
    const res = await handler(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.message).toBe('Missing event type');
  });

  it('returns 400 for invalid JSON', async () => {
    const handler = createWebhookHandler({
      secret: () => TEST_SECRET,
      skipVerification: true,
      events: {},
    });

    const req = new NextRequest('http://localhost/api/webhooks/test', {
      method: 'POST',
      body: 'not-json{{{',
    });
    const res = await handler(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.message).toBe('Invalid JSON');
  });

  it('returns 500 when handler throws', async () => {
    const handler = createWebhookHandler({
      secret: () => TEST_SECRET,
      skipVerification: true,
      events: {
        'test.event': async () => { throw new Error('handler broke'); },
      },
    });

    const req = createRequest({ type: 'test.event' });
    const res = await handler(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_ERROR');
  });

  it('supports custom signatureParser', async () => {
    const body = JSON.stringify({ type: 'test.event' });
    const rawSig = await createHmacSignature(body, TEST_SECRET);
    // Simulate Stripe-like format: v1=<hex>
    const prefixedSig = `v1=${rawSig}`;

    const handler = createWebhookHandler({
      secret: () => TEST_SECRET,
      signatureParser: (header) => header.replace('v1=', ''),
      events: { 'test.event': mockHandler },
    });
    mockHandler.mockResolvedValue(undefined);

    const req = createRequest(body, { 'x-webhook-signature': prefixedSig });
    const res = await handler(req);

    expect(res.status).toBe(200);
  });
});
