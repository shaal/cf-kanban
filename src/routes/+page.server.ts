/**
 * TASK-019: Add Project Selector/Dashboard
 *
 * Server load function and form actions for the dashboard.
 */
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/prisma';
import { redirect, fail } from '@sveltejs/kit';

/**
 * Load all projects with ticket counts
 */
export const load: PageServerLoad = async () => {
  const projects = await prisma.project.findMany({
    include: {
      _count: { select: { tickets: true } }
    },
    orderBy: { updatedAt: 'desc' }
  });

  return { projects };
};

/**
 * Form actions for creating projects
 * AMENDMENT-001: Added workspace path handling
 */
export const actions: Actions = {
  /**
   * Create a new project and redirect to it
   */
  createProject: async ({ request }) => {
    const formData = await request.formData();
    const name = formData.get('name');
    const description = formData.get('description');
    const workspacePath = formData.get('workspacePath');

    // AMENDMENT-001: Validate workspace path (required)
    if (!workspacePath || typeof workspacePath !== 'string' || workspacePath.trim().length === 0) {
      return fail(400, {
        error: 'Codebase folder path is required. This is where Claude Code will operate.',
        name: name as string,
        description: description as string,
        workspacePath: workspacePath as string
      });
    }

    // Validate that workspace path looks like an absolute path
    const trimmedPath = workspacePath.trim();
    if (!trimmedPath.startsWith('/') && !trimmedPath.match(/^[A-Za-z]:\\/)) {
      return fail(400, {
        error: 'Codebase folder must be an absolute path (e.g., /Users/dev/my-project or C:\\Projects\\my-app)',
        name: name as string,
        description: description as string,
        workspacePath: workspacePath as string
      });
    }

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return fail(400, {
        error: 'Project name is required',
        name: name as string,
        description: description as string,
        workspacePath: workspacePath as string
      });
    }

    try {
      const project = await prisma.project.create({
        data: {
          name: name.trim(),
          description: description && typeof description === 'string'
            ? description.trim() || null
            : null,
          workspacePath: trimmedPath // AMENDMENT-001: Save workspace path
        }
      });

      throw redirect(303, `/projects/${project.id}`);
    } catch (err) {
      // Re-throw redirects
      if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
        throw err;
      }

      return fail(500, {
        error: 'Failed to create project',
        name: name as string,
        description: description as string,
        workspacePath: workspacePath as string
      });
    }
  }
};
