import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

/**
 * GET /api/projects
 * List all projects ordered by updatedAt (most recent first)
 */
export const GET: RequestHandler = async () => {
	const projects = await prisma.project.findMany({
		orderBy: { updatedAt: 'desc' },
		include: {
			_count: {
				select: { tickets: true }
			}
		}
	});
	return json(projects);
};

/**
 * POST /api/projects
 * Create a new project with name and optional description
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { name, description } = body;

		// Validate required fields
		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			return json(
				{ error: 'Name is required and must be a non-empty string' },
				{ status: 400 }
			);
		}

		const project = await prisma.project.create({
			data: {
				name: name.trim(),
				description: description?.trim() || null
			}
		});

		return json(project, { status: 201 });
	} catch (error) {
		console.error('Error creating project:', error);
		return json({ error: 'Failed to create project' }, { status: 500 });
	}
};
