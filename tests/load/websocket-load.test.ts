/**
 * TASK-040: Load Testing for WebSocket Connections
 *
 * These tests verify WebSocket performance under load conditions.
 *
 * Test Coverage:
 * - 50+ concurrent connections
 * - Event latency measurement
 * - Performance baselines
 * - Resource cleanup
 *
 * Performance Requirements:
 * - Average latency: <100ms
 * - P95 latency: <200ms
 * - Support 50+ concurrent connections
 *
 * Note: These tests use mock implementations to simulate load.
 * Real-world performance may vary based on network conditions,
 * server resources, and actual WebSocket implementation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	MockWebSocketServer,
	MockWebSocketClient,
	createConnectedClient,
	createMultipleClients,
	resetClientIdCounter,
	measureLatency,
	calculateStats
} from '../utils/websocket-test-utils';

/**
 * Performance baseline documentation
 *
 * These baselines were established using mock WebSocket connections.
 * Real-world performance testing should be conducted with actual
 * WebSocket servers under production-like conditions.
 *
 * Baseline Environment:
 * - Mock WebSocket implementation
 * - Vitest test runner
 * - Single-threaded JavaScript execution
 *
 * Expected Performance (Mock):
 * - Connection establishment: <1ms per client
 * - Event broadcast: <1ms per event
 * - Room operations: <1ms per operation
 *
 * Target Performance (Production):
 * - Average latency: <100ms
 * - P95 latency: <200ms
 * - P99 latency: <500ms
 * - Max connections: 50+ per server instance
 */

