/**
 * Redis Module Index
 *
 * Re-exports all Redis-related functionality for easy imports
 */

// Core Redis client functions
export { getRedisClient, getPubSubClient, closeRedisConnections } from '$lib/server/redis';

// Pub/Sub functionality
export {
	TICKET_EVENTS,
	PROJECT_EVENTS,
	SYSTEM_EVENTS,
	publishEvent,
	publishTicketEvent,
	publishProjectEvent,
	bridgeRedisToSocketIO,
	channels,
	type TicketEvent,
	type ProjectEvent,
	type TicketEventType,
	type ProjectEventType,
	type SystemEventType,
	type BaseEvent,
	type SocketIOServer
} from './pubsub';

// Cache functionality
export {
	cacheProject,
	getProject,
	invalidateProject,
	cacheTicket,
	getTicket,
	invalidateTicket,
	cacheProjectTickets,
	getProjectTicketIds,
	invalidateProjectTickets,
	getTickets,
	cacheProjects,
	isProjectCached,
	isTicketCached,
	getProjectTTL,
	getTicketTTL,
	type CachedProject,
	type CachedTicket
} from './cache';
