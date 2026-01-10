/**
 * GAP-3.5.1: Notification Service
 *
 * Handles notification preferences, in-app notifications,
 * and coordinates with other notification services.
 */

import { prisma } from '$lib/server/prisma';
import type { NotificationEventType, NotificationChannel } from '@prisma/client';
import type {
  NotificationPreferenceItem,
  UserNotificationPreferences,
  UpdateNotificationPreferenceRequest,
  NotificationItem,
  PaginatedNotifications,
  NotificationDispatchPayload
} from '$lib/types/notifications';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '$lib/types/notifications';
import { webhookDispatcher } from './webhook-dispatcher';

/**
 * All notification event types
 */
const ALL_EVENT_TYPES: NotificationEventType[] = [
  'TICKET_ASSIGNED',
  'TICKET_STATUS_CHANGED',
  'TICKET_MENTIONED',
  'TICKET_COMPLETED',
  'TICKET_COMMENT',
  'PROJECT_MEMBER_ADDED',
  'PROJECT_MEMBER_REMOVED',
  'PROJECT_ARCHIVED',
  'AGENT_QUESTION',
  'AGENT_COMPLETED',
  'AGENT_FAILED',
  'AGENT_STARTED',
  'SYSTEM_ALERT',
  'SYSTEM_ANNOUNCEMENT',
  'HEALTH_DEGRADED',
  'HEALTH_RECOVERED'
];

