/**
 * TASK-103: System Settings API
 *
 * PUT /api/admin/settings - Update setting
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { settingsService } from '$lib/server/admin/settings-service';

export const PUT: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { key, value, description, category, isSensitive } = body;

    if (!key) {
      return json({ message: 'Setting key is required' }, { status: 400 });
    }

    // TODO: Get actual user ID from session when auth is implemented
    const updaterId = 'system';

    const setting = await settingsService.updateSetting(
      { key, value, description, category, isSensitive },
      updaterId,
      {
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      }
    );

    return json(setting);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update setting';
    return json({ message }, { status: 400 });
  }
};
