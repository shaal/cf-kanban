/**
 * TASK-101: User Invitation API
 *
 * POST /api/admin/users/invite
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { userService } from '$lib/server/admin/user-service';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, name, role, projectIds } = body;

    if (!email) {
      return json({ message: 'Email is required' }, { status: 400 });
    }

    // TODO: Get actual user ID from session when auth is implemented
    const inviterId = 'system';

    const user = await userService.inviteUser(
      { email, name, role, projectIds },
      inviterId,
      {
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      }
    );

    return json(user, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to invite user';
    return json({ message }, { status: 400 });
  }
};
