import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/prisma';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const { projectId } = params;

	const project = await prisma.project.findUnique({
		where: { id: projectId },
		include: {
			tickets: {
				orderBy: { position: 'asc' }
			}
		}
	});

	if (!project) {
		throw error(404, 'Project not found');
	}

	return {
		project,
		tickets: project.tickets
	};
};
