/**
 * GAP-3.5.1: Email Digest Settings API
 *
 * GET /api/notifications/digest - Get digest settings
 * PUT /api/notifications/digest - Update digest settings
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { emailDigestService } from '$lib/server/notifications';
import type { UpdateEmailDigestRequest } from '$lib/types/notifications';

/**
 * GET /api/notifications/digest
 * Get email digest settings for the current user
 */
export const GET: RequestHandler = async () => {
  try {
    // TODO: Get actual user ID from session when auth is implemented
    const userId = 'demo-user';

    const settings = await emailDigestService.getSettings(userId);
    return json(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get digest settings';
    return json({ message }, { status: 500 });
  }
};

/**
 * PUT /api/notifications/digest
 * Update email digest settings
 *
 * Body:
 * - enabled?: boolean
 * - frequency?: 'daily' | 'weekly'
 * - preferredHour?: number (0-23)
 * - preferredDay?: number (0-6, 0=Sunday)
 */
export const PUT: RequestHandler = async ({ request }) => {
  try {
    // TODO: Get actual user ID from session when auth is implemented
    const userId = 'demo-user';

    const body = (await request.json()) as UpdateEmailDigestRequest;

    // Validate frequency if provided
    if (body.frequency !== undefined && !['daily', 'weekly'].includes(body.frequency)) {
      return json(
        { message: 'frequency must be "daily" or "weekly"' },
        { status: 400 }
      );
    }

    // Validate preferredHour if provided
    if (body.preferredHour !== undefined) {
      if (
        typeof body.preferredHour !== 'number' ||
        body.preferredHour < 0 ||
        body.preferredHour > 23
      ) {
        return json(
          { message: 'preferredHour must be a number between 0 and 23' },
          { status: 400 }
        );
      }
    }

    // Validate preferredDay if provided
    if (body.preferredDay !== undefined) {
      if (
        typeof body.preferredDay !== 'number' ||
        body.preferredDay < 0 ||
        body.preferredDay > 6
      ) {
        return json(
          { message: 'preferredDay must be a number between 0 and 6' },
          { status: 400 }
        );
      }
    }

    const settings = await emailDigestService.updateSettings(userId, body);
    return json(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update digest settings';
    return json({ message }, { status: 500 });
  }
};
