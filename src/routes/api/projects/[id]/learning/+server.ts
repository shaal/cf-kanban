/**
 * GAP-3.1.3: Project Learning Preferences API
 *
 * GET /api/projects/[id]/learning - Get learning config
 * PUT /api/projects/[id]/learning - Update learning config
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { settingsService } from '$lib/server/admin/settings-service';
import { prisma } from '$lib/server/prisma';
import type { LearningConfig } from '$lib/types/admin';

/**
 * Get learning preferences for a project
 */
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id: projectId } = params;

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return json({ message: 'Project not found' }, { status: 404 });
    }

    const config = await settingsService.getProjectLearningConfig(projectId);

    return json({
      projectId,
      projectName: project.name,
      config
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get learning preferences';
    return json({ message }, { status: 500 });
  }
};

/**
 * Update learning preferences for a project
 */
export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const { id: projectId } = params;
    const body = await request.json() as Partial<LearningConfig>;

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return json({ message: 'Project not found' }, { status: 404 });
    }

    // Validate input
    if (body.shareGlobally !== undefined && typeof body.shareGlobally !== 'boolean') {
      return json({ message: 'shareGlobally must be a boolean' }, { status: 400 });
    }

    if (body.allowTransfer !== undefined && typeof body.allowTransfer !== 'boolean') {
      return json({ message: 'allowTransfer must be a boolean' }, { status: 400 });
    }

    if (body.retentionDays !== undefined && body.retentionDays !== null) {
      if (typeof body.retentionDays !== 'number' || body.retentionDays < 1) {
        return json({ message: 'retentionDays must be a positive number or null' }, { status: 400 });
      }
    }

    if (body.sharedWithProjects !== undefined) {
      if (!Array.isArray(body.sharedWithProjects)) {
        return json({ message: 'sharedWithProjects must be an array of project IDs' }, { status: 400 });
      }
      // Validate that all project IDs exist
      if (body.sharedWithProjects.length > 0) {
        const validProjects = await prisma.project.findMany({
          where: { id: { in: body.sharedWithProjects } },
          select: { id: true }
        });
        const validIds = new Set(validProjects.map(p => p.id));
        const invalidIds = body.sharedWithProjects.filter(id => !validIds.has(id));
        if (invalidIds.length > 0) {
          return json({
            message: `Invalid project IDs: ${invalidIds.join(', ')}`
          }, { status: 400 });
        }
      }
    }

    // TODO: Get actual user ID from session when auth is implemented
    const updaterId = 'system';

    const updatedConfig = await settingsService.updateProjectLearningConfig(
      projectId,
      body,
      updaterId,
      {
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      }
    );

    return json({
      projectId,
      projectName: project.name,
      config: updatedConfig
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update learning preferences';
    return json({ message }, { status: 500 });
  }
};