describe('WebSocket Load Testing', () => {
	let server: MockWebSocketServer;

	beforeEach(() => {
		server = new MockWebSocketServer();
		resetClientIdCounter();
	});

	afterEach(() => {
		server.reset();
	});

	describe('Concurrent Connections', () => {
		it('should handle 50 concurrent connections', () => {
			const clients = createMultipleClients(50);
			clients.forEach((client) => server.addClient(client));

			expect(server.getConnectedClientCount()).toBe(50);

			// Verify all clients are connected
			clients.forEach((client) => {
				expect(client.isConnected).toBe(true);
			});
		});

		it('should handle 100 concurrent connections', () => {
			const clients = createMultipleClients(100);
			clients.forEach((client) => server.addClient(client));

			expect(server.getConnectedClientCount()).toBe(100);
		});

		it('should handle connections joining multiple rooms', () => {
			const clients = createMultipleClients(50);
			clients.forEach((client) => server.addClient(client));

			// Distribute clients across 10 rooms
			clients.forEach((client, index) => {
				const roomId = `room-${index % 10}`;
				server.joinRoom(client.connectionId, roomId);
			});

			// Each room should have 5 clients
			for (let i = 0; i < 10; i++) {
				const room = server.getRoom(`room-${i}`);
				expect(room?.members.size).toBe(5);
			}
		});

		it('should maintain connection stability under load', () => {
			const clients = createMultipleClients(50);
			clients.forEach((client) => server.addClient(client));

			// Simulate activity
			for (let i = 0; i < 100; i++) {
				const randomClient = clients[Math.floor(Math.random() * clients.length)];
				randomClient.send({
					type: 'ticket:updated',
					payload: { iteration: i },
					timestamp: Date.now()
				});
			}

			// All clients should still be connected
			expect(server.getConnectedClientCount()).toBe(50);
		});
	});

	describe('Event Latency', () => {
		it('should measure broadcast latency for single event', () => {
			const client = createConnectedClient();
			server.addClient(client);
			server.joinRoom(client.connectionId, 'test-room');
			client.clearEvents();

			const startTime = Date.now();

			server.broadcastToRoom('test-room', {
				type: 'ticket:created',
				payload: { id: '1' },
				timestamp: startTime
			});

			const latency = measureLatency(startTime);

			// Mock should be nearly instant
			expect(latency).toBeLessThan(100);
			expect(client.receivedEvents).toHaveLength(1);
		});

		it('should maintain acceptable latency with 50 clients in same room', () => {
			const clients = createMultipleClients(50);
			clients.forEach((client) => {
				server.addClient(client);
				server.joinRoom(client.connectionId, 'shared-room');
				client.clearEvents();
			});

			const latencies: number[] = [];

			// Send 100 events
			for (let i = 0; i < 100; i++) {
				const startTime = Date.now();

				server.broadcastToRoom('shared-room', {
					type: 'ticket:updated',
					payload: { eventNumber: i },
					timestamp: startTime
				});

				latencies.push(measureLatency(startTime));
			}

			const stats = calculateStats(latencies);

			// Document baseline
			console.log('Latency Statistics (50 clients, 100 events):');
			console.log(`  Min: ${stats.min}ms`);
			console.log(`  Max: ${stats.max}ms`);
			console.log(`  Avg: ${stats.avg.toFixed(2)}ms`);
			console.log(`  P50: ${stats.p50}ms`);
			console.log(`  P95: ${stats.p95}ms`);
			console.log(`  P99: ${stats.p99}ms`);

			// Assert performance requirements
			expect(stats.avg).toBeLessThan(100);
			expect(stats.p95).toBeLessThan(200);
		});

		it('should maintain acceptable latency with high event volume', () => {
			const clients = createMultipleClients(20);
			clients.forEach((client) => {
				server.addClient(client);
				server.joinRoom(client.connectionId, 'high-volume-room');
			});

			const latencies: number[] = [];

			// Send 500 events rapidly
			for (let i = 0; i < 500; i++) {
				const startTime = Date.now();

				server.broadcastToRoom('high-volume-room', {
					type: 'ticket:transition',
					payload: { from: 'BACKLOG', to: 'TODO', eventNumber: i },
					timestamp: startTime
				});

				latencies.push(measureLatency(startTime));
			}

			const stats = calculateStats(latencies);

			console.log('High Volume Latency Statistics (20 clients, 500 events):');
			console.log(`  Avg: ${stats.avg.toFixed(2)}ms`);
			console.log(`  P95: ${stats.p95}ms`);

			expect(stats.avg).toBeLessThan(100);
			expect(stats.p95).toBeLessThan(200);
		});
	});

	describe('Room Broadcast Performance', () => {
		it('should measure broadcast time per room size', () => {
			const roomSizes = [5, 10, 25, 50];
			const results: { size: number; avgLatency: number }[] = [];

			roomSizes.forEach((size) => {
				const clients = createMultipleClients(size);
				clients.forEach((client) => {
					server.addClient(client);
					server.joinRoom(client.connectionId, `room-size-${size}`);
				});

				const latencies: number[] = [];

				for (let i = 0; i < 50; i++) {
					const startTime = Date.now();
					server.broadcastToRoom(`room-size-${size}`, {
						type: 'ticket:updated',
						payload: { iteration: i },
						timestamp: startTime
					});
					latencies.push(measureLatency(startTime));
				}

				const stats = calculateStats(latencies);
				results.push({ size, avgLatency: stats.avg });

				// Clean up for next iteration
				clients.forEach((client) => {
					server.leaveRoom(client.connectionId, `room-size-${size}`);
					server.removeClient(client.connectionId);
				});
			});

			console.log('Broadcast Latency by Room Size:');
			results.forEach(({ size, avgLatency }) => {
				console.log(`  ${size} clients: ${avgLatency.toFixed(2)}ms avg`);
			});

			// All room sizes should meet latency requirements
			results.forEach(({ avgLatency }) => {
				expect(avgLatency).toBeLessThan(100);
			});
		});

		it('should isolate room performance (no cross-room impact)', () => {
			// Create two rooms with different loads using unique prefixes
			const heavyRoomClients = createMultipleClients(50, 'heavy');
			const lightRoomClients = createMultipleClients(5, 'light');

			heavyRoomClients.forEach((client) => {
				server.addClient(client);
				server.joinRoom(client.connectionId, 'heavy-room');
			});

			lightRoomClients.forEach((client) => {
				server.addClient(client);
				server.joinRoom(client.connectionId, 'light-room');
				client.clearEvents();
			});

			// Hammer the heavy room
			for (let i = 0; i < 100; i++) {
				server.broadcastToRoom('heavy-room', {
					type: 'ticket:updated',
					payload: { heavyEvent: i },
					timestamp: Date.now()
				});
			}

			// Measure light room latency
			const lightRoomLatencies: number[] = [];
			for (let i = 0; i < 50; i++) {
				const startTime = Date.now();
				server.broadcastToRoom('light-room', {
					type: 'ticket:created',
					payload: { lightEvent: i },
					timestamp: startTime
				});
				lightRoomLatencies.push(measureLatency(startTime));
			}

			const stats = calculateStats(lightRoomLatencies);

			// Light room should not be affected by heavy room
			expect(stats.avg).toBeLessThan(100);
			expect(stats.p95).toBeLessThan(200);

			// Light room clients should only receive their events
			lightRoomClients.forEach((client) => {
				const heavyEvents = client.receivedEvents.filter(
					(e) => e.payload && typeof e.payload === 'object' && 'heavyEvent' in e.payload
				);
				expect(heavyEvents).toHaveLength(0);
			});
		});
	});

	describe('Connection Churn', () => {
		it('should handle rapid connect/disconnect cycles', () => {
			const latencies: number[] = [];

			for (let cycle = 0; cycle < 100; cycle++) {
				const startTime = Date.now();

				const client = createConnectedClient(`churn-client-${cycle}`);
				server.addClient(client);
				server.joinRoom(client.connectionId, 'churn-room');
				client.disconnect();
				server.removeClient(client.connectionId);

				latencies.push(measureLatency(startTime));
			}

			const stats = calculateStats(latencies);

			console.log('Connection Churn Statistics (100 cycles):');
			console.log(`  Avg: ${stats.avg.toFixed(2)}ms`);
			console.log(`  P95: ${stats.p95}ms`);

			expect(stats.avg).toBeLessThan(100);

			// Server should be clean after churn
			expect(server.getConnectedClientCount()).toBe(0);
			expect(server.getAllRooms()).toHaveLength(0);
		});

		it('should maintain performance with ongoing churn', () => {
			// Establish baseline connections
			const stableClients = createMultipleClients(20);
			stableClients.forEach((client) => {
				server.addClient(client);
				server.joinRoom(client.connectionId, 'stable-room');
			});

			// Measure latency while churn is happening
			const latencies: number[] = [];

			for (let i = 0; i < 50; i++) {
				// Churn: add and remove a client
				const churnClient = createConnectedClient(`churn-${i}`);
				server.addClient(churnClient);
				server.joinRoom(churnClient.connectionId, 'churn-only-room');

				// Measure broadcast to stable room
				const startTime = Date.now();
				server.broadcastToRoom('stable-room', {
					type: 'ticket:updated',
					payload: { stableEvent: i },
					timestamp: startTime
				});
				latencies.push(measureLatency(startTime));

				// Complete churn
				server.removeClient(churnClient.connectionId);
			}

			const stats = calculateStats(latencies);

			console.log('Latency During Churn (20 stable + churn):');
			console.log(`  Avg: ${stats.avg.toFixed(2)}ms`);
			console.log(`  P95: ${stats.p95}ms`);

			expect(stats.avg).toBeLessThan(100);
			expect(stats.p95).toBeLessThan(200);
		});
	});

	describe('Memory and Resource Management', () => {
		it('should clean up resources after client disconnect', () => {
			const clients = createMultipleClients(50);
			clients.forEach((client) => {
				server.addClient(client);
				server.joinRoom(client.connectionId, 'resource-test-room');
			});

			expect(server.getConnectedClientCount()).toBe(50);
			expect(server.getRoom('resource-test-room')?.members.size).toBe(50);

			// Disconnect all clients
			clients.forEach((client) => {
				client.disconnect();
				server.removeClient(client.connectionId);
			});

			expect(server.getConnectedClientCount()).toBe(0);
			expect(server.getRoom('resource-test-room')).toBeUndefined();
		});

		it('should clean up broadcast history on reset', () => {
			const client = createConnectedClient();
			server.addClient(client);
			server.joinRoom(client.connectionId, 'history-test');

			// Generate broadcast history
			for (let i = 0; i < 100; i++) {
				server.broadcastToRoom('history-test', {
					type: 'ticket:updated',
					payload: { i },
					timestamp: Date.now()
				});
			}

			expect(server.getBroadcastHistory().length).toBeGreaterThan(0);

			server.reset();

			expect(server.getBroadcastHistory()).toHaveLength(0);
		});

		it('should handle server reset under load', () => {
			const clients = createMultipleClients(50);
			clients.forEach((client) => {
				server.addClient(client);
				server.joinRoom(client.connectionId, `room-${Math.floor(Math.random() * 10)}`);
			});

			// Send events
			for (let i = 0; i < 100; i++) {
				server.broadcastToAll({
					type: 'ticket:created',
					payload: { i },
					timestamp: Date.now()
				});
			}

			const resetStart = Date.now();
			server.reset();
			const resetLatency = measureLatency(resetStart);

			console.log(`Server reset latency: ${resetLatency}ms`);

			expect(resetLatency).toBeLessThan(100);
			expect(server.getConnectedClientCount()).toBe(0);
			expect(server.getAllRooms()).toHaveLength(0);
			expect(server.getBroadcastHistory()).toHaveLength(0);
		});
	});

	describe('Event Throughput', () => {
		it('should measure maximum events per second', () => {
			const clients = createMultipleClients(10);
			clients.forEach((client) => {
				server.addClient(client);
				server.joinRoom(client.connectionId, 'throughput-room');
			});

			const duration = 100; // ms
			const startTime = Date.now();
			let eventCount = 0;

			while (Date.now() - startTime < duration) {
				server.broadcastToRoom('throughput-room', {
					type: 'ticket:updated',
					payload: { count: eventCount },
					timestamp: Date.now()
				});
				eventCount++;
			}

			const actualDuration = Date.now() - startTime;
			const eventsPerSecond = (eventCount / actualDuration) * 1000;

			console.log('Throughput Test Results:');
			console.log(`  Events sent: ${eventCount}`);
			console.log(`  Duration: ${actualDuration}ms`);
			console.log(`  Throughput: ${eventsPerSecond.toFixed(0)} events/sec`);

			// Each client should have received all events
			clients.forEach((client) => {
				const updateEvents = client.receivedEvents.filter((e) => e.type === 'ticket:updated');
				expect(updateEvents.length).toBe(eventCount);
			});
		});

		it('should handle burst traffic', () => {
			const clients = createMultipleClients(25);
			clients.forEach((client) => {
				server.addClient(client);
				server.joinRoom(client.connectionId, 'burst-room');
				client.clearEvents();
			});

			// Send 1000 events as fast as possible
			const burstSize = 1000;
			const startTime = Date.now();

			for (let i = 0; i < burstSize; i++) {
				server.broadcastToRoom('burst-room', {
					type: 'ticket:transition',
					payload: { eventIndex: i },
					timestamp: Date.now()
				});
			}

			const burstDuration = Date.now() - startTime;

			console.log(`Burst Test (${burstSize} events to 25 clients):`);
			console.log(`  Duration: ${burstDuration}ms`);
			console.log(
				`  Rate: ${((burstSize / burstDuration) * 1000).toFixed(0)} events/sec`
			);

			// Verify all clients received all events
			clients.forEach((client) => {
				expect(client.receivedEvents).toHaveLength(burstSize);
			});
		});
	});
});

