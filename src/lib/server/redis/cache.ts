/**
 * Redis Caching Layer
 *
 * Provides caching functionality for projects and tickets
 * with a 5-minute TTL and batch operations using pipelines.
 */

import { getRedisClient } from '$lib/server/redis';

// Default TTL of 5 minutes in seconds
const DEFAULT_TTL = 300;

// Cache key prefixes
const PROJECT_PREFIX = 'project:';
const TICKET_PREFIX = 'ticket:';
const PROJECT_TICKETS_PREFIX = 'project-tickets:';

// Type definitions for cached entities
export interface CachedProject {
	id: string;
	name: string;
	description?: string | null;
	settings?: Record<string, unknown>;
	createdAt?: Date | string;
	updatedAt?: Date | string;
	[key: string]: unknown;
}

export interface CachedTicket {
	id: string;
	title: string;
	description?: string | null;
	status?: string;
	priority?: string;
	projectId?: string;
	position?: number;
	createdAt?: Date | string;
	updatedAt?: Date | string;
	[key: string]: unknown;
}

// ============================================
// Project Cache Operations
// ============================================

/**
 * Cache a project with 5-minute TTL
 *
 * @param project - The project to cache
 * @param ttl - Optional custom TTL in seconds (default: 300)
 */
export async function cacheProject(project: CachedProject, ttl: number = DEFAULT_TTL): Promise<void> {
	const client = getRedisClient();
	const key = `${PROJECT_PREFIX}${project.id}`;
	await client.set(key, JSON.stringify(project), 'EX', ttl);
}

/**
 * Get a cached project by ID
 *
 * @param projectId - The project ID to retrieve
 * @returns The cached project or null if not found
 */
export async function getProject(projectId: string): Promise<CachedProject | null> {
	const client = getRedisClient();
	const key = `${PROJECT_PREFIX}${projectId}`;
	const cached = await client.get(key);

	if (!cached) {
		return null;
	}

	try {
		return JSON.parse(cached) as CachedProject;
	} catch {
		return null;
	}
}

/**
 * Invalidate (delete) a cached project
 *
 * @param projectId - The project ID to invalidate
 */
export async function invalidateProject(projectId: string): Promise<void> {
	const client = getRedisClient();
	const key = `${PROJECT_PREFIX}${projectId}`;
	await client.del(key);
}

// ============================================
// Ticket Cache Operations
// ============================================

/**
 * Cache a ticket with 5-minute TTL
 *
 * @param ticket - The ticket to cache
 * @param ttl - Optional custom TTL in seconds (default: 300)
 */
export async function cacheTicket(ticket: CachedTicket, ttl: number = DEFAULT_TTL): Promise<void> {
	const client = getRedisClient();
	const key = `${TICKET_PREFIX}${ticket.id}`;
	await client.set(key, JSON.stringify(ticket), 'EX', ttl);
}

/**
 * Get a cached ticket by ID
 *
 * @param ticketId - The ticket ID to retrieve
 * @returns The cached ticket or null if not found
 */
export async function getTicket(ticketId: string): Promise<CachedTicket | null> {
	const client = getRedisClient();
	const key = `${TICKET_PREFIX}${ticketId}`;
	const cached = await client.get(key);

	if (!cached) {
		return null;
	}

	try {
		return JSON.parse(cached) as CachedTicket;
	} catch {
		return null;
	}
}

/**
 * Invalidate (delete) a cached ticket
 *
 * @param ticketId - The ticket ID to invalidate
 */
export async function invalidateTicket(ticketId: string): Promise<void> {
	const client = getRedisClient();
	const key = `${TICKET_PREFIX}${ticketId}`;
	await client.del(key);
}

// ============================================
// Batch Operations (using Pipeline)
// ============================================

/**
 * Cache multiple tickets for a project using a pipeline
 * This is more efficient than individual cache calls
 *
 * @param projectId - The project ID these tickets belong to
 * @param tickets - Array of tickets to cache
 * @param ttl - Optional custom TTL in seconds (default: 300)
 */
