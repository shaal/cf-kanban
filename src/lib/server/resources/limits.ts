/**
 * TASK-105: Resource Limits
 *
 * Defines resource limits per project/user including:
 * - Max agents per project
 * - Max concurrent swarms
 * - Storage quotas per project
 * - API call limits
 * - WebSocket connection limits
 */

import { getRedisClient } from '$lib/server/redis';

/**
 * Resource limits configuration
 */
export interface ResourceLimits {
	/** Maximum agents allowed per project */
	maxAgentsPerProject: number;
	/** Maximum concurrent swarms per project */
	maxConcurrentSwarms: number;
	/** Storage quota in MB per project */
	storageQuotaMB: number;
	/** Maximum API calls per hour */
	maxApiCallsPerHour: number;
	/** Maximum WebSocket connections per project */
	maxWebSocketConnections: number;
}

/**
 * Resource tiers for different subscription levels
 */
export enum ResourceTier {
	FREE = 'free',
	STARTER = 'starter',
	PRO = 'pro',
	ENTERPRISE = 'enterprise'
}

/**
 * Result of a limit check
 */
export interface LimitCheckResult {
	/** Whether the limit is exceeded */
	exceeded: boolean;
	/** Current usage value */
	current: number;
	/** Maximum allowed value */
	limit: number;
	/** Remaining capacity */
	remaining: number;
	/** Human-readable message */
	message: string;
	/** Resource type checked */
	resourceType: ResourceType;
}

/**
 * Types of resources that can be limited
 */
export type ResourceType = 'agents' | 'swarms' | 'storage' | 'apiCalls' | 'websockets';

// Cache key prefixes
const PROJECT_LIMITS_PREFIX = 'resource-limits:project:';
const USER_LIMITS_PREFIX = 'resource-limits:user:';

/**
 * Default resource limits (FREE tier baseline)
 */
export const DEFAULT_RESOURCE_LIMITS: ResourceLimits = {
	maxAgentsPerProject: 5,
	maxConcurrentSwarms: 1,
	storageQuotaMB: 100,
	maxApiCallsPerHour: 1000,
	maxWebSocketConnections: 10
};

/**
 * Limits per tier
 */
export const TIER_LIMITS: Record<ResourceTier, ResourceLimits> = {
	[ResourceTier.FREE]: {
		maxAgentsPerProject: 5,
		maxConcurrentSwarms: 1,
		storageQuotaMB: 100,
		maxApiCallsPerHour: 1000,
		maxWebSocketConnections: 10
	},
	[ResourceTier.STARTER]: {
		maxAgentsPerProject: 15,
		maxConcurrentSwarms: 3,
		storageQuotaMB: 500,
		maxApiCallsPerHour: 5000,
		maxWebSocketConnections: 25
	},
	[ResourceTier.PRO]: {
		maxAgentsPerProject: 50,
		maxConcurrentSwarms: 10,
		storageQuotaMB: 2000,
		maxApiCallsPerHour: 20000,
		maxWebSocketConnections: 100
	},
	[ResourceTier.ENTERPRISE]: {
		maxAgentsPerProject: 200,
		maxConcurrentSwarms: 50,
		storageQuotaMB: 10000,
		maxApiCallsPerHour: 100000,
		maxWebSocketConnections: 500
	}
};

/**
 * Get resource limits for a project
 *
 * @param projectId - The project ID
 * @returns ResourceLimits for the project
 */
export async function getProjectLimits(projectId: string): Promise<ResourceLimits> {
	const client = getRedisClient();
	const key = `${PROJECT_LIMITS_PREFIX}${projectId}`;

	try {
		const cached = await client.get(key);
		if (cached) {
			return JSON.parse(cached) as ResourceLimits;
		}
	} catch {
		// Fall through to defaults
	}

	return DEFAULT_RESOURCE_LIMITS;
}

/**
 * Set resource limits for a project
 *
 * @param projectId - The project ID
 * @param limits - The limits to set
 */
export async function setProjectLimits(projectId: string, limits: ResourceLimits): Promise<void> {
	const client = getRedisClient();
	const key = `${PROJECT_LIMITS_PREFIX}${projectId}`;
	await client.set(key, JSON.stringify(limits));
}

/**
 * Get resource limits for a user
 *
 * @param userId - The user ID
 * @returns ResourceLimits for the user
 */
export async function getUserLimits(userId: string): Promise<ResourceLimits> {
	const client = getRedisClient();
	const key = `${USER_LIMITS_PREFIX}${userId}`;

	try {
		const cached = await client.get(key);
		if (cached) {
			return JSON.parse(cached) as ResourceLimits;
		}
	} catch {
		// Fall through to defaults
	}

	return DEFAULT_RESOURCE_LIMITS;
}

/**
 * Set user limits based on tier
 *
 * @param userId - The user ID
 * @param tier - The resource tier
 */
export async function setUserTier(userId: string, tier: ResourceTier): Promise<void> {
	const client = getRedisClient();
	const key = `${USER_LIMITS_PREFIX}${userId}`;
	const limits = TIER_LIMITS[tier];
	await client.set(key, JSON.stringify(limits));
}

