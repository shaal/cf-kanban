/**
 * GAP-3.5.1: Notifications API
 *
 * GET /api/notifications - Get notifications with pagination
 * POST /api/notifications/read - Mark notification(s) as read
 * DELETE /api/notifications/:id - Delete a notification
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { notificationService } from '$lib/server/notifications';

/**
 * GET /api/notifications
 * Get paginated notifications for the current user
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20)
 * - unread: boolean (default: false) - only get unread notifications
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    // TODO: Get actual user ID from session when auth is implemented
    const userId = 'demo-user';

    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
    const unreadOnly = url.searchParams.get('unread') === 'true';

    const result = await notificationService.getNotifications(userId, page, limit, unreadOnly);

    return json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get notifications';
    return json({ message }, { status: 500 });
  }
};

/**
 * POST /api/notifications
 * Mark notifications as read
 *
 * Body:
 * - id?: string - Mark single notification as read
 * - all?: boolean - Mark all notifications as read
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    // TODO: Get actual user ID from session when auth is implemented
    const userId = 'demo-user';

    const body = await request.json();

    if (body.all) {
      const count = await notificationService.markAllAsRead(userId);
      return json({ success: true, count });
    }

    if (body.id) {
      await notificationService.markAsRead(userId, body.id);
      return json({ success: true });
    }

    return json({ message: 'Either "id" or "all" must be provided' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark notification as read';
    return json({ message }, { status: 500 });
  }
};

/**
 * DELETE /api/notifications
 * Delete a notification
 *
 * Query params:
 * - id: string - Notification ID to delete
 */
export const DELETE: RequestHandler = async ({ url }) => {
  try {
    // TODO: Get actual user ID from session when auth is implemented
    const userId = 'demo-user';

    const id = url.searchParams.get('id');
    if (!id) {
      return json({ message: 'Notification ID is required' }, { status: 400 });
    }

    await notificationService.deleteNotification(userId, id);
    return json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete notification';
    return json({ message }, { status: 500 });
  }
};
