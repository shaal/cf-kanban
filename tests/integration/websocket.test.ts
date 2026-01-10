/**
 * TASK-038: WebSocket Event Tests
 *
 * These tests verify WebSocket functionality for real-time updates in CF-Kanban.
 *
 * Test Coverage:
 * - Event emission and reception
 * - Room management (join/leave)
 * - Isolation between rooms
 * - Connection lifecycle
 * - Error handling
 *
 * Note: These tests use mocks to simulate WebSocket behavior.
 * When the actual WebSocket implementation is complete, some tests
 * may need to be updated to use real connections.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	MockWebSocketClient,
	MockWebSocketServer,
	createConnectedClient,
	createMultipleClients,
	waitForEvent,
	type WebSocketEvent,
	type WebSocketEventType
} from '../utils/websocket-test-utils';

describe('WebSocket Event Tests', () => {
	let server: MockWebSocketServer;

	beforeEach(() => {
		server = new MockWebSocketServer();
	});

	afterEach(() => {
		server.reset();
	});

	describe('Connection Lifecycle', () => {
		it('should emit connection:established event on connect', () => {
			const client = new MockWebSocketClient('test-client');

			client.connect();

			expect(client.isConnected).toBe(true);
			expect(client.receivedEvents).toHaveLength(1);
			expect(client.receivedEvents[0].type).toBe('connection:established');
			expect(client.receivedEvents[0].payload).toEqual({ connectionId: 'test-client' });
		});

		it('should emit connection:closed event on disconnect', () => {
			const client = createConnectedClient('test-client');

			client.disconnect();

			expect(client.isConnected).toBe(false);
			expect(client.receivedEvents.some((e) => e.type === 'connection:closed')).toBe(true);
		});

		it('should throw error when sending on disconnected socket', () => {
			const client = new MockWebSocketClient();

			expect(() => {
				client.send({ type: 'ticket:created', payload: {}, timestamp: Date.now() });
			}).toThrow('WebSocket is not connected');
		});

		it('should track send calls via mock', () => {
			const client = createConnectedClient();
			const event: WebSocketEvent = {
				type: 'ticket:created',
				payload: { id: '123', title: 'Test' },
				timestamp: Date.now()
			};

			client.send(event);

			const { send } = client.getMocks();
			expect(send).toHaveBeenCalledWith(event);
		});
	});

	describe('Event Emission and Reception', () => {
		it('should receive emitted events', () => {
			const client = createConnectedClient();
			const receivedEvents: WebSocketEvent[] = [];

			client.on('ticket:created', (event) => {
				receivedEvents.push(event);
			});

			client.emit({
				type: 'ticket:created',
				payload: { id: '1', title: 'New Ticket' },
				timestamp: Date.now()
			});

			expect(receivedEvents).toHaveLength(1);
			expect(receivedEvents[0].type).toBe('ticket:created');
		});

		it('should support multiple handlers for same event type', () => {
			const client = createConnectedClient();
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			client.on('ticket:updated', handler1);
			client.on('ticket:updated', handler2);

			client.emit({
				type: 'ticket:updated',
				payload: { id: '1', status: 'IN_PROGRESS' },
				timestamp: Date.now()
			});

			expect(handler1).toHaveBeenCalled();
			expect(handler2).toHaveBeenCalled();
		});

		it('should support wildcard event handlers', () => {
			const client = createConnectedClient();
			const allEvents: WebSocketEvent[] = [];

			client.on('*', (event) => {
				allEvents.push(event);
			});

			client.emit({ type: 'ticket:created', payload: {}, timestamp: Date.now() });
			client.emit({ type: 'ticket:updated', payload: {}, timestamp: Date.now() });
			client.emit({ type: 'ticket:deleted', payload: {}, timestamp: Date.now() });

			// Note: connection:established is the first event
			expect(allEvents.length).toBeGreaterThanOrEqual(3);
		});

		it('should allow unregistering event handlers', () => {
			const client = createConnectedClient();
			const handler = vi.fn();

			client.on('ticket:transition', handler);
			client.emit({ type: 'ticket:transition', payload: {}, timestamp: Date.now() });

			expect(handler).toHaveBeenCalledTimes(1);

			client.off('ticket:transition', handler);
			client.emit({ type: 'ticket:transition', payload: {}, timestamp: Date.now() });

			expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
		});

		it('should include timestamp in all events', () => {
			const client = createConnectedClient();
			const before = Date.now();

			client.emit({ type: 'ticket:created', payload: {}, timestamp: Date.now() });

			const after = Date.now();
			const event = client.receivedEvents.find((e) => e.type === 'ticket:created');

			expect(event?.timestamp).toBeGreaterThanOrEqual(before);
			expect(event?.timestamp).toBeLessThanOrEqual(after);
		});

		it('should handle all ticket event types', () => {
			const client = createConnectedClient();
			const eventTypes: WebSocketEventType[] = [
				'ticket:created',
				'ticket:updated',
				'ticket:deleted',
				'ticket:transition'
			];

			eventTypes.forEach((type) => {
				client.emit({ type, payload: { eventType: type }, timestamp: Date.now() });
			});

			eventTypes.forEach((type) => {
				const found = client.receivedEvents.find((e) => e.type === type);
				expect(found).toBeDefined();
			});
		});
	});

	describe('Room Management - Join', () => {
		it('should join a room successfully', () => {
			const client = createConnectedClient();
			server.addClient(client);

			const result = server.joinRoom(client.connectionId, 'project-123');

			expect(result).toBe(true);
			expect(client.currentRoom).toBe('project-123');
		});

		it('should emit room:joined event when joining', () => {
			const client = createConnectedClient();
			server.addClient(client);
			client.clearEvents();

			server.joinRoom(client.connectionId, 'project-123');

			const joinEvent = client.receivedEvents.find((e) => e.type === 'room:joined');
			expect(joinEvent).toBeDefined();
			expect(joinEvent?.roomId).toBe('project-123');
		});

		it('should create room if it does not exist', () => {
			const client = createConnectedClient();
			server.addClient(client);

			expect(server.getRoom('new-room')).toBeUndefined();

			server.joinRoom(client.connectionId, 'new-room');

			expect(server.getRoom('new-room')).toBeDefined();
		});

		it('should add client to room members', () => {
			const client = createConnectedClient('client-1');
			server.addClient(client);

			server.joinRoom('client-1', 'project-123');

			const room = server.getRoom('project-123');
			expect(room?.members.has('client-1')).toBe(true);
		});

		it('should fail to join room if not connected', () => {
			const client = new MockWebSocketClient('client-1');
			server.addClient(client);

			const result = server.joinRoom('client-1', 'project-123');

			expect(result).toBe(false);
		});

		it('should leave previous room when joining new room', () => {
			const client = createConnectedClient('client-1');
			server.addClient(client);

			server.joinRoom('client-1', 'room-1');
			server.joinRoom('client-1', 'room-2');

			expect(client.currentRoom).toBe('room-2');
			expect(server.getRoom('room-1')?.members.has('client-1')).toBeFalsy();
			expect(server.getRoom('room-2')?.members.has('client-1')).toBe(true);
		});
	});

	describe('Room Management - Leave', () => {
		it('should leave a room successfully', () => {
			const client = createConnectedClient('client-1');
			server.addClient(client);
			server.joinRoom('client-1', 'project-123');

			const result = server.leaveRoom('client-1', 'project-123');

			expect(result).toBe(true);
			expect(client.currentRoom).toBeNull();
		});

		it('should emit room:left event when leaving', () => {
			const client = createConnectedClient('client-1');
			server.addClient(client);
			server.joinRoom('client-1', 'project-123');
			client.clearEvents();

			server.leaveRoom('client-1', 'project-123');

			const leaveEvent = client.receivedEvents.find((e) => e.type === 'room:left');
			expect(leaveEvent).toBeDefined();
			expect(leaveEvent?.roomId).toBe('project-123');
		});

		it('should remove client from room members', () => {
			const client = createConnectedClient('client-1');
			server.addClient(client);
			server.joinRoom('client-1', 'project-123');

			server.leaveRoom('client-1', 'project-123');

			const room = server.getRoom('project-123');
			// Room should be deleted when empty
			expect(room).toBeUndefined();
		});

		it('should clean up empty rooms', () => {
			const client = createConnectedClient('client-1');
			server.addClient(client);
			server.joinRoom('client-1', 'project-123');

			expect(server.getAllRooms()).toHaveLength(1);

			server.leaveRoom('client-1', 'project-123');

			expect(server.getAllRooms()).toHaveLength(0);
		});

		it('should fail to leave room that client is not in', () => {
			const client = createConnectedClient('client-1');
			server.addClient(client);

			const result = server.leaveRoom('client-1', 'nonexistent-room');

			expect(result).toBe(false);
		});

		it('should leave room when client disconnects', () => {
			const client = createConnectedClient('client-1');
			server.addClient(client);
			server.joinRoom('client-1', 'project-123');

			server.removeClient('client-1');

			expect(server.getRoom('project-123')).toBeUndefined();
		});
	});

	describe('Room Isolation', () => {
		it('should only broadcast to clients in the same room', () => {
			const client1 = createConnectedClient('client-1');
			const client2 = createConnectedClient('client-2');
			const client3 = createConnectedClient('client-3');

			server.addClient(client1);
			server.addClient(client2);
			server.addClient(client3);

			server.joinRoom('client-1', 'room-a');
			server.joinRoom('client-2', 'room-a');
			server.joinRoom('client-3', 'room-b');

			client1.clearEvents();
			client2.clearEvents();
			client3.clearEvents();

			server.broadcastToRoom('room-a', {
				type: 'ticket:created',
				payload: { id: '1' },
				timestamp: Date.now()
			});

			// Clients in room-a should receive the event
			expect(client1.receivedEvents.some((e) => e.type === 'ticket:created')).toBe(true);
			expect(client2.receivedEvents.some((e) => e.type === 'ticket:created')).toBe(true);

			// Client in room-b should NOT receive the event
			expect(client3.receivedEvents.some((e) => e.type === 'ticket:created')).toBe(false);
		});

		it('should not receive events from other rooms', () => {
			const client1 = createConnectedClient('client-1');
			const client2 = createConnectedClient('client-2');

			server.addClient(client1);
			server.addClient(client2);

			server.joinRoom('client-1', 'project-a');
			server.joinRoom('client-2', 'project-b');

			client1.clearEvents();
			client2.clearEvents();

			// Broadcast to project-a
			server.broadcastToRoom('project-a', {
				type: 'ticket:updated',
				payload: { projectId: 'project-a' },
				timestamp: Date.now()
			});

			// Broadcast to project-b
			server.broadcastToRoom('project-b', {
				type: 'ticket:deleted',
				payload: { projectId: 'project-b' },
				timestamp: Date.now()
			});

			// Each client should only see their room's events
			expect(client1.receivedEvents.some((e) => e.type === 'ticket:updated')).toBe(true);
			expect(client1.receivedEvents.some((e) => e.type === 'ticket:deleted')).toBe(false);

			expect(client2.receivedEvents.some((e) => e.type === 'ticket:deleted')).toBe(true);
			expect(client2.receivedEvents.some((e) => e.type === 'ticket:updated')).toBe(false);
		});

		it('should maintain separate member lists per room', () => {
			const clients = createMultipleClients(5);
			clients.forEach((c) => server.addClient(c));

			// First 3 join room-a
			server.joinRoom('client-0', 'room-a');
			server.joinRoom('client-1', 'room-a');
			server.joinRoom('client-2', 'room-a');

			// Last 2 join room-b
			server.joinRoom('client-3', 'room-b');
			server.joinRoom('client-4', 'room-b');

			const roomA = server.getRoom('room-a');
			const roomB = server.getRoom('room-b');

			expect(roomA?.members.size).toBe(3);
			expect(roomB?.members.size).toBe(2);
		});

		it('should include roomId in broadcast events', () => {
			const client = createConnectedClient('client-1');
			server.addClient(client);
			server.joinRoom('client-1', 'project-xyz');
			client.clearEvents();

			server.broadcastToRoom('project-xyz', {
				type: 'ticket:transition',
				payload: { from: 'TODO', to: 'IN_PROGRESS' },
				timestamp: Date.now()
			});

			const event = client.receivedEvents.find((e) => e.type === 'ticket:transition');
			expect(event?.roomId).toBe('project-xyz');
		});
	});

	describe('Broadcast', () => {
		it('should broadcast to all connected clients', () => {
			const clients = createMultipleClients(5);
			clients.forEach((c) => server.addClient(c));
			clients.forEach((c) => c.clearEvents());

			server.broadcastToAll({
				type: 'connection:established',
				payload: { message: 'Server update' },
				timestamp: Date.now()
			});

			clients.forEach((client) => {
				expect(
					client.receivedEvents.some(
						(e) => e.type === 'connection:established' && e.payload.message === 'Server update'
					)
				).toBe(true);
			});
		});

		it('should not broadcast to disconnected clients', () => {
			const client1 = createConnectedClient('client-1');
			const client2 = createConnectedClient('client-2');

			server.addClient(client1);
			server.addClient(client2);

			client2.disconnect();
			client1.clearEvents();
			client2.clearEvents();

			server.broadcastToAll({
				type: 'ticket:created',
				payload: {},
				timestamp: Date.now()
			});

			expect(client1.receivedEvents.some((e) => e.type === 'ticket:created')).toBe(true);
			expect(client2.receivedEvents.some((e) => e.type === 'ticket:created')).toBe(false);
		});

		it('should track broadcast history', () => {
			const client = createConnectedClient('client-1');
			server.addClient(client);
			server.joinRoom('client-1', 'room-1');

			server.broadcastToRoom('room-1', { type: 'ticket:created', payload: {}, timestamp: 1 });
			server.broadcastToRoom('room-1', { type: 'ticket:updated', payload: {}, timestamp: 2 });
			server.broadcastToAll({ type: 'ticket:deleted', payload: {}, timestamp: 3 });

			const history = server.getBroadcastHistory();
			expect(history).toHaveLength(3);
			expect(history[0].type).toBe('ticket:created');
			expect(history[1].type).toBe('ticket:updated');
			expect(history[2].type).toBe('ticket:deleted');
		});
	});

	describe('Server State', () => {
		it('should track connected client count', () => {
			const client1 = createConnectedClient('client-1');
			const client2 = createConnectedClient('client-2');
			const client3 = new MockWebSocketClient('client-3'); // Not connected

			server.addClient(client1);
			server.addClient(client2);
			server.addClient(client3);

			expect(server.getConnectedClientCount()).toBe(2);

			client1.disconnect();
			expect(server.getConnectedClientCount()).toBe(1);
		});

		it('should reset server state correctly', () => {
			const client = createConnectedClient('client-1');
			server.addClient(client);
			server.joinRoom('client-1', 'room-1');
			server.broadcastToRoom('room-1', { type: 'ticket:created', payload: {}, timestamp: 1 });

			server.reset();

			expect(server.getAllRooms()).toHaveLength(0);
			expect(server.getConnectedClientCount()).toBe(0);
			expect(server.getBroadcastHistory()).toHaveLength(0);
		});
	});
});

describe('WebSocket Error Handling', () => {
	it('should handle connection errors gracefully', () => {
		const client = new MockWebSocketClient();
		let errorReceived = false;

		client.on('connection:error', () => {
			errorReceived = true;
		});

		client.emit({
			type: 'connection:error',
			payload: { code: 1006, reason: 'Connection lost' },
			timestamp: Date.now()
		});

		expect(errorReceived).toBe(true);
	});

	it('should clear events correctly', () => {
		const client = createConnectedClient();
		expect(client.receivedEvents.length).toBeGreaterThan(0);

		client.clearEvents();

		expect(client.receivedEvents).toHaveLength(0);
	});
});

describe('Async Event Handling', () => {
	it('should wait for specific event with timeout', async () => {
		const client = createConnectedClient();

		const eventPromise = waitForEvent(client, 'ticket:created', 100);

		// Emit the event after a short delay
		setTimeout(() => {
			client.emit({
				type: 'ticket:created',
				payload: { id: 'test-123' },
				timestamp: Date.now()
			});
		}, 10);

		const event = await eventPromise;
		expect(event.type).toBe('ticket:created');
		expect(event.payload).toEqual({ id: 'test-123' });
	});

	it('should reject promise on timeout', async () => {
		const client = createConnectedClient();

		await expect(waitForEvent(client, 'ticket:deleted', 50)).rejects.toThrow(
			'Timeout waiting for event: ticket:deleted'
		);
	});
});
