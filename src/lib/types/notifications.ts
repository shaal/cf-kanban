/**
 * GAP-3.5.1: Notification Types and Interfaces
 *
 * Type definitions for the notification system including:
 * - Notification event types
 * - Delivery channels
 * - Preferences
 * - Webhooks
 */

import type {
  NotificationEventType,
  NotificationChannel
} from '@prisma/client';

export type { NotificationEventType, NotificationChannel };

/**
 * Notification event type categories for grouping in UI
 */
export const NOTIFICATION_CATEGORIES = {
  TICKET: [
    'TICKET_ASSIGNED',
    'TICKET_STATUS_CHANGED',
    'TICKET_MENTIONED',
    'TICKET_COMPLETED',
    'TICKET_COMMENT'
  ],
  PROJECT: [
    'PROJECT_MEMBER_ADDED',
    'PROJECT_MEMBER_REMOVED',
    'PROJECT_ARCHIVED'
  ],
  AGENT: [
    'AGENT_QUESTION',
    'AGENT_COMPLETED',
    'AGENT_FAILED',
    'AGENT_STARTED'
  ],
  SYSTEM: [
    'SYSTEM_ALERT',
    'SYSTEM_ANNOUNCEMENT',
    'HEALTH_DEGRADED',
    'HEALTH_RECOVERED'
  ]
} as const;

/**
 * Human-readable labels for notification event types
 */
export const NOTIFICATION_EVENT_LABELS: Record<NotificationEventType, string> = {
  TICKET_ASSIGNED: 'Ticket Assigned to You',
  TICKET_STATUS_CHANGED: 'Ticket Status Changed',
  TICKET_MENTIONED: 'Mentioned in Ticket',
  TICKET_COMPLETED: 'Ticket Completed',
  TICKET_COMMENT: 'New Comment on Ticket',
  PROJECT_MEMBER_ADDED: 'Member Added to Project',
  PROJECT_MEMBER_REMOVED: 'Member Removed from Project',
  PROJECT_ARCHIVED: 'Project Archived',
  AGENT_QUESTION: 'Agent Asks a Question',
  AGENT_COMPLETED: 'Agent Completed Task',
  AGENT_FAILED: 'Agent Task Failed',
  AGENT_STARTED: 'Agent Started Working',
  SYSTEM_ALERT: 'System Alert',
  SYSTEM_ANNOUNCEMENT: 'System Announcement',
  HEALTH_DEGRADED: 'System Health Degraded',
  HEALTH_RECOVERED: 'System Health Recovered'
};

/**
 * Human-readable labels for notification channels
 */
export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  IN_APP: 'In-App',
  EMAIL: 'Email',
  EMAIL_DIGEST: 'Email Digest',
  WEBHOOK: 'Webhook'
};

/**
 * Default notification preferences for new users
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: Record<NotificationEventType, NotificationChannel[]> = {
  TICKET_ASSIGNED: ['IN_APP', 'EMAIL'],
  TICKET_STATUS_CHANGED: ['IN_APP'],
  TICKET_MENTIONED: ['IN_APP', 'EMAIL'],
  TICKET_COMPLETED: ['IN_APP'],
  TICKET_COMMENT: ['IN_APP'],
  PROJECT_MEMBER_ADDED: ['IN_APP', 'EMAIL'],
  PROJECT_MEMBER_REMOVED: ['IN_APP', 'EMAIL'],
  PROJECT_ARCHIVED: ['IN_APP', 'EMAIL'],
  AGENT_QUESTION: ['IN_APP', 'EMAIL'],
  AGENT_COMPLETED: ['IN_APP'],
  AGENT_FAILED: ['IN_APP', 'EMAIL'],
  AGENT_STARTED: ['IN_APP'],
  SYSTEM_ALERT: ['IN_APP', 'EMAIL'],
  SYSTEM_ANNOUNCEMENT: ['IN_APP', 'EMAIL'],
  HEALTH_DEGRADED: ['IN_APP', 'EMAIL'],
  HEALTH_RECOVERED: ['IN_APP']
};

/**
 * Notification preference for a single event type
 */
export interface NotificationPreferenceItem {
  id: string;
  eventType: NotificationEventType;
  channels: NotificationChannel[];
  enabled: boolean;
  updatedAt: Date;
}

/**
 * Complete notification preferences for a user
 */
