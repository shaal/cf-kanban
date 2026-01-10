/**
 * Redis Pub/Sub Event System
 *
 * Provides a publish/subscribe mechanism for real-time events
 * that can be bridged to Socket.IO for client notifications.
 */

import { getRedisClient, getPubSubClient } from '$lib/server/redis';

// Channel constants for organizing events
export const TICKET_EVENTS = 'kanban:tickets';
export const PROJECT_EVENTS = 'kanban:projects';
export const SYSTEM_EVENTS = 'kanban:system';
// GAP-ROAD.1: Pattern and memory event channels
export const PATTERN_EVENTS = 'kanban:patterns';
export const MEMORY_EVENTS = 'kanban:memory';
export const AGENT_EVENTS = 'kanban:agents';

// Event types for ticket events
export type TicketEventType =
	| 'ticket:created'
	| 'ticket:updated'
	| 'ticket:deleted'
	| 'ticket:transitioned'
	| 'ticket:moved';

// Event types for project events
export type ProjectEventType = 'project:created' | 'project:updated' | 'project:deleted';

// Event types for system events
export type SystemEventType = 'system:maintenance' | 'system:notification';

// GAP-ROAD.1: Event types for pattern events
export type PatternEventType =
	| 'pattern:created'
	| 'pattern:updated'
	| 'pattern:deleted'
	| 'pattern:cache_hit'
	| 'pattern:cache_miss';

// GAP-ROAD.1: Event types for memory events
export type MemoryEventType =
	| 'memory:stored'
	| 'memory:retrieved'
	| 'memory:deleted'
	| 'memory:searched'
	| 'memory:cache_invalidated';

// GAP-ROAD.1: Event types for agent events
export type AgentEventType =
	| 'agent:spawned'
	| 'agent:completed'
	| 'agent:failed'
	| 'agent:metrics_updated';

// Base event interface
export interface BaseEvent {
	type: string;
	timestamp?: number;
}

// Ticket event interface
export interface TicketEvent extends BaseEvent {
	type: TicketEventType;
	ticketId: string;
	projectId: string;
	data?: Record<string, unknown>;
}

// Project event interface
export interface ProjectEvent extends BaseEvent {
	type: ProjectEventType;
	projectId: string;
	data?: Record<string, unknown>;
}

// GAP-ROAD.1: Pattern event interface
export interface PatternEvent extends BaseEvent {
	type: PatternEventType;
	patternId: string;
	namespace?: string;
	data?: Record<string, unknown>;
}

// GAP-ROAD.1: Memory event interface
export interface MemoryEvent extends BaseEvent {
	type: MemoryEventType;
	key?: string;
	namespace?: string;
	query?: string;
	data?: Record<string, unknown>;
}

// GAP-ROAD.1: Agent event interface
export interface AgentEvent extends BaseEvent {
	type: AgentEventType;
	agentId: string;
	agentType: string;
	data?: Record<string, unknown>;
}

// Socket.IO interface (minimal for type safety)
export interface SocketIOServer {
	emit(channel: string, data: unknown): void;
}

/**
 * Publish an event to a Redis channel
 *
 * @param channel - The channel to publish to
 * @param event - The event data to publish
 * @returns The number of subscribers that received the message
 */
export async function publishEvent(
	channel: string,
	event: BaseEvent | Record<string, unknown>
): Promise<number> {
	const client = getRedisClient();
	const eventWithTimestamp = {
		...event,
		timestamp: event.timestamp || Date.now()
	};
	return client.publish(channel, JSON.stringify(eventWithTimestamp));
}

/**
 * Publish a ticket event to the TICKET_EVENTS channel
 *
 * @param event - The ticket event to publish
 */
export async function publishTicketEvent(event: TicketEvent): Promise<number> {
	return publishEvent(TICKET_EVENTS, event);
}

/**
 * Publish a project event to the PROJECT_EVENTS channel
 *
 * @param event - The project event to publish
 */
export async function publishProjectEvent(event: ProjectEvent): Promise<number> {
	return publishEvent(PROJECT_EVENTS, event);
}

/**
 * GAP-ROAD.1: Publish a pattern event to the PATTERN_EVENTS channel
 *
 * @param event - The pattern event to publish
 */
export async function publishPatternEvent(event: PatternEvent): Promise<number> {
	return publishEvent(PATTERN_EVENTS, event);
}

/**
 * GAP-ROAD.1: Publish a memory event to the MEMORY_EVENTS channel
 *
 * @param event - The memory event to publish
 */
export async function publishMemoryEvent(event: MemoryEvent): Promise<number> {
	return publishEvent(MEMORY_EVENTS, event);
}

/**
 * GAP-ROAD.1: Publish an agent event to the AGENT_EVENTS channel
 *
 * @param event - The agent event to publish
 */
export async function publishAgentEvent(event: AgentEvent): Promise<number> {
	return publishEvent(AGENT_EVENTS, event);
}

/**
 * Bridge Redis pub/sub messages to Socket.IO for real-time client updates
 *
 * @param io - The Socket.IO server instance
 */
export async function bridgeRedisToSocketIO(io: SocketIOServer): Promise<void> {
	const subscriber = getPubSubClient();

	// Subscribe to all kanban channels
	await subscriber.subscribe(TICKET_EVENTS);
	await subscriber.subscribe(PROJECT_EVENTS);
	await subscriber.subscribe(SYSTEM_EVENTS);
	// GAP-ROAD.1: Subscribe to pattern, memory, and agent channels
	await subscriber.subscribe(PATTERN_EVENTS);
	await subscriber.subscribe(MEMORY_EVENTS);
	await subscriber.subscribe(AGENT_EVENTS);

	// Forward messages to Socket.IO
	subscriber.on('message', (channel: string, message: string) => {
		try {
			const event = JSON.parse(message);
			io.emit(channel, event);
		} catch (error) {
			console.error('Failed to parse Redis message:', error);
		}
	});
}

/**
 * Create channel-specific event helpers for convenience
 */
export const channels = {
	tickets: TICKET_EVENTS,
	projects: PROJECT_EVENTS,
	system: SYSTEM_EVENTS,
	// GAP-ROAD.1: New channels
	patterns: PATTERN_EVENTS,
	memory: MEMORY_EVENTS,
	agents: AGENT_EVENTS
} as const;
