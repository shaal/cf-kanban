/**
 * GAP-3.1.1: Single Template API
 *
 * Get a specific project template by ID or slug.
 */
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

/**
 * GET /api/templates/:id
 * Get a single template by ID or slug
 */
export const GET: RequestHandler = async ({ params }) => {
	const { id } = params;

	// Try to find by ID first, then by slug
	const template = await prisma.projectTemplate.findFirst({
		where: {
			OR: [{ id }, { slug: id }]
		},
		select: {
			id: true,
			slug: true,
			name: true,
			description: true,
			category: true,
			icon: true,
			swarmConfig: true,
			isSystem: true,
			isActive: true,
			sortOrder: true,
			_count: {
				select: { projects: true }
			}
		}
	});

	if (!template) {
		throw error(404, { message: 'Template not found' });
	}

	return json(template);
};
