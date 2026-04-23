import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
const mockCreate = vi.fn();
const mockFindMany = vi.fn();
const mockCount = vi.fn();

vi.mock('@/utils/prisma', () => ({
  prisma: {
    auditLog: {
      create: (...args: unknown[]) => mockCreate(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

import { auditLog, AUDIT_ACTIONS } from '../audit-log.service';

describe('audit-log.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('record', () => {
    it('creates an audit log entry', async () => {
      mockCreate.mockResolvedValue({ id: '1' });

      await auditLog.record({
        userId: 'user-1',
        action: 'update',
        resource: 'user',
        resourceId: 'user-2',
        oldValue: { role: 'member' },
        newValue: { role: 'admin' },
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          action: 'update',
          resource: 'user',
          resourceId: 'user-2',
          oldValue: { role: 'member' },
          newValue: { role: 'admin' },
        }),
      });
    });

    it('does not throw on database error', async () => {
      mockCreate.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(
        auditLog.record({
          action: 'create',
          resource: 'project',
        }),
      ).resolves.toBeUndefined();
    });

    it('records entry with metadata', async () => {
      mockCreate.mockResolvedValue({ id: '2' });

      await auditLog.record({
        action: 'export',
        resource: 'report',
        metadata: { format: 'csv', rows: 500 },
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'export',
          resource: 'report',
          metadata: { format: 'csv', rows: 500 },
        }),
      });
    });
  });

  describe('fromContext', () => {
    const mockCtx = {
      user: { id: 'user-ctx', email: 'test@test.com', name: 'Test', role: 'admin' },
      params: {},
      requestId: 'req-123',
      log: {} as ReturnType<typeof import('@/lib/logger').createLogger>,
    };

    it('uses userId from context', async () => {
      mockCreate.mockResolvedValue({ id: '3' });

      await auditLog.fromContext(mockCtx, {
        action: 'delete',
        resource: 'project',
        resourceId: 'proj-1',
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-ctx',
          action: 'delete',
          resource: 'project',
          resourceId: 'proj-1',
          metadata: { requestId: 'req-123' },
        }),
      });
    });
  });

  describe('query', () => {
    it('returns paginated results', async () => {
      const entries = [{ id: '1' }, { id: '2' }];
      mockFindMany.mockResolvedValue(entries);
      mockCount.mockResolvedValue(2);

      const result = await auditLog.query({ resource: 'user', page: 1, limit: 10 });

      expect(result.entries).toEqual(entries);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
    });

    it('uses default pagination', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      await auditLog.query();

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 50,
        }),
      );
    });
  });

  describe('getResourceHistory', () => {
    it('queries by resource and resourceId', async () => {
      mockFindMany.mockResolvedValue([]);

      await auditLog.getResourceHistory('user', 'user-1');

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { resource: 'user', resourceId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });
  });

  describe('getUserActivity', () => {
    it('queries by userId', async () => {
      mockFindMany.mockResolvedValue([]);

      await auditLog.getUserActivity('user-1', 20);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    });
  });

  describe('AUDIT_ACTIONS', () => {
    it('has all standard actions', () => {
      expect(AUDIT_ACTIONS.CREATE).toBe('create');
      expect(AUDIT_ACTIONS.UPDATE).toBe('update');
      expect(AUDIT_ACTIONS.DELETE).toBe('delete');
      expect(AUDIT_ACTIONS.LOGIN).toBe('login');
      expect(AUDIT_ACTIONS.LOGOUT).toBe('logout');
      expect(AUDIT_ACTIONS.ROLE_CHANGE).toBe('role_change');
    });
  });
});
