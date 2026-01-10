/**
 * TASK-102: Project Archive API
 *
 * POST /api/admin/projects/[id]/archive
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { projectService } from '$lib/server/admin/project-service';

export const POST: RequestHandler = async ({ params, request }) => {
  try {
    // TODO: Get actual user ID from session when auth is implemented
    const archivedById = 'system';

    await projectService.archiveProject(params.id, archivedById, {
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    });

    return json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to archive project';
    return json({ message }, { status: 400 });
  }
};
