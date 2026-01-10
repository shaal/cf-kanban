/**
 * WebSocket Test Utilities
 *
 * TASK-038: WebSocket testing infrastructure
 *
 * These utilities provide mocks and helpers for testing WebSocket functionality.
 * They allow tests to run without a real WebSocket server while still
 * verifying the correct behavior of WebSocket event handling.
 */

import { vi, type Mock } from 'vitest';

/**
 * WebSocket event types used in the application
 */
export type WebSocketEventType =
	| 'ticket:created'
	| 'ticket:updated'
	| 'ticket:deleted'
	| 'ticket:transition'
	| 'room:joined'
	| 'room:left'
	| 'connection:established'
	| 'connection:error'
	| 'connection:closed';

/**
 * WebSocket event payload structure
 */
export interface WebSocketEvent<T = unknown> {
	type: WebSocketEventType;
	payload: T;
	roomId?: string;
	timestamp: number;
}

/**
 * Room membership tracking
 */
export interface RoomState {
	roomId: string;
	members: Set<string>;
	createdAt: number;
}

/**
 * Mock WebSocket client for testing
 */
export class MockWebSocketClient {
	public connectionId: string;
	public isConnected: boolean = false;
	public currentRoom: string | null = null;
	public receivedEvents: WebSocketEvent[] = [];

	private eventHandlers: Map<string, ((event: WebSocketEvent) => void)[]> = new Map();
	private mockSend: Mock;
	private mockClose: Mock;

	constructor(connectionId: string = `test-client-${Date.now()}`) {
		this.connectionId = connectionId;
		this.mockSend = vi.fn();
		this.mockClose = vi.fn();
	}

	/**
	 * Simulate connection establishment
	 */
	connect(): void {
		this.isConnected = true;
		this.emit({
			type: 'connection:established',
			payload: { connectionId: this.connectionId },
			timestamp: Date.now()
		});
	}

	/**
	 * Simulate connection close
	 * Note: currentRoom is preserved for cleanup by server.removeClient()
	 */
	disconnect(): void {
		this.isConnected = false;
		// Don't clear currentRoom here - let server.removeClient() handle room cleanup
		this.mockClose();
		this.emit({
			type: 'connection:closed',
			payload: { connectionId: this.connectionId },
			timestamp: Date.now()
		});
	}

	/**
	 * Send a message through the WebSocket
	 */
	send(event: WebSocketEvent): void {
		if (!this.isConnected) {
			throw new Error('WebSocket is not connected');
		}
		this.mockSend(event);
	}

	/**
	 * Register an event handler
	 */
	on(eventType: string, handler: (event: WebSocketEvent) => void): void {
		const handlers = this.eventHandlers.get(eventType) || [];
		handlers.push(handler);
		this.eventHandlers.set(eventType, handlers);
	}

	/**
	 * Unregister an event handler
	 */
	off(eventType: string, handler: (event: WebSocketEvent) => void): void {
		const handlers = this.eventHandlers.get(eventType) || [];
		const index = handlers.indexOf(handler);
		if (index !== -1) {
			handlers.splice(index, 1);
		}
	}

	/**
	 * Emit an event to all registered handlers
	 */
	emit(event: WebSocketEvent): void {
		this.receivedEvents.push(event);
		const handlers = this.eventHandlers.get(event.type) || [];
		handlers.forEach((handler) => handler(event));

		// Also emit to wildcard handlers
		const wildcardHandlers = this.eventHandlers.get('*') || [];
		wildcardHandlers.forEach((handler) => handler(event));
	}

	/**
	 * Clear all received events
	 */
	clearEvents(): void {
		this.receivedEvents = [];
	}

	/**
	 * Get mock functions for assertions
	 */
	getMocks() {
		return {
			send: this.mockSend,
			close: this.mockClose
		};
	}
}

/**
 * Mock WebSocket server for testing room management
 */
export class MockWebSocketServer {
	private rooms: Map<string, RoomState> = new Map();
	private clients: Map<string, MockWebSocketClient> = new Map();
	private broadcastHistory: WebSocketEvent[] = [];

	/**
	 * Register a client with the server
	 */
	addClient(client: MockWebSocketClient): void {
		this.clients.set(client.connectionId, client);
	}

	/**
	 * Remove a client from the server
	 */
	removeClient(clientId: string): void {
		const client = this.clients.get(clientId);
		if (client && client.currentRoom) {
			this.leaveRoom(clientId, client.currentRoom);
		}
		this.clients.delete(clientId);
	}

