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
 */
export const actions: Actions = {
  /**
   * Create a new project and redirect to it
   */
  createProject: async ({ request }) => {
    const formData = await request.formData();
    const name = formData.get('name');
    const description = formData.get('description');

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return fail(400, {
        error: 'Project name is required',
        name: name as string,
        description: description as string
      });
    }

    try {
      const project = await prisma.project.create({
        data: {
          name: name.trim(),
          description: description && typeof description === 'string'
            ? description.trim() || null
            : null
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
        description: description as string
      });
    }
  }
};
