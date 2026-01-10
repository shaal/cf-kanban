/**
 * GAP-3.5.1: Notifications Module
 *
 * Server-side notification services including:
 * - Notification preferences
 * - In-app notifications
 * - Email digests
 * - Webhook delivery
 */

export { notificationService, NotificationService } from './notification-service';
export { webhookDispatcher, WebhookDispatcher } from './webhook-dispatcher';
export { emailDigestService, EmailDigestService } from './email-digest-service';
