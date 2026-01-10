import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import {
	type ProjectResourceLimits,
	type ProjectResourceUsage,
	DEFAULT_PROJECT_RESOURCE_LIMITS
} from '$lib/types/resources';
import { getActiveAgentCount, getApiCallCount } from '$lib/server/resources/usage';

/**
 * GAP-3.1.2: Project Settings Page Data
 *
 * Loads project settings including resource limits and current usage.
 */
export const load: PageServerLoad = async ({ params }) => {
	const project = await prisma.project.findUnique({
		where: { id: params.projectId },
		select: {
			id: true,
			name: true,
			description: true,
			settings: true,
			workspacePath: true,
			templateId: true,
			template: {
				select: {
					id: true,
					name: true,
					slug: true
				}
			}
		}
	});

	if (!project) {
		throw error(404, 'Project not found');
	}

	// Extract resource limits from settings
	const settings = project.settings as Record<string, unknown> || {};
	const limits: ProjectResourceLimits = {
		...DEFAULT_PROJECT_RESOURCE_LIMITS,
		...(settings.resourceLimits as Partial<ProjectResourceLimits> || {})
	};

	// Get current usage
	let currentAgents = 0;
	let currentApiCalls = 0;

	try {
		currentAgents = await getActiveAgentCount(params.projectId);
		currentApiCalls = await getApiCallCount(params.projectId);
	} catch {
		// Redis might not be available
		currentAgents = 0;
		currentApiCalls = 0;
	}

	const usage: ProjectResourceUsage = {
		currentCpu: 0,
		currentMemory: 0,
		currentAgents,
		currentSwarms: 0,
		currentApiCalls,
		lastUpdated: Date.now()
	};

	return {
		project: {
			id: project.id,
			name: project.name,
			description: project.description,
			workspacePath: project.workspacePath,
			templateId: project.templateId,
			template: project.template
		},
		resourceLimits: limits,
		resourceUsage: usage
	};
};
