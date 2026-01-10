/**
 * TASK-019: Add Project Selector/Dashboard
 *
 * Server load function and form actions for the dashboard.
 */
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/prisma';
import { redirect, fail } from '@sveltejs/kit';

/**
 * Load all projects with ticket counts and available templates
 * GAP-3.1.1: Added templates for project creation
 */
export const load: PageServerLoad = async () => {
  const [projects, templates] = await Promise.all([
    prisma.project.findMany({
      include: {
        _count: { select: { tickets: true } },
        template: {
          select: { id: true, name: true, slug: true, icon: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    }),
    prisma.projectTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        icon: true,
        swarmConfig: true
      }
    })
  ]);

  // Group templates by category
  const templatesByCategory = templates.reduce(
    (acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = [];
      }
      acc[template.category].push(template);
      return acc;
    },
    {} as Record<string, typeof templates>
  );

  return { projects, templates, templatesByCategory };
};

/**
 * Form actions for creating projects
 * AMENDMENT-001: Added workspace path handling
 * GAP-3.1.1: Added template selection support
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
    const templateId = formData.get('templateId');

    // AMENDMENT-001: Validate workspace path (required)
    if (!workspacePath || typeof workspacePath !== 'string' || workspacePath.trim().length === 0) {
      return fail(400, {
        error: 'Codebase folder path is required. This is where Claude Code will operate.',
        name: name as string,
        description: description as string,
        workspacePath: workspacePath as string,
        templateId: templateId as string
      });
    }

    // Validate that workspace path looks like an absolute path
    const trimmedPath = workspacePath.trim();
    if (!trimmedPath.startsWith('/') && !trimmedPath.match(/^[A-Za-z]:\\/)) {
      return fail(400, {
        error: 'Codebase folder must be an absolute path (e.g., /Users/dev/my-project or C:\\Projects\\my-app)',
        name: name as string,
        description: description as string,
        workspacePath: workspacePath as string,
        templateId: templateId as string
      });
    }

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return fail(400, {
        error: 'Project name is required',
        name: name as string,
        description: description as string,
        workspacePath: workspacePath as string,
        templateId: templateId as string
      });
    }

    // GAP-3.1.1: Validate template if provided
    let validTemplateId: string | null = null;
    if (templateId && typeof templateId === 'string' && templateId.trim().length > 0) {
      const template = await prisma.projectTemplate.findUnique({
        where: { id: templateId.trim() },
        select: { id: true, swarmConfig: true }
      });

      if (!template) {
        return fail(400, {
          error: 'Selected template not found',
          name: name as string,
          description: description as string,
          workspacePath: workspacePath as string,
          templateId: templateId as string
        });
      }

      validTemplateId = template.id;
    }

    try {
      const project = await prisma.project.create({
        data: {
          name: name.trim(),
          description: description && typeof description === 'string'
            ? description.trim() || null
            : null,
          workspacePath: trimmedPath, // AMENDMENT-001: Save workspace path
          templateId: validTemplateId // GAP-3.1.1: Link to template
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
        workspacePath: workspacePath as string,
        templateId: templateId as string
      });
    }
  }
};