export async function cacheProjectTickets(
	projectId: string,
	tickets: CachedTicket[],
	ttl: number = DEFAULT_TTL
): Promise<void> {
	const client = getRedisClient();
	const pipeline = client.pipeline();

	// Cache each ticket
	for (const ticket of tickets) {
		const key = `${TICKET_PREFIX}${ticket.id}`;
		pipeline.set(key, JSON.stringify(ticket), 'EX', ttl);
	}

	// Also cache the list of ticket IDs for this project
	const ticketIds = tickets.map((t) => t.id);
	const listKey = `${PROJECT_TICKETS_PREFIX}${projectId}`;
	pipeline.set(listKey, JSON.stringify(ticketIds), 'EX', ttl);

	await pipeline.exec();
}

/**
 * Get all cached ticket IDs for a project
 *
 * @param projectId - The project ID
 * @returns Array of ticket IDs or null if not cached
 */
export async function getProjectTicketIds(projectId: string): Promise<string[] | null> {
	const client = getRedisClient();
	const key = `${PROJECT_TICKETS_PREFIX}${projectId}`;
	const cached = await client.get(key);

	if (!cached) {
		return null;
	}

	try {
		return JSON.parse(cached) as string[];
	} catch {
		return null;
	}
}

/**
 * Invalidate all cached tickets for a project using a pipeline
 *
 * @param projectId - The project ID whose tickets should be invalidated
 */
export async function invalidateProjectTickets(projectId: string): Promise<void> {
	const client = getRedisClient();

	// First, get the list of ticket IDs for this project
	const ticketIds = await getProjectTicketIds(projectId);

	if (!ticketIds || ticketIds.length === 0) {
		// No cached tickets, just delete the list key
		await client.del(`${PROJECT_TICKETS_PREFIX}${projectId}`);
		return;
	}

	// Use pipeline to delete all tickets efficiently
	const pipeline = client.pipeline();

	for (const ticketId of ticketIds) {
		pipeline.del(`${TICKET_PREFIX}${ticketId}`);
	}

	// Also delete the list key
	pipeline.del(`${PROJECT_TICKETS_PREFIX}${projectId}`);

	await pipeline.exec();
}

/**
 * Get multiple tickets by IDs using pipeline
 *
 * @param ticketIds - Array of ticket IDs to retrieve
 * @returns Array of cached tickets (nulls for not found)
 */
export async function getTickets(ticketIds: string[]): Promise<(CachedTicket | null)[]> {
	if (ticketIds.length === 0) {
		return [];
	}

	const client = getRedisClient();
	const pipeline = client.pipeline();

	for (const ticketId of ticketIds) {
		pipeline.get(`${TICKET_PREFIX}${ticketId}`);
	}

	const results = await pipeline.exec();

	if (!results) {
		return ticketIds.map(() => null);
	}

	return results.map(([err, value]) => {
		if (err || !value) {
			return null;
		}
		try {
			return JSON.parse(value as string) as CachedTicket;
		} catch {
			return null;
		}
	});
}

/**
 * Cache multiple projects using pipeline
 *
 * @param projects - Array of projects to cache
 * @param ttl - Optional custom TTL in seconds (default: 300)
 */
export async function cacheProjects(
	projects: CachedProject[],
	ttl: number = DEFAULT_TTL
): Promise<void> {
	const client = getRedisClient();
	const pipeline = client.pipeline();

	for (const project of projects) {
		const key = `${PROJECT_PREFIX}${project.id}`;
		pipeline.set(key, JSON.stringify(project), 'EX', ttl);
	}

	await pipeline.exec();
}

// ============================================
// Cache Statistics & Utilities
// ============================================

/**
 * Check if a project is cached
 *
 * @param projectId - The project ID to check
 * @returns True if cached, false otherwise
 */
export async function isProjectCached(projectId: string): Promise<boolean> {
	const client = getRedisClient();
	const exists = await client.exists(`${PROJECT_PREFIX}${projectId}`);
	return exists === 1;
}

