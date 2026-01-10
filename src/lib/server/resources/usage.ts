/**
 * TASK-106: Usage Tracking
 *
 * Tracks resource usage per project/user including:
 * - Agent hours used
 * - API calls per user/project
 * - Storage usage
 * - WebSocket connections
 * - Swarm executions
 */

import { getRedisClient } from '$lib/server/redis';

/**
 * Usage metrics for a project
 */
export interface UsageMetrics {
	/** Total agent hours used */
	agentHours: number;
	/** Total API calls made */
	apiCalls: number;
	/** Storage used in MB */
	storageUsedMB: number;
	/** Current active WebSocket connections */
	websocketConnections: number;
	/** Total swarm executions */
	swarmExecutions: number;
	/** Timestamp of metrics */
	timestamp: number;
}

/**
 * User-level usage aggregation
 */
export interface UserUsageMetrics {
	/** Total agent hours across all projects */
	totalAgentHours: number;
	/** Total API calls across all projects */
	totalApiCalls: number;
	/** Total storage used across all projects */
	totalStorageUsedMB: number;
	/** List of project IDs */
	projectIds: string[];
}

/**
 * Daily usage snapshot
 */
export interface DailyUsage {
	date: string;
	agentHours: number;
	apiCalls: number;
	storageUsedMB: number;
	swarmExecutions: number;
}

/**
 * Result of agent stop tracking
 */
export interface AgentStopResult {
	hoursUsed: number;
	agentId: string;
	projectId: string;
}

/**
 * Dashboard data structure
 */
export interface UsageDashboardData {
	projectId: string;
	current: UsageMetrics;
	limits?: {
		maxAgentsPerProject: number;
		maxApiCallsPerHour: number;
		storageQuotaMB: number;
	};
	percentages?: {
		agents: number;
		apiCalls: number;
		storage: number;
	};
	timestamp: number;
}

// Redis key prefixes
const AGENT_TRACKING_PREFIX = 'usage:agents:';
const API_TRACKING_PREFIX = 'usage:api:';
const API_USER_PREFIX = 'usage:api:user:';
const STORAGE_PREFIX = 'usage:storage:';
const WEBSOCKET_PREFIX = 'usage:websockets:';
const SUMMARY_PREFIX = 'usage:summary:';
const DAILY_PREFIX = 'usage:daily:';
const USER_USAGE_PREFIX = 'usage:user:';

// TTL for hourly API counters (2 hours to handle edge cases)
const HOURLY_TTL = 7200;

/**
 * Get the current hour bucket key for time-based tracking
 */
