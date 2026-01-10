/**
 * GAP-3.1.2: Resource Allocation Service
 *
 * Enforces resource limits during swarm spawn and agent creation.
 * Integrates with project settings and usage tracking.
 */

import { prisma } from '$lib/server/prisma';
import {
	type ProjectResourceLimits,
	type ResourceLimitValidation,
	DEFAULT_PROJECT_RESOURCE_LIMITS
} from '$lib/types/resources';
import { getActiveAgentCount, getApiCallCount } from './usage';

/**
 * Result of a resource limit check
 */
export interface ResourceCheckResult {
	allowed: boolean;
	reason?: string;
	currentUsage: {
		agents: number;
		swarms: number;
		cpu: number;
		memory: number;
		apiCalls: number;
	};
	limits: ProjectResourceLimits;
}

/**
 * Request to spawn agents
 */
export interface SpawnRequest {
	projectId: string;
	agentCount: number;
	estimatedCpuCores?: number;
	estimatedMemoryMB?: number;
}

/**
 * Get resource limits for a project
 */
export async function getProjectResourceLimits(projectId: string): Promise<ProjectResourceLimits> {
	const project = await prisma.project.findUnique({
		where: { id: projectId },
		select: { settings: true }
	});

	if (!project) {
		throw new Error(`Project ${projectId} not found`);
	}

	const settings = project.settings as Record<string, unknown> || {};
	const resourceLimits = settings.resourceLimits as Partial<ProjectResourceLimits> || {};

	return {
		...DEFAULT_PROJECT_RESOURCE_LIMITS,
		...resourceLimits
	};
}

/**
 * Check if spawning agents would exceed resource limits
 *
 * @param request - Spawn request details
 * @returns ResourceCheckResult indicating if spawn is allowed
 */
export async function checkSpawnLimits(request: SpawnRequest): Promise<ResourceCheckResult> {
	const { projectId, agentCount, estimatedCpuCores = 0, estimatedMemoryMB = 0 } = request;

	// Get project limits
	const limits = await getProjectResourceLimits(projectId);

	// Get current usage
	let currentAgents = 0;
	let currentApiCalls = 0;

	try {
		currentAgents = await getActiveAgentCount(projectId);
		currentApiCalls = await getApiCallCount(projectId);
	} catch {
		// Redis might not be available, use zero as fallback
		currentAgents = 0;
		currentApiCalls = 0;
	}

	const currentUsage = {
		agents: currentAgents,
		swarms: 0, // Would be populated from swarm tracking
		cpu: 0, // Would be populated from system monitoring
		memory: 0, // Would be populated from system monitoring
		apiCalls: currentApiCalls
	};

	// Check agent limit
	const newAgentCount = currentAgents + agentCount;
	if (limits.maxAgents > 0 && newAgentCount > limits.maxAgents) {
		return {
			allowed: false,
			reason: `Agent limit exceeded: requesting ${agentCount} agents would result in ${newAgentCount} total, but limit is ${limits.maxAgents}`,
			currentUsage,
			limits
		};
	}

	// Check CPU limit if provided
	if (estimatedCpuCores > 0 && limits.maxCpu > 0) {
		const newCpuUsage = currentUsage.cpu + estimatedCpuCores;
		if (newCpuUsage > limits.maxCpu) {
			return {
				allowed: false,
				reason: `CPU limit exceeded: estimated ${estimatedCpuCores} cores would exceed limit of ${limits.maxCpu}`,
				currentUsage,
				limits
			};
		}
	}

	// Check memory limit if provided
	if (estimatedMemoryMB > 0 && limits.maxMemory > 0) {
		const newMemoryUsage = currentUsage.memory + estimatedMemoryMB;
		if (newMemoryUsage > limits.maxMemory) {
			return {
				allowed: false,
				reason: `Memory limit exceeded: estimated ${estimatedMemoryMB}MB would exceed limit of ${limits.maxMemory}MB`,
				currentUsage,
				limits
			};
		}
	}

	return {
		allowed: true,
		currentUsage,
		limits
	};
}

/**
 * Check if spawning a swarm would exceed limits
 */