export class NotificationService {
  /**
   * Get notification preferences for a user
   * Creates default preferences if they don't exist
   */
  async getPreferences(userId: string): Promise<UserNotificationPreferences> {
    const existing = await prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: { eventType: 'asc' }
    });

    // If no preferences exist, initialize with defaults
    if (existing.length === 0) {
      await this.initializeDefaultPreferences(userId);
      return this.getPreferences(userId);
    }

    // Fill in any missing event types with defaults
    const existingTypes = new Set(existing.map((p) => p.eventType));
    const missingTypes = ALL_EVENT_TYPES.filter((t) => !existingTypes.has(t));

    if (missingTypes.length > 0) {
      await prisma.notificationPreference.createMany({
        data: missingTypes.map((eventType) => ({
          userId,
          eventType,
          channels: DEFAULT_NOTIFICATION_PREFERENCES[eventType],
          enabled: true
        }))
      });
      return this.getPreferences(userId);
    }

    return {
      userId,
      preferences: existing.map((p) => ({
        id: p.id,
        eventType: p.eventType,
        channels: p.channels,
        enabled: p.enabled,
        updatedAt: p.updatedAt
      }))
    };
  }

  /**
   * Initialize default notification preferences for a user
   */
  async initializeDefaultPreferences(userId: string): Promise<void> {
    const data = ALL_EVENT_TYPES.map((eventType) => ({
      userId,
      eventType,
      channels: DEFAULT_NOTIFICATION_PREFERENCES[eventType],
      enabled: true
    }));

    await prisma.notificationPreference.createMany({
      data,
      skipDuplicates: true
    });
  }

  /**
   * Update a single notification preference
   */
  async updatePreference(
    userId: string,
    request: UpdateNotificationPreferenceRequest
  ): Promise<NotificationPreferenceItem> {
    const preference = await prisma.notificationPreference.upsert({
      where: {
        userId_eventType: {
          userId,
          eventType: request.eventType
        }
      },
      create: {
        userId,
        eventType: request.eventType,
        channels: request.channels,
        enabled: request.enabled
      },
      update: {
        channels: request.channels,
        enabled: request.enabled
      }
    });

    return {
      id: preference.id,
      eventType: preference.eventType,
      channels: preference.channels,
      enabled: preference.enabled,
      updatedAt: preference.updatedAt
    };
  }

  /**
   * Bulk update notification preferences
   */
  async bulkUpdatePreferences(
    userId: string,
    preferences: UpdateNotificationPreferenceRequest[]
  ): Promise<UserNotificationPreferences> {
    await Promise.all(
      preferences.map((p) => this.updatePreference(userId, p))
    );
    return this.getPreferences(userId);
  }

  /**
   * Enable all notifications for a channel
   */
  async enableChannel(userId: string, channel: NotificationChannel): Promise<void> {
    const preferences = await prisma.notificationPreference.findMany({
      where: { userId }
    });

    await Promise.all(
      preferences.map((p) => {
        const channels = [...new Set([...p.channels, channel])];
        return prisma.notificationPreference.update({
          where: { id: p.id },
          data: { channels }
        });
      })
    );
  }

  /**
   * Disable all notifications for a channel
   */
  async disableChannel(userId: string, channel: NotificationChannel): Promise<void> {
    const preferences = await prisma.notificationPreference.findMany({
      where: { userId }
    });

    await Promise.all(
      preferences.map((p) => {
        const channels = p.channels.filter((c) => c !== channel);
        return prisma.notificationPreference.update({
          where: { id: p.id },
          data: { channels }
        });
      })
    );
  }

  /**
   * Get notifications for a user with pagination
   */
  async getNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<PaginatedNotifications> {
    const where = {
      userId,
      ...(unreadOnly ? { read: false } : {})
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, read: false } })
    ]);

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        eventType: n.eventType,
        title: n.title,
        message: n.message,
        read: n.read,
        readAt: n.readAt,
        entityType: n.entityType,
        entityId: n.entityId,
        metadata: n.metadata as Record<string, unknown>,
        createdAt: n.createdAt
      })),
      total,
      unreadCount,
      page,
      limit,
      hasMore: page * limit < total
    };
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    await prisma.notification.update({
      where: { id: notificationId, userId },
      data: { read: true, readAt: new Date() }
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() }
    });
    return result.count;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    await prisma.notification.delete({
      where: { id: notificationId, userId }
    });
  }

  /**
   * Delete old notifications (cleanup)
   */
  async deleteOldNotifications(userId: string, daysOld: number = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    const result = await prisma.notification.deleteMany({
      where: {
        userId,
        createdAt: { lt: cutoff },
        read: true
      }
    });
    return result.count;
  }

  /**
   * Dispatch a notification to multiple recipients
   * This is the main entry point for sending notifications
   */
  async dispatch(payload: NotificationDispatchPayload): Promise<void> {
    const { recipientIds, eventType, title, message, entityType, entityId, metadata } = payload;

    // Get preferences for all recipients
    const recipientPreferences = await prisma.notificationPreference.findMany({
      where: {
        userId: { in: recipientIds },
        eventType,
        enabled: true
      }
    });

    // Group recipients by their enabled channels
    const inAppRecipients: string[] = [];
    const emailRecipients: string[] = [];
    const digestRecipients: string[] = [];
    const webhookRecipients: string[] = [];

    for (const pref of recipientPreferences) {
      if (pref.channels.includes('IN_APP')) inAppRecipients.push(pref.userId);
      if (pref.channels.includes('EMAIL')) emailRecipients.push(pref.userId);
      if (pref.channels.includes('EMAIL_DIGEST')) digestRecipients.push(pref.userId);
      if (pref.channels.includes('WEBHOOK')) webhookRecipients.push(pref.userId);
    }

    // Create in-app notifications
    if (inAppRecipients.length > 0) {
      await prisma.notification.createMany({
        data: inAppRecipients.map((userId) => ({
          userId,
          eventType,
          title,
          message,
          entityType,
          entityId,
          metadata: metadata || {}
        }))
      });
    }

    // Queue email notifications (placeholder - would integrate with email service)
    if (emailRecipients.length > 0) {
      // TODO: Integrate with email service
      console.log(`[NotificationService] Would send email to ${emailRecipients.length} users for ${eventType}`);
    }

    // Queue digest notifications (placeholder - would add to digest queue)
    if (digestRecipients.length > 0) {
      // TODO: Add to digest queue
      console.log(`[NotificationService] Would queue digest for ${digestRecipients.length} users for ${eventType}`);
    }

    // Dispatch webhooks
    if (webhookRecipients.length > 0) {
      await webhookDispatcher.dispatchToUsers(webhookRecipients, {
        eventType,
        title,
        message,
        entityType,
        entityId,
        metadata
      });
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, read: false }
    });
  }
}

export const notificationService = new NotificationService();
