/**
 * GAP-3.5.1: Webhook Dispatcher Service
 *
 * Handles webhook delivery for notifications:
 * - Dispatches webhooks to configured endpoints
 * - HMAC signature generation for verification
 * - Delivery logging and retry handling
 * - Automatic pause on repeated failures
 */

import { prisma } from '$lib/server/prisma';
import { createHmac, randomUUID } from 'crypto';
import type { NotificationEventType, WebhookConfig } from '@prisma/client';
import type {
  WebhookPayload,
  WebhookConfigItem,
  CreateWebhookRequest,
  UpdateWebhookRequest,
  WebhookTestResult,
  WebhookDeliveryLogItem
} from '$lib/types/notifications';

/**
 * Maximum consecutive failures before pausing a webhook
 */
const MAX_FAILURES_BEFORE_PAUSE = 5;

/**
 * Request timeout in milliseconds
 */
const REQUEST_TIMEOUT_MS = 30000;

export class WebhookDispatcher {
  /**
   * Create a new webhook configuration
   */
  async createWebhook(
    userId: string,
    request: CreateWebhookRequest
  ): Promise<WebhookConfigItem> {
    const webhook = await prisma.webhookConfig.create({
      data: {
        userId,
        name: request.name,
        url: request.url,
        secret: request.secret || null,
        eventTypes: request.eventTypes,
        enabled: true
      }
    });

    return this.mapToWebhookItem(webhook);
  }

  /**
   * Get all webhooks for a user
   */
  async getWebhooks(userId: string): Promise<WebhookConfigItem[]> {
    const webhooks = await prisma.webhookConfig.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return webhooks.map(this.mapToWebhookItem);
  }

  /**
   * Get a single webhook by ID
   */
  async getWebhook(userId: string, webhookId: string): Promise<WebhookConfigItem | null> {
    const webhook = await prisma.webhookConfig.findFirst({
      where: { id: webhookId, userId }
    });

    return webhook ? this.mapToWebhookItem(webhook) : null;
  }

  /**
   * Update a webhook configuration
   */
  async updateWebhook(
    userId: string,
    webhookId: string,
    request: UpdateWebhookRequest
  ): Promise<WebhookConfigItem> {
    const webhook = await prisma.webhookConfig.update({
      where: { id: webhookId, userId },
      data: {
        ...(request.name !== undefined && { name: request.name }),
        ...(request.url !== undefined && { url: request.url }),
        ...(request.secret !== undefined && { secret: request.secret }),
        ...(request.eventTypes !== undefined && { eventTypes: request.eventTypes }),
        ...(request.enabled !== undefined && { enabled: request.enabled })
      }
    });

    return this.mapToWebhookItem(webhook);
  }

  /**
   * Delete a webhook configuration
   */
  async deleteWebhook(userId: string, webhookId: string): Promise<void> {
    await prisma.webhookConfig.delete({
      where: { id: webhookId, userId }
    });
  }

  /**
   * Unpause a webhook (reset failure count)
   */
  async unpauseWebhook(userId: string, webhookId: string): Promise<WebhookConfigItem> {
    const webhook = await prisma.webhookConfig.update({
      where: { id: webhookId, userId },
      data: {
        isPaused: false,
        failureCount: 0
      }
    });

    return this.mapToWebhookItem(webhook);
  }

  /**
   * Test a webhook with a sample payload
   */
  async testWebhook(
    userId: string,
    webhookId: string
  ): Promise<WebhookTestResult> {
    const webhook = await prisma.webhookConfig.findFirst({
      where: { id: webhookId, userId }
    });

    if (!webhook) {
      return { success: false, error: 'Webhook not found' };
    }

    const testPayload: WebhookPayload = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      eventType: 'SYSTEM_ALERT',
      title: 'Webhook Test',
      message: 'This is a test notification from cf-kanban.',
      metadata: { test: true }
    };

