/**
 * GAP-3.5.1: Notification Preferences API
 *
 * GET /api/notifications/preferences - Get all preferences
 * PUT /api/notifications/preferences - Update preferences (single or bulk)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { notificationService } from '$lib/server/notifications';
import type { UpdateNotificationPreferenceRequest } from '$lib/types/notifications';

/**
 * GET /api/notifications/preferences
 * Get all notification preferences for the current user
 */
export const GET: RequestHandler = async () => {
  try {
    // TODO: Get actual user ID from session when auth is implemented
    const userId = 'demo-user';

    const preferences = await notificationService.getPreferences(userId);
    return json(preferences);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get preferences';
    return json({ message }, { status: 500 });
  }
};

/**
 * PUT /api/notifications/preferences
 * Update notification preferences
 *
 * Body:
 * - eventType: NotificationEventType (for single update)
 * - channels: NotificationChannel[] (for single update)
 * - enabled: boolean (for single update)
 *
 * OR
 *
 * - preferences: UpdateNotificationPreferenceRequest[] (for bulk update)
 */
export const PUT: RequestHandler = async ({ request }) => {
  try {
    // TODO: Get actual user ID from session when auth is implemented
    const userId = 'demo-user';

    const body = await request.json();

    // Check if bulk update
    if (Array.isArray(body.preferences)) {
      const result = await notificationService.bulkUpdatePreferences(
        userId,
        body.preferences as UpdateNotificationPreferenceRequest[]
      );
      return json(result);
    }

    // Single update
    const { eventType, channels, enabled } = body;

    if (!eventType) {
      return json({ message: 'eventType is required' }, { status: 400 });
    }

    if (!Array.isArray(channels)) {
      return json({ message: 'channels must be an array' }, { status: 400 });
    }

    if (typeof enabled !== 'boolean') {
      return json({ message: 'enabled must be a boolean' }, { status: 400 });
    }

    const result = await notificationService.updatePreference(userId, {
      eventType,
      channels,
      enabled
    });

    return json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update preferences';
    return json({ message }, { status: 500 });
  }
};
