import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Redis
const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
const mockRedisDel = vi.fn();
const mockRedisScan = vi.fn();
const mockPipelineExec = vi.fn();
const mockPipelineDel = vi.fn();

vi.mock('@/lib/redis', () => ({
  isRedisConfigured: vi.fn(() => true),
  getRedisClient: vi.fn(() => ({
    get: mockRedisGet,
    set: mockRedisSet,
    del: mockRedisDel,
    scan: mockRedisScan,
    pipeline: vi.fn(() => ({
      del: mockPipelineDel,
      exec: mockPipelineExec,
    })),
  })),
}));

import { withCache, invalidateCache, getCached, setCache, CACHE_KEYS, CACHE_TTL } from '../cache';
import { isRedisConfigured } from '@/lib/redis';

describe('cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('withCache', () => {
    it('returns cached value on cache hit', async () => {
      mockRedisGet.mockResolvedValue({ id: 1, name: 'cached' });
      const fetchFn = vi.fn();

      const result = await withCache('test:key', 300, fetchFn);

      expect(result).toEqual({ id: 1, name: 'cached' });
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('calls fetchFn on cache miss and stores result', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockRedisSet.mockResolvedValue('OK');
      const fetchFn = vi.fn().mockResolvedValue({ id: 2, name: 'fresh' });

      const result = await withCache('test:key', 300, fetchFn);

      expect(result).toEqual({ id: 2, name: 'fresh' });
      expect(fetchFn).toHaveBeenCalledOnce();
      expect(mockRedisSet).toHaveBeenCalledWith(
        'test:key',
        JSON.stringify({ id: 2, name: 'fresh' }),
        { ex: 300 },
      );
    });

    it('falls back to fetchFn when Redis not configured', async () => {
      vi.mocked(isRedisConfigured).mockReturnValue(false);
      const fetchFn = vi.fn().mockResolvedValue('data');

      const result = await withCache('test:key', 300, fetchFn);

      expect(result).toBe('data');
      expect(mockRedisGet).not.toHaveBeenCalled();
    });

    it('falls back to fetchFn when cache read fails', async () => {
      vi.mocked(isRedisConfigured).mockReturnValue(true);
      mockRedisGet.mockRejectedValue(new Error('Redis down'));
      mockRedisSet.mockResolvedValue('OK');
      const fetchFn = vi.fn().mockResolvedValue('fallback');

      const result = await withCache('test:key', 300, fetchFn);

      expect(result).toBe('fallback');
    });
  });

  describe('invalidateCache', () => {
    it('deletes exact key', async () => {
      mockRedisDel.mockResolvedValue(1);

      const deleted = await invalidateCache('users:123');

      expect(mockRedisDel).toHaveBeenCalledWith('users:123');
      expect(deleted).toBe(1);
    });

    it('scans and deletes pattern keys', async () => {
      mockRedisScan.mockResolvedValueOnce([0, ['users:1', 'users:2']]);
      mockPipelineExec.mockResolvedValue([]);

      const deleted = await invalidateCache('users:*');

      expect(mockRedisScan).toHaveBeenCalledWith(0, { match: 'users:*', count: 100 });
      expect(deleted).toBe(2);
    });

    it('returns 0 when Redis not configured', async () => {
      vi.mocked(isRedisConfigured).mockReturnValue(false);

      const deleted = await invalidateCache('key');

      expect(deleted).toBe(0);
    });
  });

  describe('getCached', () => {
    it('returns cached value', async () => {
      vi.mocked(isRedisConfigured).mockReturnValue(true);
      mockRedisGet.mockResolvedValue('cached');
      const result = await getCached('key');
      expect(result).toBe('cached');
    });

    it('returns null when Redis not configured', async () => {
      vi.mocked(isRedisConfigured).mockReturnValue(false);
      const result = await getCached('key');
      expect(result).toBeNull();
    });
  });

  describe('setCache', () => {
    it('sets value with TTL', async () => {
      vi.mocked(isRedisConfigured).mockReturnValue(true);
      mockRedisSet.mockResolvedValue('OK');
      await setCache('key', { data: true }, 60);
      expect(mockRedisSet).toHaveBeenCalledWith('key', JSON.stringify({ data: true }), { ex: 60 });
    });
  });

  describe('CACHE_KEYS', () => {
    it('generates correct key formats', () => {
      expect(CACHE_KEYS.all('users')).toBe('users:all');
      expect(CACHE_KEYS.byId('users', '123')).toBe('users:123');
      expect(CACHE_KEYS.list('users', 1, 20)).toBe('users:list:1:20');
      expect(CACHE_KEYS.list('users', 1, 20, 'name')).toBe('users:list:1:20:name');
      expect(CACHE_KEYS.custom('users', 'active')).toBe('users:active');
      expect(CACHE_KEYS.pattern('users')).toBe('users:*');
    });
  });

  describe('CACHE_TTL', () => {
    it('has correct values', () => {
      expect(CACHE_TTL.SHORT).toBe(30);
      expect(CACHE_TTL.MEDIUM).toBe(300);
      expect(CACHE_TTL.LONG).toBe(1800);
      expect(CACHE_TTL.HOUR).toBe(3600);
      expect(CACHE_TTL.DAY).toBe(86400);
    });
  });
});