    return this.deliver(webhook, testPayload, true);
  }

  /**
   * Dispatch notifications to all webhooks for specified users
   */
  async dispatchToUsers(
    userIds: string[],
    notification: {
      eventType: NotificationEventType;
      title: string;
      message: string;
      entityType?: string;
      entityId?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    // Get all active webhooks for these users that match the event type
    const webhooks = await prisma.webhookConfig.findMany({
      where: {
        userId: { in: userIds },
        enabled: true,
        isPaused: false,
        eventTypes: { has: notification.eventType }
      }
    });

    if (webhooks.length === 0) return;

    const payload: WebhookPayload = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      eventType: notification.eventType,
      title: notification.title,
      message: notification.message,
      entityType: notification.entityType,
      entityId: notification.entityId,
      metadata: notification.metadata
    };

    // Dispatch to all matching webhooks in parallel
    await Promise.allSettled(
      webhooks.map((webhook) => this.deliver(webhook, payload, false))
    );
  }

  /**
   * Deliver a payload to a webhook endpoint
   */
  private async deliver(
    webhook: WebhookConfig,
    payload: WebhookPayload,
    isTest: boolean
  ): Promise<WebhookTestResult> {
    const startTime = Date.now();
    const body = JSON.stringify(payload);

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'cf-kanban-webhook/1.0',
      'X-Webhook-ID': webhook.id,
      'X-Event-Type': payload.eventType,
      'X-Delivery-ID': payload.id
    };

    // Add HMAC signature if secret is configured
    if (webhook.secret) {
      const signature = this.generateSignature(body, webhook.secret);
      headers['X-Webhook-Signature'] = signature;
      headers['X-Webhook-Signature-256'] = `sha256=${signature}`;
    }

    let statusCode: number | undefined;
    let responseBody: string | undefined;
    let errorMessage: string | undefined;
    let success = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      statusCode = response.status;
      success = response.ok;

      // Try to get response body for logging
      try {
        responseBody = await response.text();
        // Truncate if too long
        if (responseBody.length > 1000) {
          responseBody = responseBody.substring(0, 1000) + '...';
        }
      } catch {
        // Ignore response body errors
      }

      if (!success) {
        errorMessage = `HTTP ${statusCode}: ${responseBody || 'No response body'}`;
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (error instanceof Error && error.name === 'AbortError') {
        errorMessage = `Request timed out after ${REQUEST_TIMEOUT_MS}ms`;
      }
    }

    const durationMs = Date.now() - startTime;

    // Log delivery attempt (except for tests which are logged differently)
    if (!isTest) {
      await this.logDelivery(webhook.id, payload.eventType, {
        statusCode,
        success,
        errorMessage,
        responseBody,
        durationMs,
        payload
      });

      // Update webhook status based on result
      await this.updateWebhookStatus(webhook.id, success);
    }

    return {
      success,
      statusCode,
      responseTime: durationMs,
      error: errorMessage
    };
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Log webhook delivery attempt
   */
  private async logDelivery(
    webhookId: string,
    eventType: NotificationEventType,
    data: {
      statusCode?: number;
      success: boolean;
      errorMessage?: string;
      responseBody?: string;
      durationMs: number;
      payload: WebhookPayload;
    }
  ): Promise<void> {
    await prisma.webhookDeliveryLog.create({
      data: {
        webhookId,
        eventType,
        statusCode: data.statusCode || null,
        success: data.success,
        errorMessage: data.errorMessage || null,
        responseBody: data.responseBody || null,
        durationMs: data.durationMs,
        payload: data.payload as Record<string, unknown>
      }
    });

    // Clean up old logs (keep last 100 per webhook)
    const oldLogs = await prisma.webhookDeliveryLog.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      skip: 100,
      select: { id: true }
    });

    if (oldLogs.length > 0) {
      await prisma.webhookDeliveryLog.deleteMany({
        where: { id: { in: oldLogs.map((l) => l.id) } }
      });
    }
  }

  /**
   * Update webhook status after delivery attempt
   */
  private async updateWebhookStatus(
    webhookId: string,
    success: boolean
  ): Promise<void> {
    if (success) {
      // Reset failure count on success
      await prisma.webhookConfig.update({
        where: { id: webhookId },
        data: {
          lastSuccessAt: new Date(),
          failureCount: 0,
          isPaused: false
        }
      });
    } else {
      // Increment failure count
      const webhook = await prisma.webhookConfig.update({
        where: { id: webhookId },
        data: {
          failureCount: { increment: 1 }
        }
      });

      // Pause if too many failures
      if (webhook.failureCount >= MAX_FAILURES_BEFORE_PAUSE) {
        await prisma.webhookConfig.update({
          where: { id: webhookId },
          data: { isPaused: true }
        });
      }
    }
  }

  /**
   * Get delivery logs for a webhook
   */
  async getDeliveryLogs(
    userId: string,
    webhookId: string,
    limit: number = 20
  ): Promise<WebhookDeliveryLogItem[]> {
    // Verify webhook belongs to user
    const webhook = await prisma.webhookConfig.findFirst({
      where: { id: webhookId, userId }
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const logs = await prisma.webhookDeliveryLog.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return logs.map((log) => ({
      id: log.id,
      webhookId: log.webhookId,
      eventType: log.eventType,
      statusCode: log.statusCode,
      success: log.success,
      errorMessage: log.errorMessage,
      durationMs: log.durationMs,
      createdAt: log.createdAt
    }));
  }

  /**
   * Map Prisma webhook to API response type
   */
  private mapToWebhookItem(webhook: WebhookConfig): WebhookConfigItem {
    return {
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      eventTypes: webhook.eventTypes,
      enabled: webhook.enabled,
      isPaused: webhook.isPaused,
      failureCount: webhook.failureCount,
      lastSuccessAt: webhook.lastSuccessAt,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt
    };
  }
}

export const webhookDispatcher = new WebhookDispatcher();
