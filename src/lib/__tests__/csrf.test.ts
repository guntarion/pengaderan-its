import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCsrfToken, validateCsrfToken, requireCsrf, CSRF_CONFIG } from '../csrf';

// In the happy-dom test environment, NextRequest doesn't fully parse cookie headers.
// We mock the request interface directly to test the CSRF logic.

interface MockRequest {
  method: string;
  cookies: { get: (name: string) => { value: string } | undefined };
  headers: { get: (name: string) => string | null };
}

function createMockRequest(
  method: string,
  options?: {
    csrfCookie?: string;
    csrfHeader?: string;
  },
): MockRequest {
  const headerMap: Record<string, string> = {};
  if (options?.csrfHeader) {
    headerMap[CSRF_CONFIG.headerName] = options.csrfHeader;
  }

  return {
    method,
    cookies: {
      get: (name: string) => {
        if (name === CSRF_CONFIG.cookieName && options?.csrfCookie) {
          return { value: options.csrfCookie };
        }
        return undefined;
      },
    },
    headers: {
      get: (name: string) => headerMap[name.toLowerCase()] ?? null,
    },
  };
}

describe('CSRF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateCsrfToken', () => {
    it('returns a UUID string', () => {
      const token = generateCsrfToken();
      expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('generates unique tokens', () => {
      const t1 = generateCsrfToken();
      const t2 = generateCsrfToken();
      expect(t1).not.toBe(t2);
    });
  });

  describe('validateCsrfToken', () => {
    it('validates matching cookie + header', async () => {
      const token = generateCsrfToken();
      const req = createMockRequest('POST', {
        csrfCookie: token,
        csrfHeader: token,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(await validateCsrfToken(req as any)).toBe(true);
    });

    it('rejects mismatched cookie + header', async () => {
      const req = createMockRequest('POST', {
        csrfCookie: 'token-a',
        csrfHeader: 'token-b',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(await validateCsrfToken(req as any)).toBe(false);
    });

    it('rejects when no cookie is present', async () => {
      const req = createMockRequest('POST', {
        csrfHeader: 'some-token',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(await validateCsrfToken(req as any)).toBe(false);
    });

    it('validates matching cookie + body field', async () => {
      const token = generateCsrfToken();
      const req = createMockRequest('POST', {
        csrfCookie: token,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(await validateCsrfToken(req as any, { [CSRF_CONFIG.bodyField]: token })).toBe(true);
    });

    it('rejects when no token in header or body', async () => {
      const req = createMockRequest('POST', {
        csrfCookie: 'some-token',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(await validateCsrfToken(req as any)).toBe(false);
    });

    it('rejects different-length tokens (timing-safe)', async () => {
      const req = createMockRequest('POST', {
        csrfCookie: 'short',
        csrfHeader: 'much-longer-token-value',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(await validateCsrfToken(req as any)).toBe(false);
    });
  });

  describe('requireCsrf', () => {
    it('skips validation for GET requests', async () => {
      const req = createMockRequest('GET');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await requireCsrf(req as any);
      expect(result).toBeNull();
    });

    it('skips validation for HEAD requests', async () => {
      const req = createMockRequest('HEAD');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await requireCsrf(req as any);
      expect(result).toBeNull();
    });

    it('skips validation for OPTIONS requests', async () => {
      const req = createMockRequest('OPTIONS');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await requireCsrf(req as any);
      expect(result).toBeNull();
    });

    it('returns 403 for POST without CSRF token', async () => {
      const req = createMockRequest('POST');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await requireCsrf(req as any);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(403);
      const json = await result!.json();
      expect(json.error.code).toBe('CSRF_INVALID');
    });

    it('returns null (pass) for POST with valid CSRF', async () => {
      const token = generateCsrfToken();
      const req = createMockRequest('POST', {
        csrfCookie: token,
        csrfHeader: token,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await requireCsrf(req as any);
      expect(result).toBeNull();
    });

    it('validates DELETE requests', async () => {
      const req = createMockRequest('DELETE');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await requireCsrf(req as any);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(403);
    });

    it('validates PUT requests with valid token', async () => {
      const token = generateCsrfToken();
      const req = createMockRequest('PUT', {
        csrfCookie: token,
        csrfHeader: token,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await requireCsrf(req as any);
      expect(result).toBeNull();
    });

    it('validates PATCH requests', async () => {
      const req = createMockRequest('PATCH');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await requireCsrf(req as any);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(403);
    });
  });
});
