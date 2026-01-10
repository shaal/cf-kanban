/**
 * TASK-101: User Management API
 *
 * PATCH /api/admin/users/[id] - Update user
 * DELETE /api/admin/users/[id] - Delete user
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { userService } from '$lib/server/admin/user-service';

export const PATCH: RequestHandler = async ({ params, request }) => {
  try {
    const body = await request.json();
    const { name, role, isActive } = body;

    // TODO: Get actual user ID from session when auth is implemented
    const updaterId = 'system';

    const user = await userService.updateUser(
      params.id,
      { name, role, isActive },
      updaterId,
      {
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      }
    );

    return json(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update user';
    return json({ message }, { status: 400 });
  }
};

export const DELETE: RequestHandler = async ({ params, request }) => {
  try {
    // TODO: Get actual user ID from session when auth is implemented
    const deleterId = 'system';

    await userService.deleteUser(params.id, deleterId, {
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    });

    return json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete user';
    return json({ message }, { status: 400 });
  }
};