/**
 * Check if a ticket is cached
 *
 * @param ticketId - The ticket ID to check
 * @returns True if cached, false otherwise
 */
export async function isTicketCached(ticketId: string): Promise<boolean> {
	const client = getRedisClient();
	const exists = await client.exists(`${TICKET_PREFIX}${ticketId}`);
	return exists === 1;
}

/**
 * Get the TTL remaining for a cached project
 *
 * @param projectId - The project ID
 * @returns TTL in seconds, -1 if no TTL, -2 if not found
 */
export async function getProjectTTL(projectId: string): Promise<number> {
	const client = getRedisClient();
	return client.ttl(`${PROJECT_PREFIX}${projectId}`);
}

/**
 * Get the TTL remaining for a cached ticket
 *
 * @param ticketId - The ticket ID
 * @returns TTL in seconds, -1 if no TTL, -2 if not found
 */
export async function getTicketTTL(ticketId: string): Promise<number> {
	const client = getRedisClient();
	return client.ttl(`${TICKET_PREFIX}${ticketId}`);
}

// ============================================
// GAP-ROAD.1: Pattern Cache Operations
// ============================================

// Cache key prefixes for patterns and memory
const PATTERN_PREFIX = 'pattern:';
const PATTERN_LIST_PREFIX = 'patterns:list:';
const MEMORY_PREFIX = 'memory:';
const MEMORY_SEARCH_PREFIX = 'memory:search:';
const AGENT_METRICS_PREFIX = 'agent:metrics:';

// Pattern cache TTL (10 minutes - patterns change less frequently)
const PATTERN_TTL = 600;
// Memory search cache TTL (2 minutes - balance freshness with performance)
const MEMORY_SEARCH_TTL = 120;
// Agent metrics TTL (30 seconds - real-time data)
const AGENT_METRICS_TTL = 30;

/**
 * Cached pattern structure
 */
export interface CachedPattern {
	id: string;
	key: string;
	name: string;
	value: string;
	namespace: string;
	domain: string;
	successRate: number;
	usageCount: number;
	tags?: string[];
	createdAt?: string | Date;
	updatedAt?: string | Date;
	[key: string]: unknown;
}

/**
 * Cached memory entry structure
 */
export interface CachedMemoryEntry {
	key: string;
	value: string;
	namespace: string;
	metadata?: Record<string, unknown>;
	tags?: string[];
	similarity?: number;
	createdAt?: string;
	updatedAt?: string;
}

/**
 * Cached memory search result
 */
export interface CachedMemorySearchResult {
	entries: CachedMemoryEntry[];
	query: string;
	namespace?: string;
	totalFound: number;
	cachedAt: number;
}

/**
 * Cached agent metrics
 */
export interface CachedAgentMetrics {
	agentId: string;
	agentType: string;
	status: 'idle' | 'active' | 'busy' | 'error';
	taskCount: number;
	successRate: number;
	avgResponseTime: number;
	lastActive: number;
	[key: string]: unknown;
}

/**
 * Cache a pattern with TTL
 *
 * @param pattern - The pattern to cache
 * @param ttl - Optional custom TTL in seconds (default: 600)
 */
export async function cachePattern(pattern: CachedPattern, ttl: number = PATTERN_TTL): Promise<void> {
	const client = getRedisClient();
	const key = `${PATTERN_PREFIX}${pattern.id}`;
	await client.set(key, JSON.stringify(pattern), 'EX', ttl);
}

/**
 * Get a cached pattern by ID
 *
 * @param patternId - The pattern ID to retrieve
 * @returns The cached pattern or null if not found
 */
export async function getPattern(patternId: string): Promise<CachedPattern | null> {
	const client = getRedisClient();
	const key = `${PATTERN_PREFIX}${patternId}`;
	const cached = await client.get(key);

	if (!cached) {
		return null;
	}

	try {
		return JSON.parse(cached) as CachedPattern;
	} catch {
		return null;
	}
}

