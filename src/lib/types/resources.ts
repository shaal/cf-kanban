/**
 * GAP-3.1.2: Resource Allocation Types
 *
 * Type definitions for project resource limits and allocation dashboard.
 */

/**
 * Resource limits configurable per project
 * Stored in Project.settings.resourceLimits
 */
export interface ProjectResourceLimits {
	/** Maximum CPU cores allocated (0 = unlimited) */
	maxCpu: number;
	/** Maximum memory in MB (0 = unlimited) */
	maxMemory: number;
	/** Maximum concurrent agents (0 = unlimited) */
	maxAgents: number;
	/** Maximum concurrent swarms (default: 1) */
	maxSwarms?: number;
	/** API rate limit per hour (default: 1000) */
	apiRateLimit?: number;
}

/**
 * Current resource usage for a project
 */
export interface ProjectResourceUsage {
	/** Currently used CPU cores */
	currentCpu: number;
	/** Currently used memory in MB */
	currentMemory: number;
	/** Currently active agents */
	currentAgents: number;
	/** Currently running swarms */
	currentSwarms: number;
	/** API calls in current hour */
	currentApiCalls: number;
	/** Last updated timestamp */
	lastUpdated: number;
}

/**
 * Resource allocation status with percentages
 */
export interface ResourceAllocationStatus {
	limits: ProjectResourceLimits;
	usage: ProjectResourceUsage;
	percentages: {
		cpu: number;
		memory: number;
		agents: number;
		swarms: number;
		apiCalls: number;
	};
	status: ResourceHealthStatus;
}

/**
 * Health status for resources
 */
export type ResourceHealthStatus = 'healthy' | 'warning' | 'critical';

/**
 * Resource limit update request
 */
export interface UpdateResourceLimitsRequest {
	projectId: string;
	limits: Partial<ProjectResourceLimits>;
}

/**
 * Resource limit validation result
 */
export interface ResourceLimitValidation {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

/**
 * Default resource limits for new projects
 */
export const DEFAULT_PROJECT_RESOURCE_LIMITS: ProjectResourceLimits = {
	maxCpu: 4,
	maxMemory: 4096,
	maxAgents: 5,
	maxSwarms: 1,
	apiRateLimit: 1000
};

/**
 * Maximum allowed limits (for validation)
 */
export const MAX_RESOURCE_LIMITS: ProjectResourceLimits = {
	maxCpu: 32,
	maxMemory: 65536, // 64GB
	maxAgents: 200,
	maxSwarms: 50,
	apiRateLimit: 100000
};

/**
 * Minimum allowed limits (for validation)
 */
export const MIN_RESOURCE_LIMITS: ProjectResourceLimits = {
	maxCpu: 1,
	maxMemory: 512,
	maxAgents: 1,
	maxSwarms: 1,
	apiRateLimit: 100
};

/**
 * Validate resource limits
 */
export function validateResourceLimits(limits: Partial<ProjectResourceLimits>): ResourceLimitValidation {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (limits.maxCpu !== undefined) {
		if (limits.maxCpu < MIN_RESOURCE_LIMITS.maxCpu) {
			errors.push(`CPU limit must be at least ${MIN_RESOURCE_LIMITS.maxCpu}`);
		}
		if (limits.maxCpu > MAX_RESOURCE_LIMITS.maxCpu) {
			errors.push(`CPU limit cannot exceed ${MAX_RESOURCE_LIMITS.maxCpu}`);
		}
	}

	if (limits.maxMemory !== undefined) {
		if (limits.maxMemory < MIN_RESOURCE_LIMITS.maxMemory) {
			errors.push(`Memory limit must be at least ${MIN_RESOURCE_LIMITS.maxMemory}MB`);
		}
		if (limits.maxMemory > MAX_RESOURCE_LIMITS.maxMemory) {
			errors.push(`Memory limit cannot exceed ${MAX_RESOURCE_LIMITS.maxMemory}MB`);
		}
	}

	if (limits.maxAgents !== undefined) {
		if (limits.maxAgents < MIN_RESOURCE_LIMITS.maxAgents) {
			errors.push(`Agent limit must be at least ${MIN_RESOURCE_LIMITS.maxAgents}`);
		}
		if (limits.maxAgents > MAX_RESOURCE_LIMITS.maxAgents) {
			errors.push(`Agent limit cannot exceed ${MAX_RESOURCE_LIMITS.maxAgents}`);
		}
		if (limits.maxAgents > 50) {
			warnings.push('High agent counts may impact performance');
		}
	}

	if (limits.maxSwarms !== undefined) {
		if (limits.maxSwarms < MIN_RESOURCE_LIMITS.maxSwarms!) {
			errors.push(`Swarm limit must be at least ${MIN_RESOURCE_LIMITS.maxSwarms}`);
		}
		if (limits.maxSwarms > MAX_RESOURCE_LIMITS.maxSwarms!) {
			errors.push(`Swarm limit cannot exceed ${MAX_RESOURCE_LIMITS.maxSwarms}`);
		}
	}

	if (limits.apiRateLimit !== undefined) {
		if (limits.apiRateLimit < MIN_RESOURCE_LIMITS.apiRateLimit!) {
			errors.push(`API rate limit must be at least ${MIN_RESOURCE_LIMITS.apiRateLimit}`);
		}
		if (limits.apiRateLimit > MAX_RESOURCE_LIMITS.apiRateLimit!) {
			errors.push(`API rate limit cannot exceed ${MAX_RESOURCE_LIMITS.apiRateLimit}`);
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}

/**
 * Get resource health status based on percentage
 */
export function getResourceHealthStatus(percentage: number): ResourceHealthStatus {
	if (percentage >= 90) {
		return 'critical';
	} else if (percentage >= 70) {
		return 'warning';
	}
	return 'healthy';
}

/**
 * Calculate overall resource status
 */
export function calculateOverallStatus(percentages: {
	cpu: number;
	memory: number;
	agents: number;
	swarms: number;
	apiCalls: number;
}): ResourceHealthStatus {
	const maxPercentage = Math.max(
		percentages.cpu,
		percentages.memory,
		percentages.agents,
		percentages.swarms,
		percentages.apiCalls
	);
	return getResourceHealthStatus(maxPercentage);
}

/**
 * Format memory value for display
 */
export function formatMemory(mb: number): string {
	if (mb >= 1024) {
		return `${(mb / 1024).toFixed(1)}GB`;
	}
	return `${mb}MB`;
}
