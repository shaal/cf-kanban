/**
 * GAP-3.5.1: Webhooks API
 *
 * GET /api/notifications/webhooks - Get all webhooks
 * POST /api/notifications/webhooks - Create a new webhook
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { webhookDispatcher } from '$lib/server/notifications';
import type { CreateWebhookRequest } from '$lib/types/notifications';
import { isValidWebhookUrl } from '$lib/types/notifications';

/**
 * GET /api/notifications/webhooks
 * Get all webhooks for the current user
 */
export const GET: RequestHandler = async () => {
  try {
    // TODO: Get actual user ID from session when auth is implemented
    const userId = 'demo-user';

    const webhooks = await webhookDispatcher.getWebhooks(userId);
    return json({ webhooks });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get webhooks';
    return json({ message }, { status: 500 });
  }
};

/**
 * POST /api/notifications/webhooks
 * Create a new webhook
 *
 * Body:
 * - name: string - Webhook name
 * - url: string - Webhook URL (must be http or https)
 * - secret?: string - Optional secret for HMAC signing
 * - eventTypes: NotificationEventType[] - Event types to subscribe to
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    // TODO: Get actual user ID from session when auth is implemented
    const userId = 'demo-user';

    const body = (await request.json()) as CreateWebhookRequest;

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return json({ message: 'name is required and must be a string' }, { status: 400 });
    }

    if (!body.url || typeof body.url !== 'string') {
      return json({ message: 'url is required and must be a string' }, { status: 400 });
    }

    if (!isValidWebhookUrl(body.url)) {
      return json(
        { message: 'url must be a valid HTTP or HTTPS URL' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.eventTypes) || body.eventTypes.length === 0) {
      return json(
        { message: 'eventTypes must be a non-empty array' },
        { status: 400 }
      );
    }

    const webhook = await webhookDispatcher.createWebhook(userId, body);
    return json(webhook, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create webhook';
    return json({ message }, { status: 500 });
  }
};