/**
 * Invalidate (delete) a cached pattern
 *
 * @param patternId - The pattern ID to invalidate
 */
export async function invalidatePattern(patternId: string): Promise<void> {
	const client = getRedisClient();
	const key = `${PATTERN_PREFIX}${patternId}`;
	await client.del(key);
}

/**
 * Cache a list of patterns by namespace using pipeline
 *
 * @param namespace - The namespace for these patterns
 * @param patterns - Array of patterns to cache
 * @param ttl - Optional custom TTL in seconds (default: 600)
 */
export async function cachePatternList(
	namespace: string,
	patterns: CachedPattern[],
	ttl: number = PATTERN_TTL
): Promise<void> {
	const client = getRedisClient();
	const pipeline = client.pipeline();

	// Cache each pattern individually
	for (const pattern of patterns) {
		pipeline.set(`${PATTERN_PREFIX}${pattern.id}`, JSON.stringify(pattern), 'EX', ttl);
	}

	// Cache the list of pattern IDs for this namespace
	const patternIds = patterns.map((p) => p.id);
	const listKey = `${PATTERN_LIST_PREFIX}${namespace}`;
	pipeline.set(listKey, JSON.stringify({ ids: patternIds, cachedAt: Date.now() }), 'EX', ttl);

	await pipeline.exec();
}

/**
 * Get cached pattern IDs for a namespace
 *
 * @param namespace - The namespace
 * @returns Pattern IDs array or null if not cached
 */
export async function getPatternListIds(namespace: string): Promise<string[] | null> {
	const client = getRedisClient();
	const key = `${PATTERN_LIST_PREFIX}${namespace}`;
	const cached = await client.get(key);

	if (!cached) {
		return null;
	}

	try {
		const parsed = JSON.parse(cached);
		return parsed.ids as string[];
	} catch {
		return null;
	}
}

/**
 * Invalidate all patterns for a namespace
 *
 * @param namespace - The namespace to invalidate
 */
export async function invalidatePatternList(namespace: string): Promise<void> {
	const client = getRedisClient();
	const patternIds = await getPatternListIds(namespace);

	if (!patternIds || patternIds.length === 0) {
		await client.del(`${PATTERN_LIST_PREFIX}${namespace}`);
		return;
	}

	const pipeline = client.pipeline();

	for (const patternId of patternIds) {
		pipeline.del(`${PATTERN_PREFIX}${patternId}`);
	}

	pipeline.del(`${PATTERN_LIST_PREFIX}${namespace}`);
	await pipeline.exec();
}

/**
 * Get multiple patterns by IDs using pipeline
 *
 * @param patternIds - Array of pattern IDs to retrieve
 * @returns Array of cached patterns (nulls for not found)
 */
export async function getPatterns(patternIds: string[]): Promise<(CachedPattern | null)[]> {
	if (patternIds.length === 0) {
		return [];
	}

	const client = getRedisClient();
	const pipeline = client.pipeline();

	for (const patternId of patternIds) {
		pipeline.get(`${PATTERN_PREFIX}${patternId}`);
	}

	const results = await pipeline.exec();

	if (!results) {
		return patternIds.map(() => null);
	}

	return results.map(([err, value]) => {
		if (err || !value) {
			return null;
		}
		try {
			return JSON.parse(value as string) as CachedPattern;
		} catch {
			return null;
		}
	});
}

// ============================================
// GAP-ROAD.1: Memory Search Cache Operations
// ============================================

/**
 * Generate a cache key for a memory search query
 */
function getMemorySearchKey(query: string, namespace?: string, limit?: number): string {
	const normalizedQuery = query.toLowerCase().trim();
	const hash = Buffer.from(normalizedQuery).toString('base64').slice(0, 32);
	const nsKey = namespace || 'all';
	const limitKey = limit || 20;
	return `${MEMORY_SEARCH_PREFIX}${nsKey}:${limitKey}:${hash}`;
}

