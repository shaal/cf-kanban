/**
 * GAP-ROAD.1: Redis Agent Metrics Cache Tests
 *
 * Tests for agent metrics caching functionality added as part of Redis integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock pipeline object
const mockPipeline = {
	set: vi.fn().mockReturnThis(),
	del: vi.fn().mockReturnThis(),
	get: vi.fn().mockReturnThis(),
	exec: vi.fn().mockResolvedValue([])
};

// Mock Redis client
const mockRedisClient = {
	get: vi.fn(),
	set: vi.fn().mockResolvedValue('OK'),
	del: vi.fn().mockResolvedValue(1),
	scan: vi.fn().mockResolvedValue(['0', []]),
	pipeline: vi.fn(() => mockPipeline)
};

vi.mock('$lib/server/redis', () => ({
	getRedisClient: vi.fn(() => mockRedisClient)
}));

const AGENT_METRICS_TTL = 30;

describe('Redis Agent Metrics Cache', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPipeline.set.mockClear().mockReturnThis();
		mockPipeline.del.mockClear().mockReturnThis();
		mockPipeline.get.mockClear().mockReturnThis();
		mockPipeline.exec.mockClear().mockResolvedValue([]);
	});

	describe('cacheAgentMetrics', () => {
		it('should cache agent metrics with default TTL', async () => {
			const { cacheAgentMetrics } = await import('$lib/server/redis/cache');

			const metrics = {
				agentId: 'agent-1',
				agentType: 'coder',
				status: 'active' as const,
				taskCount: 15,
				successRate: 0.92,
				avgResponseTime: 1250,
				lastActive: Date.now()
			};

			await cacheAgentMetrics(metrics);

			expect(mockRedisClient.set).toHaveBeenCalledWith(
				'agent:metrics:agent-1',
				JSON.stringify(metrics),
				'EX',
				AGENT_METRICS_TTL
			);
		});

		it('should allow custom TTL', async () => {
			const { cacheAgentMetrics } = await import('$lib/server/redis/cache');

			const metrics = {
				agentId: 'agent-2',
				agentType: 'tester',
				status: 'idle' as const,
				taskCount: 8,
				successRate: 0.88,
				avgResponseTime: 980,
				lastActive: Date.now()
			};

			await cacheAgentMetrics(metrics, 60);

			expect(mockRedisClient.set).toHaveBeenCalledWith(
				'agent:metrics:agent-2',
				JSON.stringify(metrics),
				'EX',
				60
			);
		});
	});

	describe('getAgentMetrics', () => {
		it('should return cached metrics when found', async () => {
			const { getAgentMetrics } = await import('$lib/server/redis/cache');

			const metrics = {
				agentId: 'agent-1',
				agentType: 'coder',
				status: 'active',
				taskCount: 15,
				successRate: 0.92,
				avgResponseTime: 1250,
				lastActive: Date.now()
			};

			mockRedisClient.get.mockResolvedValue(JSON.stringify(metrics));

			const result = await getAgentMetrics('agent-1');

			expect(mockRedisClient.get).toHaveBeenCalledWith('agent:metrics:agent-1');
			expect(result).toEqual(metrics);
		});

		it('should return null when not found', async () => {
			const { getAgentMetrics } = await import('$lib/server/redis/cache');

			mockRedisClient.get.mockResolvedValue(null);

			const result = await getAgentMetrics('unknown-agent');

			expect(result).toBeNull();
		});

		it('should return null for invalid JSON', async () => {
			const { getAgentMetrics } = await import('$lib/server/redis/cache');

			mockRedisClient.get.mockResolvedValue('not json');

			const result = await getAgentMetrics('agent-1');

			expect(result).toBeNull();
		});
	});

	describe('cacheMultipleAgentMetrics', () => {
		it('should cache multiple agents using pipeline', async () => {
			const { cacheMultipleAgentMetrics } = await import('$lib/server/redis/cache');

			const metricsList = [
				{
					agentId: 'agent-1',
					agentType: 'coder',
					status: 'active' as const,
					taskCount: 15,
					successRate: 0.92,
					avgResponseTime: 1250,
					lastActive: Date.now()
				},
				{
					agentId: 'agent-2',
					agentType: 'tester',
					status: 'idle' as const,
					taskCount: 8,
					successRate: 0.88,
					avgResponseTime: 980,
					lastActive: Date.now()
				}
			];

			await cacheMultipleAgentMetrics(metricsList);

			expect(mockRedisClient.pipeline).toHaveBeenCalled();
			expect(mockPipeline.set).toHaveBeenCalledTimes(2);
			expect(mockPipeline.exec).toHaveBeenCalled();
		});

		it('should not create pipeline for empty list', async () => {
			const { cacheMultipleAgentMetrics } = await import('$lib/server/redis/cache');

			await cacheMultipleAgentMetrics([]);

			expect(mockRedisClient.pipeline).not.toHaveBeenCalled();
		});
	});

	describe('getAllAgentMetrics', () => {
		it('should return all cached agent metrics', async () => {
			const { getAllAgentMetrics } = await import('$lib/server/redis/cache');

			const metrics1 = {
				agentId: 'agent-1',
				agentType: 'coder',
				status: 'active',
				taskCount: 15,
				successRate: 0.92,
				avgResponseTime: 1250,
				lastActive: Date.now()
			};

			const metrics2 = {
				agentId: 'agent-2',
				agentType: 'tester',
				status: 'idle',
				taskCount: 8,
				successRate: 0.88,
				avgResponseTime: 980,
				lastActive: Date.now()
			};

			mockRedisClient.scan.mockResolvedValueOnce([
				'0',
				['agent:metrics:agent-1', 'agent:metrics:agent-2']
			]);

			mockPipeline.exec.mockResolvedValue([
				[null, JSON.stringify(metrics1)],
				[null, JSON.stringify(metrics2)]
			]);

			const result = await getAllAgentMetrics();

			expect(result).toHaveLength(2);
			expect(result).toContainEqual(metrics1);
			expect(result).toContainEqual(metrics2);
		});

		it('should return empty array when no agents cached', async () => {
			const { getAllAgentMetrics } = await import('$lib/server/redis/cache');

			mockRedisClient.scan.mockResolvedValue(['0', []]);

			const result = await getAllAgentMetrics();

			expect(result).toEqual([]);
		});
	});

	describe('invalidateAgentMetrics', () => {
		it('should delete agent metrics from cache', async () => {
			const { invalidateAgentMetrics } = await import('$lib/server/redis/cache');

			await invalidateAgentMetrics('agent-1');

			expect(mockRedisClient.del).toHaveBeenCalledWith('agent:metrics:agent-1');
		});
	});
});