describe('Performance Baseline Documentation', () => {
	/**
	 * This test documents the performance baseline for WebSocket operations.
	 * It should be run periodically to detect performance regressions.
	 */
	it('should document performance baseline', () => {
		const server = new MockWebSocketServer();
		const results: Record<string, number> = {};

		// Baseline 1: Connection time
		const connectionStart = Date.now();
		const clients = createMultipleClients(50);
		clients.forEach((c) => server.addClient(c));
		results['50_connections_ms'] = Date.now() - connectionStart;

		// Baseline 2: Room join time
		const joinStart = Date.now();
		clients.forEach((c) => server.joinRoom(c.connectionId, 'baseline-room'));
		results['50_room_joins_ms'] = Date.now() - joinStart;

		// Baseline 3: Broadcast time
		clients.forEach((c) => c.clearEvents());
		const broadcastLatencies: number[] = [];
		for (let i = 0; i < 100; i++) {
			const start = Date.now();
			server.broadcastToRoom('baseline-room', {
				type: 'ticket:updated',
				payload: { i },
				timestamp: start
			});
			broadcastLatencies.push(Date.now() - start);
		}
		const broadcastStats = calculateStats(broadcastLatencies);
		results['broadcast_avg_ms'] = broadcastStats.avg;
		results['broadcast_p95_ms'] = broadcastStats.p95;
		results['broadcast_p99_ms'] = broadcastStats.p99;

		// Baseline 4: Cleanup time
		const cleanupStart = Date.now();
		server.reset();
		results['cleanup_ms'] = Date.now() - cleanupStart;

		console.log('\n=== WebSocket Performance Baseline ===');
		console.log(JSON.stringify(results, null, 2));
		console.log('======================================\n');

		// Assert baselines are met
		expect(results['50_connections_ms']).toBeLessThan(100);
		expect(results['50_room_joins_ms']).toBeLessThan(100);
		expect(results['broadcast_avg_ms']).toBeLessThan(100);
		expect(results['broadcast_p95_ms']).toBeLessThan(200);
		expect(results['cleanup_ms']).toBeLessThan(100);
	});
});