/**
 * Cache a memory search result
 *
 * @param query - The search query
 * @param result - The search result to cache
 * @param namespace - Optional namespace filter
 * @param limit - Optional limit
 * @param ttl - Optional custom TTL in seconds (default: 120)
 */
export async function cacheMemorySearch(
	query: string,
	result: CachedMemorySearchResult,
	namespace?: string,
	limit?: number,
	ttl: number = MEMORY_SEARCH_TTL
): Promise<void> {
	const client = getRedisClient();
	const key = getMemorySearchKey(query, namespace, limit);
	await client.set(key, JSON.stringify({ ...result, cachedAt: Date.now() }), 'EX', ttl);
}

/**
 * Get a cached memory search result
 *
 * @param query - The search query
 * @param namespace - Optional namespace filter
 * @param limit - Optional limit
 * @returns The cached search result or null if not found/expired
 */
export async function getMemorySearch(
	query: string,
	namespace?: string,
	limit?: number
): Promise<CachedMemorySearchResult | null> {
	const client = getRedisClient();
	const key = getMemorySearchKey(query, namespace, limit);
	const cached = await client.get(key);

	if (!cached) {
		return null;
	}

	try {
		return JSON.parse(cached) as CachedMemorySearchResult;
	} catch {
		return null;
	}
}

/**
 * Invalidate all memory search caches
 * Called when memory entries are added/updated/deleted
 */
export async function invalidateMemorySearchCache(): Promise<void> {
	const client = getRedisClient();
	// Use scan to find and delete all memory search cache keys
	let cursor = '0';
	do {
		const [nextCursor, keys] = await client.scan(cursor, 'MATCH', `${MEMORY_SEARCH_PREFIX}*`, 'COUNT', 100);
		cursor = nextCursor;
		if (keys.length > 0) {
			await client.del(...keys);
		}
	} while (cursor !== '0');
}

/**
 * Cache a single memory entry
 *
 * @param entry - The memory entry to cache
 * @param ttl - Optional custom TTL in seconds (default: 300)
 */
export async function cacheMemoryEntry(entry: CachedMemoryEntry, ttl: number = DEFAULT_TTL): Promise<void> {
	const client = getRedisClient();
	const key = `${MEMORY_PREFIX}${entry.namespace || 'default'}:${entry.key}`;
	await client.set(key, JSON.stringify(entry), 'EX', ttl);
}

/**
 * Get a cached memory entry
 *
 * @param entryKey - The memory entry key
 * @param namespace - The namespace (default: 'default')
 * @returns The cached entry or null if not found
 */
export async function getMemoryEntry(entryKey: string, namespace = 'default'): Promise<CachedMemoryEntry | null> {
	const client = getRedisClient();
	const key = `${MEMORY_PREFIX}${namespace}:${entryKey}`;
	const cached = await client.get(key);

	if (!cached) {
		return null;
	}

	try {
		return JSON.parse(cached) as CachedMemoryEntry;
	} catch {
		return null;
	}
}

/**
 * Invalidate a cached memory entry
 *
 * @param entryKey - The memory entry key
 * @param namespace - The namespace (default: 'default')
 */
export async function invalidateMemoryEntry(entryKey: string, namespace = 'default'): Promise<void> {
	const client = getRedisClient();
	const key = `${MEMORY_PREFIX}${namespace}:${entryKey}`;
	await client.del(key);
	// Also invalidate search caches since data changed
	await invalidateMemorySearchCache();
}

// ============================================
// GAP-ROAD.1: Agent Metrics Cache Operations
// ============================================

/**
 * Cache agent metrics
 *
 * @param metrics - The agent metrics to cache
 * @param ttl - Optional custom TTL in seconds (default: 30)
 */
export async function cacheAgentMetrics(metrics: CachedAgentMetrics, ttl: number = AGENT_METRICS_TTL): Promise<void> {
	const client = getRedisClient();
	const key = `${AGENT_METRICS_PREFIX}${metrics.agentId}`;
	await client.set(key, JSON.stringify(metrics), 'EX', ttl);
}

