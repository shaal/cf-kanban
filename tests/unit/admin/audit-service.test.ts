/**
 * TASK-104: Audit Logging Service Tests
 *
 * Tests for audit logging, log retrieval, and export functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AuditAction } from '@prisma/client';

// Mock Prisma
const mockPrisma = {
  auditLog: {
    create: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn()
  }
};

vi.mock('$lib/server/prisma', () => ({
  prisma: mockPrisma
}));

// Import after mocks
import { AuditService, type AuditLogRequest } from '$lib/server/admin/audit-service';

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(() => {
    service = new AuditService();
    vi.clearAllMocks();
  });

  describe('log', () => {
    it('should create audit log entry', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const request: AuditLogRequest = {
        userId: 'user-1',
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: 'new-user-1',
        description: 'Created new user',
        metadata: { email: 'new@test.com' }
      };

      await service.log(request);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          action: 'USER_CREATED',
          entityType: 'User',
          entityId: 'new-user-1',
          description: 'Created new user',
          metadata: { email: 'new@test.com' },
          ipAddress: null,
          userAgent: null,
          isSensitive: false
        }
      });
    });

    it('should handle optional fields', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const request: AuditLogRequest = {
        userId: 'user-1',
        action: 'USER_LOGIN',
        entityType: 'User',
        description: 'User logged in',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        isSensitive: true
      };

      await service.log(request);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          isSensitive: true
        })
      });
    });

    it('should not throw on log failure', async () => {
      mockPrisma.auditLog.create.mockRejectedValue(new Error('DB error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        service.log({
          userId: 'user-1',
          action: 'USER_LOGIN',
          entityType: 'User',
          description: 'Test'
        })
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('listLogs', () => {
    const mockLogs = [
      {
        id: 'log-1',
        userId: 'user-1',
        action: 'USER_CREATED' as AuditAction,
        entityType: 'User',
        entityId: 'new-user',
        description: 'Created user',
        metadata: {},
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome',
        isSensitive: false,
        createdAt: new Date(),
        user: { name: 'Admin', email: 'admin@test.com' }
      }
    ];

    it('should return paginated audit logs', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(1);
      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.listLogs({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].userName).toBe('Admin');
      expect(result.data[0].userEmail).toBe('admin@test.com');
    });

    it('should filter by action', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(0);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.listLogs(
        { page: 1, limit: 10 },
        { action: 'USER_DELETED' }
      );

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { action: 'USER_DELETED' }
        })
      );
    });

    it('should filter by entity type and ID', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(0);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.listLogs(
        { page: 1, limit: 10 },
        { entityType: 'Project', entityId: 'project-1' }
      );

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entityType: 'Project', entityId: 'project-1' }
        })
      );
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockPrisma.auditLog.count.mockResolvedValue(0);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.listLogs(
        { page: 1, limit: 10 },
        { startDate, endDate }
      );

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          }
        })
      );
    });

    it('should filter by sensitive flag', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(0);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.listLogs(
        { page: 1, limit: 10 },
        { isSensitive: true }
      );

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isSensitive: true }
        })
      );
    });
  });

  describe('getEntityLogs', () => {
    it('should return logs for specific entity', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          userId: 'user-1',
          action: 'PROJECT_UPDATED' as AuditAction,
          entityType: 'Project',
          entityId: 'project-1',
          description: 'Updated project',
          metadata: {},
          ipAddress: null,
          userAgent: null,
          isSensitive: false,
          createdAt: new Date(),
          user: { name: 'Admin', email: 'admin@test.com' }
        }
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getEntityLogs('Project', 'project-1');

      expect(result).toHaveLength(1);
      expect(result[0].entityType).toBe('Project');
      expect(result[0].entityId).toBe('project-1');
    });
  });

  describe('exportToCSV', () => {
    it('should generate valid CSV content', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          userId: 'user-1',
          action: 'USER_LOGIN' as AuditAction,
          entityType: 'User',
          entityId: 'user-1',
          description: 'User logged in',
          metadata: { browser: 'Chrome' },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          isSensitive: false,
          createdAt: new Date('2024-01-15T10:30:00Z'),
          user: { name: 'Test User', email: 'test@test.com' }
        }
      ]);

      const csv = await service.exportToCSV();

      expect(csv).toContain('Timestamp,User Email,User Name,Action');
      expect(csv).toContain('test@test.com');
      expect(csv).toContain('Test User');
      expect(csv).toContain('USER_LOGIN');
    });

    it('should escape quotes in CSV', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          userId: 'user-1',
          action: 'USER_LOGIN' as AuditAction,
          entityType: 'User',
          entityId: null,
          description: 'Description with "quotes"',
          metadata: {},
          ipAddress: null,
          userAgent: null,
          isSensitive: false,
          createdAt: new Date(),
          user: { name: 'User "Nickname"', email: 'test@test.com' }
        }
      ]);

      const csv = await service.exportToCSV();

      expect(csv).toContain('""quotes""');
      expect(csv).toContain('User ""Nickname""');
    });

    it('should apply filters to export', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.exportToCSV({ action: 'USER_DELETED' });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { action: 'USER_DELETED' }
        })
      );
    });
  });

  describe('exportToJSON', () => {
    it('should generate valid JSON content', async () => {
      const createdAt = new Date('2024-01-15T10:30:00Z');
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          userId: 'user-1',
          action: 'USER_LOGIN' as AuditAction,
          entityType: 'User',
          entityId: 'user-1',
          description: 'User logged in',
          metadata: { browser: 'Chrome' },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          isSensitive: false,
          createdAt,
          user: { name: 'Test User', email: 'test@test.com' }
        }
      ]);

      const json = await service.exportToJSON();
      const parsed = JSON.parse(json);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('log-1');
      expect(parsed[0].action).toBe('USER_LOGIN');
      expect(parsed[0].user.email).toBe('test@test.com');
      expect(parsed[0].metadata).toEqual({ browser: 'Chrome' });
    });

    it('should apply filters to export', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      const startDate = new Date('2024-01-01');

      await service.exportToJSON({ startDate });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdAt: { gte: startDate }
          }
        })
      );
    });
  });

  describe('getSensitiveOperationsCount', () => {
    it('should count sensitive operations in time window', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(5);

      const count = await service.getSensitiveOperationsCount(24);

      expect(count).toBe(5);
      expect(mockPrisma.auditLog.count).toHaveBeenCalledWith({
        where: {
          isSensitive: true,
          createdAt: { gte: expect.any(Date) }
        }
      });
    });
  });

  describe('getRecentLogCount', () => {
    it('should count recent logs in time window', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(100);

      const count = await service.getRecentLogCount(24);

      expect(count).toBe(100);
    });
  });
});

describe('AuditLogRequest type', () => {
  it('should require essential fields', () => {
    const request: AuditLogRequest = {
      userId: 'user-1',
      action: 'USER_LOGIN',
      entityType: 'User',
      description: 'User logged in'
    };

    expect(request.userId).toBeDefined();
    expect(request.action).toBeDefined();
    expect(request.entityType).toBeDefined();
    expect(request.description).toBeDefined();
  });
});
