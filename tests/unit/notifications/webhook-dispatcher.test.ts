/**
 * GAP-3.5.1: Webhook Dispatcher Tests
 *
 * Tests for webhook configuration, delivery, and failure handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Prisma
vi.mock('$lib/server/prisma', () => ({
  prisma: {
    webhookConfig: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    webhookDeliveryLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocks
import { WebhookDispatcher } from '$lib/server/notifications/webhook-dispatcher';
import { prisma } from '$lib/server/prisma';

// Get references to mocked functions
const mockPrisma = prisma as unknown as {
  webhookConfig: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  webhookDeliveryLog: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
};

describe('WebhookDispatcher', () => {
  let dispatcher: WebhookDispatcher;
  const userId = 'user-123';

  beforeEach(() => {
    dispatcher = new WebhookDispatcher();
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createWebhook', () => {
    it('should create a new webhook configuration', async () => {
      const mockWebhook = {
        id: 'webhook-1',
        userId,
        name: 'Slack Notifications',
        url: 'https://hooks.slack.com/services/xxx',
        secret: 'my-secret',
        eventTypes: ['TICKET_COMPLETED', 'AGENT_FAILED'],
        enabled: true,
        isPaused: false,
        failureCount: 0,
        lastSuccessAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.webhookConfig.create.mockResolvedValue(mockWebhook);

      const result = await dispatcher.createWebhook(userId, {
        name: 'Slack Notifications',
        url: 'https://hooks.slack.com/services/xxx',
        secret: 'my-secret',
        eventTypes: ['TICKET_COMPLETED', 'AGENT_FAILED']
      });

      expect(result.name).toBe('Slack Notifications');
      expect(result.url).toBe('https://hooks.slack.com/services/xxx');
      expect(result.eventTypes).toEqual(['TICKET_COMPLETED', 'AGENT_FAILED']);
      expect(result.enabled).toBe(true);
    });
  });

  describe('getWebhooks', () => {
    it('should return all webhooks for a user', async () => {
      const mockWebhooks = [
        {
          id: 'webhook-1',
          userId,
          name: 'Webhook 1',
          url: 'https://example.com/hook1',
          secret: null,
          eventTypes: ['TICKET_ASSIGNED'],
          enabled: true,
          isPaused: false,
          failureCount: 0,
          lastSuccessAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'webhook-2',
          userId,
          name: 'Webhook 2',
          url: 'https://example.com/hook2',
          secret: 'secret',
          eventTypes: ['SYSTEM_ALERT'],
          enabled: false,
          isPaused: false,
          failureCount: 2,
          lastSuccessAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockPrisma.webhookConfig.findMany.mockResolvedValue(mockWebhooks);

      const result = await dispatcher.getWebhooks(userId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Webhook 1');
      expect(result[1].enabled).toBe(false);
    });
  });

  describe('updateWebhook', () => {
    it('should update webhook properties', async () => {
      mockPrisma.webhookConfig.update.mockResolvedValue({
        id: 'webhook-1',
        userId,
        name: 'Updated Name',
        url: 'https://example.com/new-hook',
        secret: null,
        eventTypes: ['TICKET_ASSIGNED', 'TICKET_COMPLETED'],
        enabled: true,
        isPaused: false,
        failureCount: 0,
        lastSuccessAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await dispatcher.updateWebhook(userId, 'webhook-1', {
        name: 'Updated Name',
        url: 'https://example.com/new-hook'
      });

      expect(result.name).toBe('Updated Name');
      expect(result.url).toBe('https://example.com/new-hook');
    });

    it('should enable/disable a webhook', async () => {
      mockPrisma.webhookConfig.update.mockResolvedValue({
        id: 'webhook-1',
        userId,
        name: 'Webhook',
        url: 'https://example.com/hook',
        secret: null,
        eventTypes: ['TICKET_ASSIGNED'],
        enabled: false,
        isPaused: false,
        failureCount: 0,
        lastSuccessAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await dispatcher.updateWebhook(userId, 'webhook-1', {
        enabled: false
      });

      expect(result.enabled).toBe(false);
    });
  });

  describe('deleteWebhook', () => {
    it('should delete a webhook', async () => {
      mockPrisma.webhookConfig.delete.mockResolvedValue({ id: 'webhook-1' });

      await dispatcher.deleteWebhook(userId, 'webhook-1');

      expect(mockPrisma.webhookConfig.delete).toHaveBeenCalledWith({
        where: { id: 'webhook-1', userId }
      });
    });
  });

  describe('unpauseWebhook', () => {
    it('should reset failure count and unpause', async () => {
      mockPrisma.webhookConfig.update.mockResolvedValue({
        id: 'webhook-1',
        userId,
        name: 'Webhook',
        url: 'https://example.com/hook',
        secret: null,
        eventTypes: ['TICKET_ASSIGNED'],
        enabled: true,
        isPaused: false,
        failureCount: 0,
        lastSuccessAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await dispatcher.unpauseWebhook(userId, 'webhook-1');

      expect(result.isPaused).toBe(false);
      expect(result.failureCount).toBe(0);
      expect(mockPrisma.webhookConfig.update).toHaveBeenCalledWith({
        where: { id: 'webhook-1', userId },
        data: {
          isPaused: false,
          failureCount: 0
        }
      });
    });
  });

  describe('testWebhook', () => {
    it('should send test payload and return success', async () => {
      mockPrisma.webhookConfig.findFirst.mockResolvedValue({
        id: 'webhook-1',
        userId,
        name: 'Test Webhook',
        url: 'https://example.com/hook',
        secret: 'test-secret',
        eventTypes: ['SYSTEM_ALERT'],
        enabled: true,
        isPaused: false,
        failureCount: 0,
        lastSuccessAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('OK')
      });

      const result = await dispatcher.testWebhook(userId, 'webhook-1');

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.responseTime).toBeDefined();
    });

    it('should return failure for failed request', async () => {
      mockPrisma.webhookConfig.findFirst.mockResolvedValue({
        id: 'webhook-1',
        userId,
        name: 'Test Webhook',
        url: 'https://example.com/hook',
        secret: null,
        eventTypes: ['SYSTEM_ALERT'],
        enabled: true,
        isPaused: false,
        failureCount: 0,
        lastSuccessAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error')
      });

      const result = await dispatcher.testWebhook(userId, 'webhook-1');

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toContain('500');
    });

    it('should return error for non-existent webhook', async () => {
      mockPrisma.webhookConfig.findFirst.mockResolvedValue(null);

      const result = await dispatcher.testWebhook(userId, 'non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Webhook not found');
    });
  });

  describe('dispatchToUsers', () => {
    it('should dispatch to all matching webhooks', async () => {
      mockPrisma.webhookConfig.findMany.mockResolvedValue([
        {
          id: 'webhook-1',
          userId: 'user-1',
          name: 'Webhook 1',
          url: 'https://example1.com/hook',
          secret: null,
          eventTypes: ['TICKET_ASSIGNED'],
          enabled: true,
          isPaused: false,
          failureCount: 0,
          lastSuccessAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'webhook-2',
          userId: 'user-2',
          name: 'Webhook 2',
          url: 'https://example2.com/hook',
          secret: 'secret',
          eventTypes: ['TICKET_ASSIGNED'],
          enabled: true,
          isPaused: false,
          failureCount: 0,
          lastSuccessAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('OK')
      });

      mockPrisma.webhookDeliveryLog.create.mockResolvedValue({});
      mockPrisma.webhookDeliveryLog.findMany.mockResolvedValue([]);
      mockPrisma.webhookDeliveryLog.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.webhookConfig.update.mockResolvedValue({});

      await dispatcher.dispatchToUsers(['user-1', 'user-2'], {
        eventType: 'TICKET_ASSIGNED',
        title: 'New Assignment',
        message: 'You have been assigned a ticket'
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not dispatch to paused webhooks', async () => {
      mockPrisma.webhookConfig.findMany.mockResolvedValue([]);

      await dispatcher.dispatchToUsers(['user-1'], {
        eventType: 'TICKET_ASSIGNED',
        title: 'New Assignment',
        message: 'You have been assigned a ticket'
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('getDeliveryLogs', () => {
    it('should return delivery logs for a webhook', async () => {
      mockPrisma.webhookConfig.findFirst.mockResolvedValue({
        id: 'webhook-1',
        userId
      });

      mockPrisma.webhookDeliveryLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          webhookId: 'webhook-1',
          eventType: 'TICKET_ASSIGNED',
          statusCode: 200,
          success: true,
          errorMessage: null,
          durationMs: 150,
          createdAt: new Date()
        },
        {
          id: 'log-2',
          webhookId: 'webhook-1',
          eventType: 'SYSTEM_ALERT',
          statusCode: 500,
          success: false,
          errorMessage: 'Internal Server Error',
          durationMs: 2000,
          createdAt: new Date()
        }
      ]);

      const logs = await dispatcher.getDeliveryLogs(userId, 'webhook-1', 20);

      expect(logs).toHaveLength(2);
      expect(logs[0].success).toBe(true);
      expect(logs[1].success).toBe(false);
      expect(logs[1].errorMessage).toBe('Internal Server Error');
    });

    it('should throw error for non-existent webhook', async () => {
      mockPrisma.webhookConfig.findFirst.mockResolvedValue(null);

      await expect(
        dispatcher.getDeliveryLogs(userId, 'non-existent', 20)
      ).rejects.toThrow('Webhook not found');
    });
  });
});
