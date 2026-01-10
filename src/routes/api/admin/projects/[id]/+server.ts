/**
 * TASK-102: Project Management API
 *
 * DELETE /api/admin/projects/[id] - Delete project
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { projectService } from '$lib/server/admin/project-service';

export const DELETE: RequestHandler = async ({ params, request }) => {
  try {
    // TODO: Get actual user ID from session when auth is implemented
    const deletedById = 'system';

    await projectService.deleteProject(params.id, deletedById, {
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    });

    return json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete project';
    return json({ message }, { status: 400 });
  }
};