export async function checkSwarmLimits(
	projectId: string,
	maxAgents: number = 5
): Promise<ResourceCheckResult> {
	const limits = await getProjectResourceLimits(projectId);

	// Get current swarm count (would need swarm tracking service)
	const currentSwarms = 0; // Placeholder

	const currentUsage = {
		agents: 0,
		swarms: currentSwarms,
		cpu: 0,
		memory: 0,
		apiCalls: 0
	};

	try {
		currentUsage.agents = await getActiveAgentCount(projectId);
		currentUsage.apiCalls = await getApiCallCount(projectId);
	} catch {
		// Ignore Redis errors
	}

	// Check swarm limit
	if (limits.maxSwarms && limits.maxSwarms > 0 && currentSwarms >= limits.maxSwarms) {
		return {
			allowed: false,
			reason: `Swarm limit exceeded: already running ${currentSwarms} swarms, limit is ${limits.maxSwarms}`,
			currentUsage,
			limits
		};
	}

	// Check if swarm agents would exceed agent limit
	const potentialAgentCount = currentUsage.agents + maxAgents;
	if (limits.maxAgents > 0 && potentialAgentCount > limits.maxAgents) {
		return {
			allowed: false,
			reason: `Agent limit would be exceeded: swarm with ${maxAgents} agents plus ${currentUsage.agents} existing would exceed limit of ${limits.maxAgents}`,
			currentUsage,
			limits
		};
	}

	return {
		allowed: true,
		currentUsage,
		limits
	};
}

/**
 * Enforce limits and throw if exceeded
 */
export async function enforceSpawnLimits(request: SpawnRequest): Promise<void> {
	const result = await checkSpawnLimits(request);

	if (!result.allowed) {
		throw new ResourceLimitError(result.reason || 'Resource limit exceeded', result);
	}
}

/**
 * Enforce swarm limits and throw if exceeded
 */
export async function enforceSwarmLimits(projectId: string, maxAgents: number = 5): Promise<void> {
	const result = await checkSwarmLimits(projectId, maxAgents);

	if (!result.allowed) {
		throw new ResourceLimitError(result.reason || 'Swarm resource limit exceeded', result);
	}
}

/**
 * Custom error for resource limit violations
 */
export class ResourceLimitError extends Error {
	public readonly checkResult: ResourceCheckResult;

	constructor(message: string, checkResult: ResourceCheckResult) {
		super(message);
		this.name = 'ResourceLimitError';
		this.checkResult = checkResult;
	}
}

/**
 * Get remaining capacity for a project
 */
export async function getRemainingCapacity(projectId: string): Promise<{
	agents: number;
	swarms: number;
	cpu: number;
	memory: number;
}> {
	const limits = await getProjectResourceLimits(projectId);

	let currentAgents = 0;
	try {
		currentAgents = await getActiveAgentCount(projectId);
	} catch {
		// Ignore Redis errors
	}

	return {
		agents: Math.max(0, limits.maxAgents - currentAgents),
		swarms: limits.maxSwarms ? Math.max(0, limits.maxSwarms - 0) : Infinity,
		cpu: limits.maxCpu, // Full capacity available (no tracking yet)
		memory: limits.maxMemory // Full capacity available (no tracking yet)
	};
}

/**
 * Update resource limits for a project
 */
export async function updateProjectResourceLimits(
	projectId: string,
	newLimits: Partial<ProjectResourceLimits>
): Promise<ProjectResourceLimits> {
	const project = await prisma.project.findUnique({
		where: { id: projectId },
		select: { settings: true }
	});

	if (!project) {
		throw new Error(`Project ${projectId} not found`);
	}

	const settings = project.settings as Record<string, unknown> || {};
	const currentLimits = settings.resourceLimits as Partial<ProjectResourceLimits> || {};

	const updatedLimits: ProjectResourceLimits = {
		...DEFAULT_PROJECT_RESOURCE_LIMITS,
		...currentLimits,
		...newLimits
	};

	const newSettings = {
		...settings,
		resourceLimits: updatedLimits
	};

	await prisma.project.update({
		where: { id: projectId },
		data: {
			// Cast to satisfy Prisma's JSON type
			settings: JSON.parse(JSON.stringify(newSettings))
		}
	});

	return updatedLimits;
}
