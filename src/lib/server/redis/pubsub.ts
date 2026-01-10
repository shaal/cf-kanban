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
	system: SYSTEM_EVENTS
} as const;
