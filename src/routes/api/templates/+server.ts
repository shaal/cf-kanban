/**
 * GAP-3.1.1: Project Templates API
 *
 * Provides endpoints for listing and retrieving project templates.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

/**
 * GET /api/templates
 * List all active project templates grouped by category
 */
export const GET: RequestHandler = async ({ url }) => {
	const category = url.searchParams.get('category');
	const includeInactive = url.searchParams.get('includeInactive') === 'true';

	const where: { isActive?: boolean; category?: string } = {};

	if (!includeInactive) {
		where.isActive = true;
	}

	if (category) {
		where.category = category;
	}

	const templates = await prisma.projectTemplate.findMany({
		where,
		orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
		select: {
			id: true,
			slug: true,
			name: true,
			description: true,
			category: true,
			icon: true,
			swarmConfig: true,
			isSystem: true,
			sortOrder: true
		}
	});

	// Group templates by category for easier UI consumption
	const grouped = templates.reduce(
		(acc, template) => {
			if (!acc[template.category]) {
				acc[template.category] = [];
			}
			acc[template.category].push(template);
			return acc;
		},
		{} as Record<string, typeof templates>
	);

	return json({
		templates,
		grouped,
		categories: Object.keys(grouped).sort()
	});
};