export interface UserNotificationPreferences {
  userId: string;
  preferences: NotificationPreferenceItem[];
}

/**
 * Request to update notification preference
 */
export interface UpdateNotificationPreferenceRequest {
  eventType: NotificationEventType;
  channels: NotificationChannel[];
  enabled: boolean;
}

/**
 * Request to bulk update notification preferences
 */
export interface BulkUpdateNotificationPreferencesRequest {
  preferences: UpdateNotificationPreferenceRequest[];
}

/**
 * In-app notification item
 */
export interface NotificationItem {
  id: string;
  eventType: NotificationEventType;
  title: string;
  message: string;
  read: boolean;
  readAt: Date | null;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Paginated notifications response
 */
export interface PaginatedNotifications {
  notifications: NotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Email digest settings
 */
export interface EmailDigestSettingsData {
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  preferredHour: number;
  preferredDay: number;
  lastSentAt: Date | null;
}

/**
 * Request to update email digest settings
 */
export interface UpdateEmailDigestRequest {
  enabled?: boolean;
  frequency?: 'daily' | 'weekly';
  preferredHour?: number;
  preferredDay?: number;
}

/**
 * Webhook configuration item
 */
export interface WebhookConfigItem {
  id: string;
  name: string;
  url: string;
  eventTypes: NotificationEventType[];
  enabled: boolean;
  isPaused: boolean;
  failureCount: number;
  lastSuccessAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Request to create a webhook
 */
export interface CreateWebhookRequest {
  name: string;
  url: string;
  secret?: string;
  eventTypes: NotificationEventType[];
}

/**
 * Request to update a webhook
 */
export interface UpdateWebhookRequest {
  name?: string;
  url?: string;
  secret?: string;
  eventTypes?: NotificationEventType[];
  enabled?: boolean;
}

/**
 * Webhook delivery log entry
 */
export interface WebhookDeliveryLogItem {
  id: string;
  webhookId: string;
  eventType: NotificationEventType;
  statusCode: number | null;
  success: boolean;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: Date;
}

/**
 * Webhook test result
 */
export interface WebhookTestResult {
  success: boolean;
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

/**
 * Notification dispatch payload
 */
export interface NotificationDispatchPayload {
  eventType: NotificationEventType;
  title: string;
  message: string;
  recipientIds: string[];
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Webhook payload structure
 */
export interface WebhookPayload {
  id: string;
  timestamp: string;
  eventType: NotificationEventType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Get category label for notification event type
 */
export function getNotificationCategory(eventType: NotificationEventType): string {
  for (const [category, types] of Object.entries(NOTIFICATION_CATEGORIES)) {
    if ((types as readonly string[]).includes(eventType)) {
      return category;
    }
  }
  return 'OTHER';
}

/**
 * Get icon name for notification event type
 */
export function getNotificationIcon(eventType: NotificationEventType): string {
  const iconMap: Record<NotificationEventType, string> = {
    TICKET_ASSIGNED: 'user-plus',
    TICKET_STATUS_CHANGED: 'refresh-cw',
    TICKET_MENTIONED: 'at-sign',
    TICKET_COMPLETED: 'check-circle',
    TICKET_COMMENT: 'message-square',
    PROJECT_MEMBER_ADDED: 'user-plus',
    PROJECT_MEMBER_REMOVED: 'user-minus',
    PROJECT_ARCHIVED: 'archive',
    AGENT_QUESTION: 'help-circle',
    AGENT_COMPLETED: 'check',
    AGENT_FAILED: 'x-circle',
    AGENT_STARTED: 'play',
    SYSTEM_ALERT: 'alert-triangle',
    SYSTEM_ANNOUNCEMENT: 'megaphone',
    HEALTH_DEGRADED: 'alert-circle',
    HEALTH_RECOVERED: 'check-circle-2'
  };
  return iconMap[eventType] || 'bell';
}

/**
 * Format notification time for display
 */
export function formatNotificationTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(date).toLocaleDateString();
}

/**
 * Validate webhook URL
 */
export function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Day of week labels
 */
export const DAY_OF_WEEK_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
] as const;

/**
 * Hour labels for digest time picker
 */
export const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => {
  const hour = i % 12 || 12;
  const period = i < 12 ? 'AM' : 'PM';
  return `${hour}:00 ${period}`;
});
