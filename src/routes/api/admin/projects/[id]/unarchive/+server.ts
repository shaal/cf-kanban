/**
 * TASK-102: Project Unarchive API
 *
 * POST /api/admin/projects/[id]/unarchive
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { projectService } from '$lib/server/admin/project-service';

export const POST: RequestHandler = async ({ params, request }) => {
  try {
    // TODO: Get actual user ID from session when auth is implemented
    const unarchivedById = 'system';

    await projectService.unarchiveProject(params.id, unarchivedById, {
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    });

    return json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to unarchive project';
    return json({ message }, { status: 400 });
  }
};
