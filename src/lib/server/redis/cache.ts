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
