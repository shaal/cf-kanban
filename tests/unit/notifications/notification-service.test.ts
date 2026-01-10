/**
 * GAP-3.5.1: Notification Service Tests
 *
 * Tests for notification preferences, in-app notifications,
 * and notification dispatch functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('$lib/server/prisma', () => ({
  prisma: {
    notificationPreference: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn()
    },
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}));

// Mock webhook dispatcher
vi.mock('$lib/server/notifications/webhook-dispatcher', () => ({
  webhookDispatcher: {
    dispatchToUsers: vi.fn()
  }
}));

// Import after mocks
import { NotificationService } from '$lib/server/notifications/notification-service';
import { prisma } from '$lib/server/prisma';
import { webhookDispatcher } from '$lib/server/notifications/webhook-dispatcher';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '$lib/types/notifications';

// Get references to mocked functions
const mockPrisma = prisma as unknown as {
  notificationPreference: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  notification: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
};

const mockWebhookDispatcher = webhookDispatcher as unknown as {
  dispatchToUsers: ReturnType<typeof vi.fn>;
};

describe('NotificationService', () => {
  let service: NotificationService;
  const userId = 'user-123';

  beforeEach(() => {
    service = new NotificationService();
    vi.clearAllMocks();
  });

  describe('getPreferences', () => {
    it('should return existing preferences', async () => {
      const mockPreferences = [
        {
          id: 'pref-1',
          userId,
          eventType: 'TICKET_ASSIGNED',
          channels: ['IN_APP', 'EMAIL'],
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'pref-2',
          userId,
          eventType: 'TICKET_COMPLETED',
          channels: ['IN_APP'],
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Return all event types to avoid initialization
      const allPrefs = Object.keys(DEFAULT_NOTIFICATION_PREFERENCES).map((type, i) => ({
        id: `pref-${i}`,
        userId,
        eventType: type,
        channels: DEFAULT_NOTIFICATION_PREFERENCES[type as keyof typeof DEFAULT_NOTIFICATION_PREFERENCES],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      mockPrisma.notificationPreference.findMany.mockResolvedValue(allPrefs);

      const result = await service.getPreferences(userId);

      expect(result.userId).toBe(userId);
      expect(result.preferences.length).toBeGreaterThan(0);
    });

    it('should initialize default preferences for new users', async () => {
      // First call returns empty array (no preferences)
      mockPrisma.notificationPreference.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(
          Object.keys(DEFAULT_NOTIFICATION_PREFERENCES).map((type, i) => ({
            id: `pref-${i}`,
            userId,
            eventType: type,
            channels: DEFAULT_NOTIFICATION_PREFERENCES[type as keyof typeof DEFAULT_NOTIFICATION_PREFERENCES],
            enabled: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }))
        );

      mockPrisma.notificationPreference.createMany.mockResolvedValue({ count: 16 });

      await service.getPreferences(userId);

      expect(mockPrisma.notificationPreference.createMany).toHaveBeenCalled();
    });
  });

  describe('updatePreference', () => {
    it('should update a single preference', async () => {
      const updatedPref = {
        id: 'pref-1',
        userId,
        eventType: 'TICKET_ASSIGNED',
        channels: ['IN_APP'],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.notificationPreference.upsert.mockResolvedValue(updatedPref);

      const result = await service.updatePreference(userId, {
        eventType: 'TICKET_ASSIGNED',
        channels: ['IN_APP'],
        enabled: true
      });

      expect(result.eventType).toBe('TICKET_ASSIGNED');
      expect(result.channels).toEqual(['IN_APP']);
      expect(result.enabled).toBe(true);
    });

    it('should create preference if it does not exist', async () => {
      mockPrisma.notificationPreference.upsert.mockResolvedValue({
        id: 'new-pref',
        userId,
        eventType: 'AGENT_QUESTION',
        channels: ['IN_APP', 'EMAIL'],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await service.updatePreference(userId, {
        eventType: 'AGENT_QUESTION',
        channels: ['IN_APP', 'EMAIL'],
        enabled: true
      });

      expect(mockPrisma.notificationPreference.upsert).toHaveBeenCalledWith({
        where: {
          userId_eventType: {
            userId,
            eventType: 'AGENT_QUESTION'
          }
        },
        create: expect.any(Object),
        update: expect.any(Object)
      });
    });
  });

  describe('getNotifications', () => {
    it('should return paginated notifications', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          userId,
          eventType: 'TICKET_ASSIGNED',
          title: 'Ticket Assigned',
          message: 'You have been assigned to ticket #123',
          read: false,
          readAt: null,
          entityType: 'Ticket',
          entityId: 'ticket-123',
          metadata: {},
          createdAt: new Date()
        }
      ];

      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications);
      mockPrisma.notification.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(5); // unread

      const result = await service.getNotifications(userId, 1, 20);

      expect(result.notifications).toHaveLength(1);
      expect(result.total).toBe(10);
      expect(result.unreadCount).toBe(5);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.hasMore).toBe(false);
    });

    it('should filter unread only', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.getNotifications(userId, 1, 20, true);

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId, read: false }
        })
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      mockPrisma.notification.update.mockResolvedValue({
        id: 'notif-1',
        read: true,
        readAt: new Date()
      });

      await service.markAsRead(userId, 'notif-1');

      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId },
        data: { read: true, readAt: expect.any(Date) }
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const count = await service.markAllAsRead(userId);

      expect(count).toBe(5);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId, read: false },
        data: { read: true, readAt: expect.any(Date) }
      });
    });
  });

  describe('dispatch', () => {
    it('should create in-app notifications for recipients', async () => {
      mockPrisma.notificationPreference.findMany.mockResolvedValue([
        {
          userId: 'user-1',
          eventType: 'TICKET_ASSIGNED',
          channels: ['IN_APP'],
          enabled: true
        },
        {
          userId: 'user-2',
          eventType: 'TICKET_ASSIGNED',
          channels: ['IN_APP', 'EMAIL'],
          enabled: true
        }
      ]);

      mockPrisma.notification.createMany.mockResolvedValue({ count: 2 });
      mockWebhookDispatcher.dispatchToUsers.mockResolvedValue(undefined);

      await service.dispatch({
        eventType: 'TICKET_ASSIGNED',
        title: 'New Assignment',
        message: 'You have been assigned a ticket',
        recipientIds: ['user-1', 'user-2']
      });

      expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: 'user-1' }),
          expect.objectContaining({ userId: 'user-2' })
        ])
      });
    });

    it('should not create notifications for disabled preferences', async () => {
      mockPrisma.notificationPreference.findMany.mockResolvedValue([]);
      mockPrisma.notification.createMany.mockResolvedValue({ count: 0 });

      await service.dispatch({
        eventType: 'TICKET_ASSIGNED',
        title: 'New Assignment',
        message: 'You have been assigned a ticket',
        recipientIds: ['user-1']
      });

      expect(mockPrisma.notification.createMany).not.toHaveBeenCalled();
    });

    it('should dispatch webhooks for webhook-enabled preferences', async () => {
      mockPrisma.notificationPreference.findMany.mockResolvedValue([
        {
          userId: 'user-1',
          eventType: 'SYSTEM_ALERT',
          channels: ['WEBHOOK'],
          enabled: true
        }
      ]);

      mockWebhookDispatcher.dispatchToUsers.mockResolvedValue(undefined);

      await service.dispatch({
        eventType: 'SYSTEM_ALERT',
        title: 'System Alert',
        message: 'System health degraded',
        recipientIds: ['user-1']
      });

      expect(mockWebhookDispatcher.dispatchToUsers).toHaveBeenCalledWith(
        ['user-1'],
        expect.objectContaining({
          eventType: 'SYSTEM_ALERT',
          title: 'System Alert'
        })
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      mockPrisma.notification.count.mockResolvedValue(7);

      const count = await service.getUnreadCount(userId);

      expect(count).toBe(7);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId, read: false }
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      mockPrisma.notification.delete.mockResolvedValue({ id: 'notif-1' });

      await service.deleteNotification(userId, 'notif-1');

      expect(mockPrisma.notification.delete).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId }
      });
    });
  });

  describe('deleteOldNotifications', () => {
    it('should delete old read notifications', async () => {
      mockPrisma.notification.deleteMany.mockResolvedValue({ count: 15 });

      const count = await service.deleteOldNotifications(userId, 30);

      expect(count).toBe(15);
      expect(mockPrisma.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          userId,
          createdAt: { lt: expect.any(Date) },
          read: true
        }
      });
    });
  });
});