function getHourBucket(): string {
	const now = new Date();
	return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}`;
}

/**
 * Get the current day key for daily tracking
 */
function getDayKey(): string {
	const now = new Date();
	return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

// ============================================
// Agent Tracking
// ============================================

/**
 * Track when an agent starts
 *
 * @param projectId - The project ID
 * @param agentId - The agent ID
 */
export async function trackAgentStart(projectId: string, agentId: string): Promise<void> {
	const client = getRedisClient();
	const key = `${AGENT_TRACKING_PREFIX}${projectId}`;
	await client.hset(key, agentId, String(Date.now()));
}

/**
 * Track when an agent stops and calculate hours used
 *
 * @param projectId - The project ID
 * @param agentId - The agent ID
 * @returns AgentStopResult with hours used
 */
export async function trackAgentStop(projectId: string, agentId: string): Promise<AgentStopResult> {
	const client = getRedisClient();
	const key = `${AGENT_TRACKING_PREFIX}${projectId}`;

	const startTimeStr = await client.hget(key, agentId);

	if (!startTimeStr) {
		return { hoursUsed: 0, agentId, projectId };
	}

	const startTime = parseInt(startTimeStr, 10);
	const endTime = Date.now();
	const hoursUsed = (endTime - startTime) / (1000 * 60 * 60);

	// Remove from active tracking
	await client.hdel(key, agentId);

	// Add to cumulative hours
	const summaryKey = `${SUMMARY_PREFIX}${projectId}`;
	await client.hincrbyfloat(summaryKey, 'agentHours', hoursUsed);

	return { hoursUsed, agentId, projectId };
}

/**
 * Get count of currently active agents
 *
 * @param projectId - The project ID
 * @returns Number of active agents
 */
export async function getActiveAgentCount(projectId: string): Promise<number> {
	const client = getRedisClient();
	const key = `${AGENT_TRACKING_PREFIX}${projectId}`;
	const agents = await client.hgetall(key);
	return agents ? Object.keys(agents).length : 0;
}

// ============================================
// API Call Tracking
// ============================================

/**
 * Track an API call
 *
 * @param projectId - The project ID
 * @param userId - The user ID making the call
 */
export async function trackApiCall(projectId: string, userId: string): Promise<void> {
	const client = getRedisClient();
	const hourBucket = getHourBucket();

	// Track for project
	const projectKey = `${API_TRACKING_PREFIX}${projectId}:${hourBucket}`;
	await client.hincrby(projectKey, 'calls', 1);
	await client.expire(projectKey, HOURLY_TTL);

	// Track for user
	const userKey = `${API_USER_PREFIX}${userId}:${hourBucket}`;
	await client.hincrby(userKey, 'calls', 1);
	await client.expire(userKey, HOURLY_TTL);

	// Increment daily total
	const summaryKey = `${SUMMARY_PREFIX}${projectId}`;
	await client.hincrby(summaryKey, 'apiCalls', 1);
}

/**
 * Get current hour API call count for a project
 *
 * @param projectId - The project ID
 * @returns Number of API calls this hour
 */
export async function getApiCallCount(projectId: string): Promise<number> {
	const client = getRedisClient();
	const hourBucket = getHourBucket();
	const key = `${API_TRACKING_PREFIX}${projectId}:${hourBucket}`;

	const count = await client.hget(key, 'calls');
	return count ? parseInt(count, 10) : 0;
}

/**
 * Get current hour API call count for a user
 *
 * @param userId - The user ID
 * @returns Number of API calls this hour
 */
export async function getUserApiCallCount(userId: string): Promise<number> {
	const client = getRedisClient();
	const hourBucket = getHourBucket();
	const key = `${API_USER_PREFIX}${userId}:${hourBucket}`;

	const count = await client.hget(key, 'calls');
	return count ? parseInt(count, 10) : 0;
}

// ============================================
// Storage Tracking
// ============================================

/**
 * Update storage usage for a project
 *
 * @param projectId - The project ID
 * @param usageMB - Current storage usage in MB
 */
export async function updateStorageUsage(projectId: string, usageMB: number): Promise<void> {
	const client = getRedisClient();
	const key = `${STORAGE_PREFIX}${projectId}`;
	await client.hset(key, 'currentMB', String(usageMB));

	// Also update summary
	const summaryKey = `${SUMMARY_PREFIX}${projectId}`;
	await client.hset(summaryKey, 'storageUsedMB', String(usageMB));
}

/**
 * Increment storage usage (for file uploads)
 *
 * @param projectId - The project ID
 * @param deltaMB - Storage change in MB (can be negative for deletes)
 */
export async function incrementStorageUsage(projectId: string, deltaMB: number): Promise<void> {
	const client = getRedisClient();
	const key = `${STORAGE_PREFIX}${projectId}`;
	await client.hincrbyfloat(key, 'currentMB', deltaMB);

	// Also update summary
	const summaryKey = `${SUMMARY_PREFIX}${projectId}`;
	await client.hincrbyfloat(summaryKey, 'storageUsedMB', deltaMB);
}

/**
 * Get current storage usage for a project
 *
 * @param projectId - The project ID
 * @returns Storage usage in MB
 */
export async function getStorageUsage(projectId: string): Promise<number> {
	const client = getRedisClient();
	const key = `${STORAGE_PREFIX}${projectId}`;

	const usage = await client.hget(key, 'currentMB');
	return usage ? parseFloat(usage) : 0;
}

// ============================================
// WebSocket Tracking
// ============================================

/**
 * Track WebSocket connection open
 *
 * @param projectId - The project ID
 * @param socketId - The socket ID
 */
export async function trackWebSocketOpen(projectId: string, socketId: string): Promise<void> {
	const client = getRedisClient();
	const key = `${WEBSOCKET_PREFIX}${projectId}`;
	await client.hset(key, socketId, String(Date.now()));
}

/**
 * Track WebSocket connection close
 *
 * @param projectId - The project ID
 * @param socketId - The socket ID
 */
export async function trackWebSocketClose(projectId: string, socketId: string): Promise<void> {
	const client = getRedisClient();
	const key = `${WEBSOCKET_PREFIX}${projectId}`;
	await client.hdel(key, socketId);
}

/**
 * Get active WebSocket connection count
 *
 * @param projectId - The project ID
 * @returns Number of active connections
 */
export async function getActiveWebSocketCount(projectId: string): Promise<number> {
	const client = getRedisClient();
	const key = `${WEBSOCKET_PREFIX}${projectId}`;
	const sockets = await client.hgetall(key);
	return sockets ? Object.keys(sockets).length : 0;
}

// ============================================
// Swarm Tracking
// ============================================

/**
 * Track a swarm execution
 *
 * @param projectId - The project ID
 */
export async function trackSwarmExecution(projectId: string): Promise<void> {
	const client = getRedisClient();
	const key = `${SUMMARY_PREFIX}${projectId}`;
	await client.hincrby(key, 'swarmExecutions', 1);
}

// ============================================
// Aggregate Usage
// ============================================

/**
 * Get aggregated usage metrics for a project
 *
 * @param projectId - The project ID
 * @returns UsageMetrics for the project
 */
export async function getProjectUsage(projectId: string): Promise<UsageMetrics> {
	const client = getRedisClient();
	const key = `${SUMMARY_PREFIX}${projectId}`;

	const data = await client.hgetall(key);

	if (!data) {
		return {
			agentHours: 0,
			apiCalls: 0,
			storageUsedMB: 0,
			websocketConnections: 0,
			swarmExecutions: 0,
			timestamp: Date.now()
		};
	}

	return {
		agentHours: parseFloat(data.agentHours || '0'),
		apiCalls: parseInt(data.apiCalls || '0', 10),
		storageUsedMB: parseFloat(data.storageUsedMB || '0'),
		websocketConnections: parseInt(data.websocketConnections || '0', 10),
		swarmExecutions: parseInt(data.swarmExecutions || '0', 10),
		timestamp: Date.now()
	};
}

/**
 * Get aggregated usage metrics for a user across all projects
 *
 * @param userId - The user ID
 * @returns UserUsageMetrics for the user
 */
export async function getUserUsage(userId: string): Promise<UserUsageMetrics> {
	const client = getRedisClient();
	const key = `${USER_USAGE_PREFIX}${userId}`;

	const data = await client.hgetall(key);

	if (!data) {
		return {
			totalAgentHours: 0,
			totalApiCalls: 0,
			totalStorageUsedMB: 0,
			projectIds: []
		};
	}

	return {
		totalAgentHours: parseFloat(data.totalAgentHours || '0'),
		totalApiCalls: parseInt(data.totalApiCalls || '0', 10),
		totalStorageUsedMB: parseFloat(data.totalStorageUsedMB || '0'),
		projectIds: data.projectIds ? JSON.parse(data.projectIds) : []
	};
}

// ============================================
// Historical Data
// ============================================

/**
 * Get usage history for a project
 *
 * @param projectId - The project ID
 * @param days - Number of days of history
 * @returns Array of daily usage snapshots
 */
export async function getUsageHistory(projectId: string, days: number = 7): Promise<DailyUsage[]> {
	const client = getRedisClient();
	const pattern = `${DAILY_PREFIX}${projectId}:*`;

	const keys = await client.keys(pattern);

	if (keys.length === 0) {
		return [];
	}

	// Sort keys by date and take last N days
	const sortedKeys = keys.sort().slice(-days);

	const pipeline = client.pipeline();
	for (const key of sortedKeys) {
		pipeline.hgetall(key);
	}

	const results = await pipeline.exec();

	if (!results) {
		return [];
	}

	return results
		.map(([err, data], index) => {
			if (err || !data) {
				return null;
			}
			const dateMatch = sortedKeys[index].match(/(\d{4}-\d{2}-\d{2})$/);
			const date = dateMatch ? dateMatch[1] : 'unknown';

			const usageData = data as Record<string, string>;
			return {
				date,
				agentHours: parseFloat(usageData.agentHours || '0'),
				apiCalls: parseInt(usageData.apiCalls || '0', 10),
				storageUsedMB: parseFloat(usageData.storageUsedMB || '0'),
				swarmExecutions: parseInt(usageData.swarmExecutions || '0', 10)
			};
		})
		.filter((item): item is DailyUsage => item !== null);
}

/**
 * Archive current day's usage to history
 *
 * @param projectId - The project ID
 */
export async function archiveDailyUsage(projectId: string): Promise<void> {
	const client = getRedisClient();
	const summaryKey = `${SUMMARY_PREFIX}${projectId}`;
	const dayKey = getDayKey();
	const archiveKey = `${DAILY_PREFIX}${projectId}:${dayKey}`;

	const currentUsage = await client.hgetall(summaryKey);

	if (currentUsage) {
		await client.set(archiveKey, JSON.stringify(currentUsage));
	}
}

// ============================================
// Dashboard Data
// ============================================

/**
 * Get compiled dashboard data for a project
 *
 * @param projectId - The project ID
 * @returns UsageDashboardData with current metrics
 */
export async function getUsageDashboardData(projectId: string): Promise<UsageDashboardData> {
	const current = await getProjectUsage(projectId);

	return {
		projectId,
		current,
		timestamp: Date.now()
	};
}

/**
 * Get dashboard data with limit comparisons
 *
 * @param projectId - The project ID
 * @param limits - Resource limits to compare against
 * @returns UsageDashboardData with percentages
 */
export async function getUsageDashboardDataWithLimits(
	projectId: string,
	limits: {
		maxAgentsPerProject: number;
		maxApiCallsPerHour: number;
		storageQuotaMB: number;
	}
): Promise<UsageDashboardData> {
	const current = await getProjectUsage(projectId);
	const activeAgents = await getActiveAgentCount(projectId);
	const currentApiCalls = await getApiCallCount(projectId);

	return {
		projectId,
		current,
		limits,
		percentages: {
			agents: Math.min(100, (activeAgents / limits.maxAgentsPerProject) * 100),
			apiCalls: Math.min(100, (currentApiCalls / limits.maxApiCallsPerHour) * 100),
			storage: Math.min(100, (current.storageUsedMB / limits.storageQuotaMB) * 100)
		},
		timestamp: Date.now()
	};
}

/**
 * Reset usage counters for a project (for testing or billing cycle reset)
 *
 * @param projectId - The project ID
 */
export async function resetProjectUsage(projectId: string): Promise<void> {
	const client = getRedisClient();
	const summaryKey = `${SUMMARY_PREFIX}${projectId}`;

	await client.del(summaryKey);
}
