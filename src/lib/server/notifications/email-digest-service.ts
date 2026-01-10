/**
 * GAP-3.5.1: Email Digest Service
 *
 * Handles email digest preferences and scheduling.
 * Note: Actual email sending is a placeholder - integrate with
 * email provider (SendGrid, SES, etc.) as needed.
 */

import { prisma } from '$lib/server/prisma';
import type {
  EmailDigestSettingsData,
  UpdateEmailDigestRequest
} from '$lib/types/notifications';

/**
 * Default email digest settings
 */
const DEFAULT_DIGEST_SETTINGS: EmailDigestSettingsData = {
  enabled: false,
  frequency: 'daily',
  preferredHour: 9,
  preferredDay: 1, // Monday
  lastSentAt: null
};

export class EmailDigestService {
  /**
   * Get email digest settings for a user
   */
  async getSettings(userId: string): Promise<EmailDigestSettingsData> {
    const settings = await prisma.emailDigestSettings.findUnique({
      where: { userId }
    });

    if (!settings) {
      return DEFAULT_DIGEST_SETTINGS;
    }

    return {
      enabled: settings.enabled,
      frequency: settings.frequency as 'daily' | 'weekly',
      preferredHour: settings.preferredHour,
      preferredDay: settings.preferredDay,
      lastSentAt: settings.lastSentAt
    };
  }

  /**
   * Update email digest settings for a user
   */
  async updateSettings(
    userId: string,
    request: UpdateEmailDigestRequest
  ): Promise<EmailDigestSettingsData> {
    const settings = await prisma.emailDigestSettings.upsert({
      where: { userId },
      create: {
        userId,
        enabled: request.enabled ?? DEFAULT_DIGEST_SETTINGS.enabled,
        frequency: request.frequency ?? DEFAULT_DIGEST_SETTINGS.frequency,
        preferredHour: request.preferredHour ?? DEFAULT_DIGEST_SETTINGS.preferredHour,
        preferredDay: request.preferredDay ?? DEFAULT_DIGEST_SETTINGS.preferredDay
      },
      update: {
        ...(request.enabled !== undefined && { enabled: request.enabled }),
        ...(request.frequency !== undefined && { frequency: request.frequency }),
        ...(request.preferredHour !== undefined && { preferredHour: request.preferredHour }),
        ...(request.preferredDay !== undefined && { preferredDay: request.preferredDay })
      }
    });

    return {
      enabled: settings.enabled,
      frequency: settings.frequency as 'daily' | 'weekly',
      preferredHour: settings.preferredHour,
      preferredDay: settings.preferredDay,
      lastSentAt: settings.lastSentAt
    };
  }

  /**
   * Get users who should receive a digest at the current time
   * This would be called by a scheduled job
   */
  async getUsersForDigest(): Promise<string[]> {
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentDay = now.getUTCDay();

    // Find users whose digest is due
    const settings = await prisma.emailDigestSettings.findMany({
      where: {
        enabled: true,
        preferredHour: currentHour,
        OR: [
          // Daily digests at the preferred hour
          { frequency: 'daily' },
          // Weekly digests on the preferred day and hour
          {
            frequency: 'weekly',
            preferredDay: currentDay
          }
        ]
      },
      select: { userId: true, lastSentAt: true, frequency: true }
    });

    // Filter out users who already received a digest recently
    return settings
      .filter((s) => {
        if (!s.lastSentAt) return true;

        const hoursSinceLastSent =
          (now.getTime() - s.lastSentAt.getTime()) / (1000 * 60 * 60);

        // Daily: at least 20 hours since last send
        // Weekly: at least 6 days since last send
        return s.frequency === 'daily'
          ? hoursSinceLastSent >= 20
          : hoursSinceLastSent >= 144; // 6 days in hours
      })
      .map((s) => s.userId);
  }

  /**
   * Generate and send digest for a user
   * Placeholder - integrate with actual email provider
   */
  async sendDigest(userId: string): Promise<void> {
    // Get unread notifications since last digest
    const settings = await prisma.emailDigestSettings.findUnique({
      where: { userId }
    });

    if (!settings?.enabled) return;

    const since = settings.lastSentAt || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        createdAt: { gte: since }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    if (notifications.length === 0) {
      // No notifications to send
      return;
    }

    // Get user email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    });

    if (!user) return;

    // TODO: Integrate with email service (SendGrid, SES, etc.)
    console.log(`[EmailDigestService] Would send digest to ${user.email} with ${notifications.length} notifications`);

    // Example digest content structure:
    const digestContent = {
      recipientEmail: user.email,
      recipientName: user.name,
      notificationCount: notifications.length,
      notifications: notifications.map((n) => ({
        title: n.title,
        message: n.message,
        createdAt: n.createdAt
      })),
      digestPeriod: {
        from: since,
        to: new Date()
      }
    };

    console.log('[EmailDigestService] Digest content:', JSON.stringify(digestContent, null, 2));

    // Update last sent timestamp
    await prisma.emailDigestSettings.update({
      where: { userId },
      data: { lastSentAt: new Date() }
    });
  }

  /**
   * Process all pending digests
   * This would be called by a scheduled job (e.g., every hour)
   */
  async processDigests(): Promise<{ processed: number; errors: number }> {
    const userIds = await this.getUsersForDigest();

    let processed = 0;
    let errors = 0;

    for (const userId of userIds) {
      try {
        await this.sendDigest(userId);
        processed++;
      } catch (error) {
        console.error(`[EmailDigestService] Failed to send digest to user ${userId}:`, error);
        errors++;
      }
    }

    return { processed, errors };
  }
}

export const emailDigestService = new EmailDigestService();