/**
 * Get cached agent metrics
 *
 * @param agentId - The agent ID
 * @returns The cached metrics or null if not found
 */
export async function getAgentMetrics(agentId: string): Promise<CachedAgentMetrics | null> {
	const client = getRedisClient();
	const key = `${AGENT_METRICS_PREFIX}${agentId}`;
	const cached = await client.get(key);

	if (!cached) {
		return null;
	}

	try {
		return JSON.parse(cached) as CachedAgentMetrics;
	} catch {
		return null;
	}
}

/**
 * Cache multiple agent metrics using pipeline
 *
 * @param metricsList - Array of agent metrics to cache
 * @param ttl - Optional custom TTL in seconds (default: 30)
 */
export async function cacheMultipleAgentMetrics(
	metricsList: CachedAgentMetrics[],
	ttl: number = AGENT_METRICS_TTL
): Promise<void> {
	if (metricsList.length === 0) {
		return;
	}

	const client = getRedisClient();
	const pipeline = client.pipeline();

	for (const metrics of metricsList) {
		pipeline.set(`${AGENT_METRICS_PREFIX}${metrics.agentId}`, JSON.stringify(metrics), 'EX', ttl);
	}

	await pipeline.exec();
}

/**
 * Get all cached agent metrics
 *
 * @returns Array of all cached agent metrics
 */
export async function getAllAgentMetrics(): Promise<CachedAgentMetrics[]> {
	const client = getRedisClient();
	const metrics: CachedAgentMetrics[] = [];

	// Use scan to find all agent metrics keys
	let cursor = '0';
	do {
		const [nextCursor, keys] = await client.scan(cursor, 'MATCH', `${AGENT_METRICS_PREFIX}*`, 'COUNT', 100);
		cursor = nextCursor;

		if (keys.length > 0) {
			const pipeline = client.pipeline();
			for (const key of keys) {
				pipeline.get(key);
			}
			const results = await pipeline.exec();

			if (results) {
				for (const [err, value] of results) {
					if (!err && value) {
						try {
							metrics.push(JSON.parse(value as string) as CachedAgentMetrics);
						} catch {
							// Skip invalid entries
						}
					}
				}
			}
		}
	} while (cursor !== '0');

	return metrics;
}

/**
 * Invalidate agent metrics cache for a specific agent
 *
 * @param agentId - The agent ID
 */
export async function invalidateAgentMetrics(agentId: string): Promise<void> {
	const client = getRedisClient();
	await client.del(`${AGENT_METRICS_PREFIX}${agentId}`);
}

// ============================================
// GAP-ROAD.1: Cache Statistics
// ============================================

/**
 * Get cache statistics for monitoring
 */
export async function getCacheStatistics(): Promise<{
	patterns: { count: number; keys: string[] };
	memory: { count: number; keys: string[] };
	agents: { count: number; keys: string[] };
	totalKeys: number;
}> {
	const client = getRedisClient();

	const collectKeys = async (pattern: string): Promise<string[]> => {
		const keys: string[] = [];
		let cursor = '0';
		do {
			const [nextCursor, foundKeys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
			cursor = nextCursor;
			keys.push(...foundKeys);
		} while (cursor !== '0');
		return keys;
	};

	const [patternKeys, memoryKeys, agentKeys] = await Promise.all([
		collectKeys(`${PATTERN_PREFIX}*`),
		collectKeys(`${MEMORY_PREFIX}*`),
		collectKeys(`${AGENT_METRICS_PREFIX}*`)
	]);

	return {
		patterns: { count: patternKeys.length, keys: patternKeys.slice(0, 10) },
		memory: { count: memoryKeys.length, keys: memoryKeys.slice(0, 10) },
		agents: { count: agentKeys.length, keys: agentKeys.slice(0, 10) },
		totalKeys: patternKeys.length + memoryKeys.length + agentKeys.length
	};
}