/**
 * Set custom limits for a user
 *
 * @param userId - The user ID
 * @param limits - The custom limits
 */
export async function setUserLimits(userId: string, limits: ResourceLimits): Promise<void> {
	const client = getRedisClient();
	const key = `${USER_LIMITS_PREFIX}${userId}`;
	await client.set(key, JSON.stringify(limits));
}

/**
 * Get the limit value for a specific resource type
 */
function getLimitForType(limits: ResourceLimits, resourceType: ResourceType): number {
	switch (resourceType) {
		case 'agents':
			return limits.maxAgentsPerProject;
		case 'swarms':
			return limits.maxConcurrentSwarms;
		case 'storage':
			return limits.storageQuotaMB;
		case 'apiCalls':
			return limits.maxApiCallsPerHour;
		case 'websockets':
			return limits.maxWebSocketConnections;
		default:
			return 0;
	}
}

/**
 * Get human-readable name for resource type
 */
function getResourceTypeName(resourceType: ResourceType): string {
	switch (resourceType) {
		case 'agents':
			return 'agents per project';
		case 'swarms':
			return 'concurrent swarms';
		case 'storage':
			return 'storage (MB)';
		case 'apiCalls':
			return 'API calls per hour';
		case 'websockets':
			return 'WebSocket connections';
		default:
			return resourceType;
	}
}

/**
 * Check if a resource limit is exceeded for a project
 *
 * @param projectId - The project ID
 * @param resourceType - The type of resource to check
 * @param currentValue - The current usage value
 * @returns LimitCheckResult with exceeded status and details
 */
export async function checkLimitExceeded(
	projectId: string,
	resourceType: ResourceType,
	currentValue: number
): Promise<LimitCheckResult> {
	const limits = await getProjectLimits(projectId);
	const limit = getLimitForType(limits, resourceType);
	const exceeded = currentValue >= limit;
	const remaining = Math.max(0, limit - currentValue);
	const resourceName = getResourceTypeName(resourceType);

	let message: string;
	if (exceeded) {
		message = `Resource limit exceeded: ${currentValue}/${limit} ${resourceName}. Upgrade your plan to increase limits.`;
	} else {
		message = `Resource usage: ${currentValue}/${limit} ${resourceName}. ${remaining} remaining.`;
	}

	return {
		exceeded,
		current: currentValue,
		limit,
		remaining,
		message,
		resourceType
	};
}

/**
 * Check multiple resource limits at once
 *
 * @param projectId - The project ID
 * @param usage - Current usage for each resource type
 * @returns Array of LimitCheckResult for each resource
 */
export async function checkAllLimits(
	projectId: string,
	usage: Partial<Record<ResourceType, number>>
): Promise<LimitCheckResult[]> {
	const results: LimitCheckResult[] = [];

	for (const [resourceType, currentValue] of Object.entries(usage)) {
		if (currentValue !== undefined) {
			const result = await checkLimitExceeded(
				projectId,
				resourceType as ResourceType,
				currentValue
			);
			results.push(result);
		}
	}

	return results;
}

/**
 * Check if any limits are exceeded
 *
 * @param projectId - The project ID
 * @param usage - Current usage for each resource type
 * @returns True if any limit is exceeded
 */
export async function hasAnyLimitExceeded(
	projectId: string,
	usage: Partial<Record<ResourceType, number>>
): Promise<boolean> {
	const results = await checkAllLimits(projectId, usage);
	return results.some((result) => result.exceeded);
}

/**
 * Get effective limits (combines user tier limits with project overrides)
 *
 * @param projectId - The project ID
 * @param userId - The user ID (owner)
 * @returns Combined resource limits
 */
export async function getEffectiveLimits(
	projectId: string,
	userId: string
): Promise<ResourceLimits> {
	const userLimits = await getUserLimits(userId);
	const projectLimits = await getProjectLimits(projectId);

	// Project limits can only be equal or lower than user limits
	return {
		maxAgentsPerProject: Math.min(userLimits.maxAgentsPerProject, projectLimits.maxAgentsPerProject),
		maxConcurrentSwarms: Math.min(userLimits.maxConcurrentSwarms, projectLimits.maxConcurrentSwarms),
		storageQuotaMB: Math.min(userLimits.storageQuotaMB, projectLimits.storageQuotaMB),
		maxApiCallsPerHour: Math.min(userLimits.maxApiCallsPerHour, projectLimits.maxApiCallsPerHour),
		maxWebSocketConnections: Math.min(
			userLimits.maxWebSocketConnections,
			projectLimits.maxWebSocketConnections
		)
	};
}

/**
 * Delete project limits (revert to defaults)
 *
 * @param projectId - The project ID
 */
export async function deleteProjectLimits(projectId: string): Promise<void> {
	const client = getRedisClient();
	const key = `${PROJECT_LIMITS_PREFIX}${projectId}`;
	await client.del(key);
}

/**
 * Delete user limits (revert to defaults)
 *
 * @param userId - The user ID
 */
export async function deleteUserLimits(userId: string): Promise<void> {
	const client = getRedisClient();
	const key = `${USER_LIMITS_PREFIX}${userId}`;
	await client.del(key);
}
