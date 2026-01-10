/**
 * Redis Module Index
 *
 * Re-exports all Redis-related functionality for easy imports
 */

// Core Redis client functions
export { getRedisClient, getPubSubClient, closeRedisConnections, isRedisEnabled } from '$lib/server/redis';

// Pub/Sub functionality
export {
	TICKET_EVENTS,
	PROJECT_EVENTS,
	SYSTEM_EVENTS,
	// GAP-ROAD.1: New event channels
	PATTERN_EVENTS,
	MEMORY_EVENTS,
	AGENT_EVENTS,
	publishEvent,
	publishTicketEvent,
	publishProjectEvent,
	// GAP-ROAD.1: New publish functions
	publishPatternEvent,
	publishMemoryEvent,
	publishAgentEvent,
	bridgeRedisToSocketIO,
	channels,
	type TicketEvent,
	type ProjectEvent,
	type TicketEventType,
	type ProjectEventType,
	type SystemEventType,
	// GAP-ROAD.1: New event types
	type PatternEvent,
	type PatternEventType,
	type MemoryEvent,
	type MemoryEventType,
	type AgentEvent,
	type AgentEventType,
	type BaseEvent,
	type SocketIOServer
} from './pubsub';

// Cache functionality
export {
	// Project and ticket caching
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
	type CachedTicket,
	// GAP-ROAD.1: Pattern caching
	cachePattern,
	getPattern,
	invalidatePattern,
	cachePatternList,
	getPatternListIds,
	invalidatePatternList,
	getPatterns,
	type CachedPattern,
	// GAP-ROAD.1: Memory caching
	cacheMemorySearch,
	getMemorySearch,
	invalidateMemorySearchCache,
	cacheMemoryEntry,
	getMemoryEntry,
	invalidateMemoryEntry,
	type CachedMemoryEntry,
	type CachedMemorySearchResult,
	// GAP-ROAD.1: Agent metrics caching
	cacheAgentMetrics,
	getAgentMetrics,
	cacheMultipleAgentMetrics,
	getAllAgentMetrics,
	invalidateAgentMetrics,
	type CachedAgentMetrics,
	// GAP-ROAD.1: Cache statistics
	getCacheStatistics
} from './cache';
