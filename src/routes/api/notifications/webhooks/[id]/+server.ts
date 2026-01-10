/**
 * GAP-3.5.1: Webhook API (Single Webhook Operations)
 *
 * GET /api/notifications/webhooks/:id - Get webhook details
 * PUT /api/notifications/webhooks/:id - Update webhook
 * DELETE /api/notifications/webhooks/:id - Delete webhook
 * POST /api/notifications/webhooks/:id/test - Test webhook
 * POST /api/notifications/webhooks/:id/unpause - Unpause webhook
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { webhookDispatcher } from '$lib/server/notifications';
import type { UpdateWebhookRequest } from '$lib/types/notifications';
import { isValidWebhookUrl } from '$lib/types/notifications';

/**
 * GET /api/notifications/webhooks/:id
 * Get webhook details including recent delivery logs
 */
export const GET: RequestHandler = async ({ params, url }) => {
  try {
    // TODO: Get actual user ID from session when auth is implemented
    const userId = 'demo-user';
    const { id } = params;

    const includeLogs = url.searchParams.get('logs') !== 'false';

    const webhook = await webhookDispatcher.getWebhook(userId, id);
    if (!webhook) {
      return json({ message: 'Webhook not found' }, { status: 404 });
    }

    let logs = undefined;
    if (includeLogs) {
      logs = await webhookDispatcher.getDeliveryLogs(userId, id, 20);
    }

    return json({ webhook, logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get webhook';
    return json({ message }, { status: 500 });
  }
};

/**
 * PUT /api/notifications/webhooks/:id
 * Update webhook configuration
 *
 * Body:
 * - name?: string
 * - url?: string
 * - secret?: string
 * - eventTypes?: NotificationEventType[]
 * - enabled?: boolean
 */
export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    // TODO: Get actual user ID from session when auth is implemented
    const userId = 'demo-user';
    const { id } = params;

    const body = (await request.json()) as UpdateWebhookRequest;

    // Validate URL if provided
    if (body.url !== undefined && !isValidWebhookUrl(body.url)) {
      return json(
        { message: 'url must be a valid HTTP or HTTPS URL' },
        { status: 400 }
      );
    }

    // Validate eventTypes if provided
    if (body.eventTypes !== undefined) {
      if (!Array.isArray(body.eventTypes) || body.eventTypes.length === 0) {
        return json(
          { message: 'eventTypes must be a non-empty array' },
          { status: 400 }
        );
      }
    }

    const webhook = await webhookDispatcher.updateWebhook(userId, id, body);
    return json(webhook);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update webhook';
    return json({ message }, { status: 500 });
  }
};

/**
 * DELETE /api/notifications/webhooks/:id
 * Delete a webhook
 */
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    // TODO: Get actual user ID from session when auth is implemented
    const userId = 'demo-user';
    const { id } = params;

    await webhookDispatcher.deleteWebhook(userId, id);
    return json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete webhook';
    return json({ message }, { status: 500 });
  }
};

/**
 * POST /api/notifications/webhooks/:id
 * Perform webhook actions: test or unpause
 *
 * Query params:
 * - action: 'test' | 'unpause'
 */
export const POST: RequestHandler = async ({ params, url }) => {
  try {
    // TODO: Get actual user ID from session when auth is implemented
    const userId = 'demo-user';
    const { id } = params;

    const action = url.searchParams.get('action');

    if (action === 'test') {
      const result = await webhookDispatcher.testWebhook(userId, id);
      return json(result);
    }

    if (action === 'unpause') {
      const webhook = await webhookDispatcher.unpauseWebhook(userId, id);
      return json(webhook);
    }

    return json(
      { message: 'Invalid action. Use "test" or "unpause"' },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to perform action';
    return json({ message }, { status: 500 });
  }
};