	/**
	 * Join a client to a room
	 */
	joinRoom(clientId: string, roomId: string): boolean {
		const client = this.clients.get(clientId);
		if (!client || !client.isConnected) {
			return false;
		}

		// Leave current room if any
		if (client.currentRoom) {
			this.leaveRoom(clientId, client.currentRoom);
		}

		// Create room if it doesn't exist
		if (!this.rooms.has(roomId)) {
			this.rooms.set(roomId, {
				roomId,
				members: new Set(),
				createdAt: Date.now()
			});
		}

		const room = this.rooms.get(roomId)!;
		room.members.add(clientId);
		client.currentRoom = roomId;

		// Notify client
		client.emit({
			type: 'room:joined',
			payload: { roomId, members: Array.from(room.members) },
			roomId,
			timestamp: Date.now()
		});

		return true;
	}

	/**
	 * Remove a client from a room
	 */
	leaveRoom(clientId: string, roomId: string): boolean {
		const room = this.rooms.get(roomId);
		const client = this.clients.get(clientId);

		if (!room || !room.members.has(clientId)) {
			return false;
		}

		room.members.delete(clientId);
		if (client) {
			client.currentRoom = null;
			client.emit({
				type: 'room:left',
				payload: { roomId },
				roomId,
				timestamp: Date.now()
			});
		}

		// Clean up empty rooms
		if (room.members.size === 0) {
			this.rooms.delete(roomId);
		}

		return true;
	}

	/**
	 * Broadcast an event to all clients in a room
	 */
	broadcastToRoom(roomId: string, event: Omit<WebSocketEvent, 'roomId'>): void {
		const room = this.rooms.get(roomId);
		if (!room) return;

		const fullEvent: WebSocketEvent = { ...event, roomId };
		this.broadcastHistory.push(fullEvent);

		room.members.forEach((clientId) => {
			const client = this.clients.get(clientId);
			if (client && client.isConnected) {
				client.emit(fullEvent);
			}
		});
	}

	/**
	 * Broadcast an event to all connected clients
	 */
	broadcastToAll(event: WebSocketEvent): void {
		this.broadcastHistory.push(event);
		this.clients.forEach((client) => {
			if (client.isConnected) {
				client.emit(event);
			}
		});
	}

	/**
	 * Get room state
	 */
	getRoom(roomId: string): RoomState | undefined {
		return this.rooms.get(roomId);
	}

	/**
	 * Get all rooms
	 */
	getAllRooms(): RoomState[] {
		return Array.from(this.rooms.values());
	}

	/**
	 * Get connected client count
	 */
	getConnectedClientCount(): number {
		let count = 0;
		this.clients.forEach((client) => {
			if (client.isConnected) count++;
		});
		return count;
	}

	/**
	 * Get broadcast history
	 */
	getBroadcastHistory(): WebSocketEvent[] {
		return [...this.broadcastHistory];
	}

	/**
	 * Clear server state
	 */
	reset(): void {
		this.rooms.clear();
		this.clients.clear();
		this.broadcastHistory = [];
	}
}

/**
 * Create a connected mock client
 */
export function createConnectedClient(id?: string): MockWebSocketClient {
	const client = new MockWebSocketClient(id);
	client.connect();
	return client;
}

// Counter for generating unique client IDs
let clientIdCounter = 0;

/**
 * Create multiple connected clients with unique IDs
 */
export function createMultipleClients(count: number, prefix: string = 'client'): MockWebSocketClient[] {
	return Array.from({ length: count }, () => {
		const id = `${prefix}-${clientIdCounter++}`;
		return createConnectedClient(id);
	});
}

/**
 * Reset the client ID counter (useful for test isolation)
 */
export function resetClientIdCounter(): void {
	clientIdCounter = 0;
}

/**
 * Wait for a specific event type
 */
export function waitForEvent(
	client: MockWebSocketClient,
	eventType: WebSocketEventType,
	timeout: number = 1000
): Promise<WebSocketEvent> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error(`Timeout waiting for event: ${eventType}`));
		}, timeout);

		const handler = (event: WebSocketEvent) => {
			if (event.type === eventType) {
				clearTimeout(timer);
				client.off(eventType, handler);
				resolve(event);
			}
		};

		client.on(eventType, handler);
	});
}

/**
 * Measure event latency
 */
export function measureLatency(startTime: number): number {
	return Date.now() - startTime;
}

/**
 * Calculate statistics from an array of numbers
 */
export function calculateStats(values: number[]): {
	min: number;
	max: number;
	avg: number;
	p50: number;
	p95: number;
	p99: number;
} {
	if (values.length === 0) {
		return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
	}

	const sorted = [...values].sort((a, b) => a - b);
	const sum = sorted.reduce((a, b) => a + b, 0);

	return {
		min: sorted[0],
		max: sorted[sorted.length - 1],
		avg: sum / sorted.length,
		p50: sorted[Math.floor(sorted.length * 0.5)],
		p95: sorted[Math.floor(sorted.length * 0.95)],
		p99: sorted[Math.floor(sorted.length * 0.99)]
	};
}
