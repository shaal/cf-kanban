import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import {
	type ProjectResourceLimits,
	type ProjectResourceUsage,
	DEFAULT_PROJECT_RESOURCE_LIMITS,
	validateResourceLimits
} from '$lib/types/resources';
import { getActiveAgentCount, getApiCallCount } from '$lib/server/resources/usage';

/**
 * GAP-3.1.2: Resource Allocation API
 *
 * Endpoints for managing project resource limits and retrieving usage data.
 */

/**
 * GET /api/projects/:id/resources
 * Get resource limits and current usage for a project
 */
export const GET: RequestHandler = async ({ params }) => {
	const project = await prisma.project.findUnique({
		where: { id: params.id },
		select: { id: true, settings: true }
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
		currentAgents = await getActiveAgentCount(params.id);
		currentApiCalls = await getApiCallCount(params.id);
	} catch {
		// Redis might not be available in development
		currentAgents = 0;
		currentApiCalls = 0;
	}

	// Build usage object (some values would come from system monitoring)
	const usage: ProjectResourceUsage = {
		currentCpu: 0, // Would be populated from system monitoring
		currentMemory: 0, // Would be populated from system monitoring
		currentAgents,
		currentSwarms: 0, // Would be populated from swarm service
		currentApiCalls,
		lastUpdated: Date.now()
	};

	// Calculate percentages
	const percentages = {
		cpu: limits.maxCpu > 0 ? (usage.currentCpu / limits.maxCpu) * 100 : 0,
		memory: limits.maxMemory > 0 ? (usage.currentMemory / limits.maxMemory) * 100 : 0,
		agents: limits.maxAgents > 0 ? (usage.currentAgents / limits.maxAgents) * 100 : 0,
		swarms: (limits.maxSwarms || 1) > 0 ? (usage.currentSwarms / (limits.maxSwarms || 1)) * 100 : 0,
		apiCalls: (limits.apiRateLimit || 1000) > 0 ? (usage.currentApiCalls / (limits.apiRateLimit || 1000)) * 100 : 0
	};

	// Determine overall status
	const maxPercentage = Math.max(
		percentages.cpu,
		percentages.memory,
		percentages.agents,
		percentages.swarms,
		percentages.apiCalls
	);
	const status = maxPercentage >= 90 ? 'critical' : maxPercentage >= 70 ? 'warning' : 'healthy';

	return json({
		limits,
		usage,
		percentages,
		status
	});
};

/**
 * PUT /api/projects/:id/resources
 * Update resource limits for a project
 */
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();
		const { limits } = body as { limits: Partial<ProjectResourceLimits> };

		if (!limits) {
			return json({ error: 'Limits object is required' }, { status: 400 });
		}

		// Validate the limits
		const validation = validateResourceLimits(limits);
		if (!validation.valid) {
			return json({
				error: 'Invalid resource limits',
				details: validation.errors
			}, { status: 400 });
		}

		// Check if project exists
		const existingProject = await prisma.project.findUnique({
			where: { id: params.id },
			select: { id: true, settings: true }
		});

		if (!existingProject) {
			throw error(404, 'Project not found');
		}

		// Merge new limits with existing settings
		const currentSettings = existingProject.settings as Record<string, unknown> || {};
		const currentLimits = currentSettings.resourceLimits as Partial<ProjectResourceLimits> || {};

		const newLimits: ProjectResourceLimits = {
			...DEFAULT_PROJECT_RESOURCE_LIMITS,
			...currentLimits,
			...limits
		};

		const newSettings = {
			...currentSettings,
			resourceLimits: newLimits
		};

		// Update project settings - use JSON.parse/stringify to satisfy Prisma's JSON type
		await prisma.project.update({
			where: { id: params.id },
			data: { settings: JSON.parse(JSON.stringify(newSettings)) },
			select: { id: true, settings: true }
		});

		return json({
			success: true,
			limits: newLimits,
			warnings: validation.warnings
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error updating resource limits:', err);
		return json({ error: 'Failed to update resource limits' }, { status: 500 });
	}
};

/**
 * DELETE /api/projects/:id/resources
 * Reset resource limits to defaults
 */
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		// Check if project exists
		const existingProject = await prisma.project.findUnique({
			where: { id: params.id },
			select: { id: true, settings: true }
		});

		if (!existingProject) {
			throw error(404, 'Project not found');
		}

		// Remove resourceLimits from settings
		const currentSettings = existingProject.settings as Record<string, unknown> || {};
		const { resourceLimits, ...restSettings } = currentSettings;

		// Update project settings - use JSON.parse/stringify to satisfy Prisma's JSON type
		await prisma.project.update({
			where: { id: params.id },
			data: { settings: JSON.parse(JSON.stringify(restSettings)) }
		});

		return json({
			success: true,
			limits: DEFAULT_PROJECT_RESOURCE_LIMITS
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error resetting resource limits:', err);
		return json({ error: 'Failed to reset resource limits' }, { status: 500 });
	}
};
