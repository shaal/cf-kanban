/**
 * GAP-ROAD.1: Redis Pub/Sub Events Tests
 *
 * Tests for pattern, memory, and agent event publishing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Redis clients
const mockPublishClient = {
	publish: vi.fn().mockResolvedValue(1)
};

const mockSubscribeClient = {
	subscribe: vi.fn().mockResolvedValue(1),
	on: vi.fn()
};

vi.mock('$lib/server/redis', () => ({
	getRedisClient: vi.fn(() => mockPublishClient),
	getPubSubClient: vi.fn(() => mockSubscribeClient)
}));

describe('Redis Pub/Sub Events (GAP-ROAD.1)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Channel Constants', () => {
		it('should export PATTERN_EVENTS channel', async () => {
			const { PATTERN_EVENTS } = await import('$lib/server/redis/pubsub');
			expect(PATTERN_EVENTS).toBe('kanban:patterns');
		});

		it('should export MEMORY_EVENTS channel', async () => {
			const { MEMORY_EVENTS } = await import('$lib/server/redis/pubsub');
			expect(MEMORY_EVENTS).toBe('kanban:memory');
		});

		it('should export AGENT_EVENTS channel', async () => {
			const { AGENT_EVENTS } = await import('$lib/server/redis/pubsub');
			expect(AGENT_EVENTS).toBe('kanban:agents');
		});
	});

	describe('publishPatternEvent', () => {
		it('should publish pattern events to PATTERN_EVENTS channel', async () => {
			const { publishPatternEvent, PATTERN_EVENTS } = await import('$lib/server/redis/pubsub');

			const patternEvent = {
				type: 'pattern:created' as const,
				patternId: 'pattern-123',
				namespace: 'patterns',
				data: { name: 'New Pattern' }
			};

			await publishPatternEvent(patternEvent);

			expect(mockPublishClient.publish).toHaveBeenCalledWith(
				PATTERN_EVENTS,
				expect.stringContaining('"type":"pattern:created"')
			);
		});

		it('should publish cache hit events', async () => {
			const { publishPatternEvent, PATTERN_EVENTS } = await import('$lib/server/redis/pubsub');

			const cacheHitEvent = {
				type: 'pattern:cache_hit' as const,
				patternId: 'pattern-456',
				data: { count: 10 }
			};

			await publishPatternEvent(cacheHitEvent);

			expect(mockPublishClient.publish).toHaveBeenCalledWith(
				PATTERN_EVENTS,
				expect.stringContaining('"type":"pattern:cache_hit"')
			);
		});

		it('should publish cache miss events', async () => {
			const { publishPatternEvent, PATTERN_EVENTS } = await import('$lib/server/redis/pubsub');

			const cacheMissEvent = {
				type: 'pattern:cache_miss' as const,
				patternId: 'list',
				namespace: 'patterns'
			};

			await publishPatternEvent(cacheMissEvent);

			expect(mockPublishClient.publish).toHaveBeenCalledWith(
				PATTERN_EVENTS,
				expect.stringContaining('"type":"pattern:cache_miss"')
			);
		});
	});

	describe('publishMemoryEvent', () => {
		it('should publish memory stored events', async () => {
			const { publishMemoryEvent, MEMORY_EVENTS } = await import('$lib/server/redis/pubsub');

			const memoryEvent = {
				type: 'memory:stored' as const,
				key: 'my-key',
				namespace: 'patterns',
				data: { tags: ['tag1', 'tag2'] }
			};

			await publishMemoryEvent(memoryEvent);

			expect(mockPublishClient.publish).toHaveBeenCalledWith(
				MEMORY_EVENTS,
				expect.stringContaining('"type":"memory:stored"')
			);
		});

		it('should publish memory searched events', async () => {
			const { publishMemoryEvent, MEMORY_EVENTS } = await import('$lib/server/redis/pubsub');

			const searchEvent = {
				type: 'memory:searched' as const,
				query: 'authentication patterns',
				namespace: 'patterns',
				data: { cached: true, count: 5 }
			};

			await publishMemoryEvent(searchEvent);

			expect(mockPublishClient.publish).toHaveBeenCalledWith(
				MEMORY_EVENTS,
				expect.stringContaining('"type":"memory:searched"')
			);
		});

		it('should publish memory deleted events', async () => {
			const { publishMemoryEvent, MEMORY_EVENTS } = await import('$lib/server/redis/pubsub');

			const deleteEvent = {
				type: 'memory:deleted' as const,
				key: 'old-key',
				namespace: 'patterns'
			};

			await publishMemoryEvent(deleteEvent);

			expect(mockPublishClient.publish).toHaveBeenCalledWith(
				MEMORY_EVENTS,
				expect.stringContaining('"type":"memory:deleted"')
			);
		});

		it('should publish cache invalidated events', async () => {
			const { publishMemoryEvent, MEMORY_EVENTS } = await import('$lib/server/redis/pubsub');

			const invalidateEvent = {
				type: 'memory:cache_invalidated' as const,
				namespace: 'patterns'
			};

			await publishMemoryEvent(invalidateEvent);

			expect(mockPublishClient.publish).toHaveBeenCalledWith(
				MEMORY_EVENTS,
				expect.stringContaining('"type":"memory:cache_invalidated"')
			);
		});
	});

	describe('publishAgentEvent', () => {
		it('should publish agent spawned events', async () => {
			const { publishAgentEvent, AGENT_EVENTS } = await import('$lib/server/redis/pubsub');

			const spawnEvent = {
				type: 'agent:spawned' as const,
				agentId: 'agent-001',
				agentType: 'coder',
				data: { task: 'Implement feature' }
			};

			await publishAgentEvent(spawnEvent);

			expect(mockPublishClient.publish).toHaveBeenCalledWith(
				AGENT_EVENTS,
				expect.stringContaining('"type":"agent:spawned"')
			);
		});

		it('should publish agent completed events', async () => {
			const { publishAgentEvent, AGENT_EVENTS } = await import('$lib/server/redis/pubsub');

			const completeEvent = {
				type: 'agent:completed' as const,
				agentId: 'agent-001',
				agentType: 'coder',
				data: { duration: 5000, success: true }
			};

			await publishAgentEvent(completeEvent);

			expect(mockPublishClient.publish).toHaveBeenCalledWith(
				AGENT_EVENTS,
				expect.stringContaining('"type":"agent:completed"')
			);
		});

		it('should publish agent metrics updated events', async () => {
			const { publishAgentEvent, AGENT_EVENTS } = await import('$lib/server/redis/pubsub');

			const metricsEvent = {
				type: 'agent:metrics_updated' as const,
				agentId: 'agent-002',
				agentType: 'tester',
				data: { taskCount: 25, successRate: 0.95 }
			};

			await publishAgentEvent(metricsEvent);

			expect(mockPublishClient.publish).toHaveBeenCalledWith(
				AGENT_EVENTS,
				expect.stringContaining('"type":"agent:metrics_updated"')
			);
		});
	});

	describe('bridgeRedisToSocketIO', () => {
		it('should subscribe to all new channels', async () => {
			const {
				bridgeRedisToSocketIO,
				TICKET_EVENTS,
				PROJECT_EVENTS,
				SYSTEM_EVENTS,
				PATTERN_EVENTS,
				MEMORY_EVENTS,
				AGENT_EVENTS
			} = await import('$lib/server/redis/pubsub');

			const mockSocketIO = { emit: vi.fn() };

			await bridgeRedisToSocketIO(mockSocketIO as any);

			expect(mockSubscribeClient.subscribe).toHaveBeenCalledWith(TICKET_EVENTS);
			expect(mockSubscribeClient.subscribe).toHaveBeenCalledWith(PROJECT_EVENTS);
			expect(mockSubscribeClient.subscribe).toHaveBeenCalledWith(SYSTEM_EVENTS);
			expect(mockSubscribeClient.subscribe).toHaveBeenCalledWith(PATTERN_EVENTS);
			expect(mockSubscribeClient.subscribe).toHaveBeenCalledWith(MEMORY_EVENTS);
			expect(mockSubscribeClient.subscribe).toHaveBeenCalledWith(AGENT_EVENTS);
		});
	});

	describe('channels export', () => {
		it('should include all new channels in channels object', async () => {
			const { channels, PATTERN_EVENTS, MEMORY_EVENTS, AGENT_EVENTS } = await import(
				'$lib/server/redis/pubsub'
			);

			expect(channels.patterns).toBe(PATTERN_EVENTS);
			expect(channels.memory).toBe(MEMORY_EVENTS);
			expect(channels.agents).toBe(AGENT_EVENTS);
		});
	});
});
