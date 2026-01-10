import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

/**
 * GET /api/projects/:id
 * Get a single project with its tickets
 */
export const GET: RequestHandler = async ({ params }) => {
	const project = await prisma.project.findUnique({
		where: { id: params.id },
		include: {
			tickets: {
				orderBy: { position: 'asc' }
			}
		}
	});

	if (!project) {
		throw error(404, 'Project not found');
	}

	return json(project);
};

/**
 * PUT /api/projects/:id
 * Update a project's name, description, or settings
 */
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();
		const { name, description, settings } = body;

		// Check if project exists
		const existingProject = await prisma.project.findUnique({
			where: { id: params.id }
		});

		if (!existingProject) {
			throw error(404, 'Project not found');
		}

		// Build update data
		const updateData: Record<string, unknown> = {};
		
		if (name !== undefined) {
			if (typeof name !== 'string' || name.trim().length === 0) {
				return json(
					{ error: 'Name must be a non-empty string' },
					{ status: 400 }
				);
			}
			updateData.name = name.trim();
		}
		
		if (description !== undefined) {
			updateData.description = description?.trim() || null;
		}
		
		if (settings !== undefined) {
			updateData.settings = settings;
		}

		const project = await prisma.project.update({
			where: { id: params.id },
			data: updateData
		});

		return json(project);
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error updating project:', err);
		return json({ error: 'Failed to update project' }, { status: 500 });
	}
};

/**
 * DELETE /api/projects/:id
 * Delete a project and all its tickets (cascade)
 */
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		// Check if project exists
		const existingProject = await prisma.project.findUnique({
			where: { id: params.id }
		});

		if (!existingProject) {
			throw error(404, 'Project not found');
		}

		await prisma.project.delete({
			where: { id: params.id }
		});

		return new Response(null, { status: 204 });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error deleting project:', err);
		return json({ error: 'Failed to delete project' }, { status: 500 });
	}
};
