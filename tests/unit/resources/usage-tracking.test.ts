/**
 * TASK-106: Usage Tracking Tests
 *
 * Tests for usage tracking including:
 * - Agent hours tracking
 * - API call tracking per user/project
 * - Storage usage tracking
 * - Usage dashboard data
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Redis client with hash operations
const mockRedisClient = {
	get: vi.fn(),
	set: vi.fn().mockResolvedValue('OK'),
	del: vi.fn().mockResolvedValue(1),
	hget: vi.fn(),
	hset: vi.fn().mockResolvedValue(1),
	hgetall: vi.fn(),
	hincrby: vi.fn().mockResolvedValue(1),
	hincrbyfloat: vi.fn().mockResolvedValue('1.5'),
	hdel: vi.fn().mockResolvedValue(1),
	expire: vi.fn().mockResolvedValue(1),
	ttl: vi.fn().mockResolvedValue(3600),
	keys: vi.fn().mockResolvedValue([]),
	pipeline: vi.fn(() => ({
		hgetall: vi.fn().mockReturnThis(),
		exec: vi.fn().mockResolvedValue([])
	}))
};

vi.mock('$lib/server/redis', () => ({
	getRedisClient: vi.fn(() => mockRedisClient)
}));

describe('Usage Tracking', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('UsageMetrics Interface', () => {
		it('should define usage metrics structure', async () => {
			const { UsageMetrics } = await import('$lib/server/resources/usage');

			// Type checking - this will fail at compile time if interface is wrong
			const metrics: UsageMetrics = {
				agentHours: 10.5,
				apiCalls: 500,
				storageUsedMB: 150,
				websocketConnections: 5,
				swarmExecutions: 3,
				timestamp: Date.now()
			};

			expect(metrics).toBeDefined();
			expect(metrics.agentHours).toBe(10.5);
		});
	});

	describe('trackAgentUsage', () => {
		it('should track agent start time', async () => {
			const { trackAgentStart } = await import('$lib/server/resources/usage');

			await trackAgentStart('proj-123', 'agent-456');

			expect(mockRedisClient.hset).toHaveBeenCalledWith(
				'usage:agents:proj-123',
				'agent-456',
				expect.any(String)
			);
		});

		it('should track agent stop and calculate hours', async () => {
			const { trackAgentStop } = await import('$lib/server/resources/usage');

			// Simulate agent started 2 hours ago
			const startTime = Date.now() - 2 * 60 * 60 * 1000;
			mockRedisClient.hget.mockResolvedValue(String(startTime));

			const result = await trackAgentStop('proj-123', 'agent-456');

			expect(result.hoursUsed).toBeCloseTo(2, 1);
			expect(mockRedisClient.hdel).toHaveBeenCalledWith('usage:agents:proj-123', 'agent-456');
			expect(mockRedisClient.hincrbyfloat).toHaveBeenCalled();
		});

		it('should return 0 hours if agent was not tracked', async () => {
			const { trackAgentStop } = await import('$lib/server/resources/usage');

			mockRedisClient.hget.mockResolvedValue(null);

			const result = await trackAgentStop('proj-123', 'unknown-agent');

			expect(result.hoursUsed).toBe(0);
		});
	});

	describe('trackApiCall', () => {
		it('should increment API call counter for project', async () => {
			const { trackApiCall } = await import('$lib/server/resources/usage');

			await trackApiCall('proj-123', 'user-456');

			expect(mockRedisClient.hincrby).toHaveBeenCalledWith(
				expect.stringContaining('usage:api:proj-123'),
				'calls',
				1
			);
		});

		it('should track API calls per user', async () => {
			const { trackApiCall } = await import('$lib/server/resources/usage');

			await trackApiCall('proj-123', 'user-456');

			expect(mockRedisClient.hincrby).toHaveBeenCalledWith(
				expect.stringContaining('usage:api:user:user-456'),
				'calls',
				1
			);
		});

		it('should set expiration on hourly buckets', async () => {
			const { trackApiCall } = await import('$lib/server/resources/usage');

			await trackApiCall('proj-123', 'user-456');

			// Should set TTL on the hourly counter
			expect(mockRedisClient.expire).toHaveBeenCalled();
		});
	});

	describe('getApiCallCount', () => {
		it('should return current hour API call count', async () => {
			const { getApiCallCount } = await import('$lib/server/resources/usage');

			mockRedisClient.hget.mockResolvedValue('150');

			const count = await getApiCallCount('proj-123');

			expect(count).toBe(150);
		});

		it('should return 0 for no calls', async () => {
			const { getApiCallCount } = await import('$lib/server/resources/usage');

			mockRedisClient.hget.mockResolvedValue(null);

			const count = await getApiCallCount('proj-123');

			expect(count).toBe(0);
		});
	});

	describe('trackStorageUsage', () => {
		it('should update storage usage for project', async () => {
			const { updateStorageUsage } = await import('$lib/server/resources/usage');

			await updateStorageUsage('proj-123', 250);

			expect(mockRedisClient.hset).toHaveBeenCalledWith(
				'usage:storage:proj-123',
				'currentMB',
				'250'
			);
		});

		it('should track storage delta changes', async () => {
			const { incrementStorageUsage } = await import('$lib/server/resources/usage');

			await incrementStorageUsage('proj-123', 50);

			expect(mockRedisClient.hincrbyfloat).toHaveBeenCalledWith(
				'usage:storage:proj-123',
				'currentMB',
				50
			);
		});
	});

	describe('getStorageUsage', () => {
		it('should return current storage usage', async () => {
			const { getStorageUsage } = await import('$lib/server/resources/usage');

			mockRedisClient.hget.mockResolvedValue('175.5');

			const usage = await getStorageUsage('proj-123');

			expect(usage).toBe(175.5);
		});

		it('should return 0 for no storage tracked', async () => {
			const { getStorageUsage } = await import('$lib/server/resources/usage');

			mockRedisClient.hget.mockResolvedValue(null);

			const usage = await getStorageUsage('proj-123');

			expect(usage).toBe(0);
		});
	});

	describe('getProjectUsage', () => {
		it('should return aggregated usage metrics', async () => {
			const { getProjectUsage } = await import('$lib/server/resources/usage');

			mockRedisClient.hgetall.mockResolvedValue({
				agentHours: '15.5',
				apiCalls: '2500',
				storageUsedMB: '350',
				websocketConnections: '8',
				swarmExecutions: '12'
			});

			const usage = await getProjectUsage('proj-123');

			expect(usage.agentHours).toBe(15.5);
			expect(usage.apiCalls).toBe(2500);
			expect(usage.storageUsedMB).toBe(350);
			expect(usage.websocketConnections).toBe(8);
			expect(usage.swarmExecutions).toBe(12);
		});

		it('should return zeroes for empty project', async () => {
			const { getProjectUsage } = await import('$lib/server/resources/usage');

			mockRedisClient.hgetall.mockResolvedValue(null);

			const usage = await getProjectUsage('proj-123');

			expect(usage.agentHours).toBe(0);
			expect(usage.apiCalls).toBe(0);
			expect(usage.storageUsedMB).toBe(0);
		});
	});

	describe('getUserUsage', () => {
		it('should return user-level usage metrics', async () => {
			const { getUserUsage } = await import('$lib/server/resources/usage');

			mockRedisClient.hgetall.mockResolvedValue({
				totalAgentHours: '45.0',
				totalApiCalls: '10000',
				totalStorageUsedMB: '800'
			});

			const usage = await getUserUsage('user-456');

			expect(usage.totalAgentHours).toBe(45.0);
			expect(usage.totalApiCalls).toBe(10000);
			expect(usage.totalStorageUsedMB).toBe(800);
		});
	});

	describe('trackSwarmExecution', () => {
		it('should increment swarm execution counter', async () => {
			const { trackSwarmExecution } = await import('$lib/server/resources/usage');

			await trackSwarmExecution('proj-123');

			expect(mockRedisClient.hincrby).toHaveBeenCalledWith(
				'usage:summary:proj-123',
				'swarmExecutions',
				1
			);
		});
	});

	describe('trackWebSocketConnection', () => {
		it('should track WebSocket connection open', async () => {
			const { trackWebSocketOpen } = await import('$lib/server/resources/usage');

			await trackWebSocketOpen('proj-123', 'socket-789');

			expect(mockRedisClient.hset).toHaveBeenCalledWith(
				'usage:websockets:proj-123',
				'socket-789',
				expect.any(String)
			);
		});

		it('should track WebSocket connection close', async () => {
			const { trackWebSocketClose } = await import('$lib/server/resources/usage');

			await trackWebSocketClose('proj-123', 'socket-789');

			expect(mockRedisClient.hdel).toHaveBeenCalledWith(
				'usage:websockets:proj-123',
				'socket-789'
			);
		});

		it('should get active WebSocket count', async () => {
			const { getActiveWebSocketCount } = await import('$lib/server/resources/usage');

			mockRedisClient.hgetall.mockResolvedValue({
				'socket-1': '123',
				'socket-2': '456',
				'socket-3': '789'
			});

			const count = await getActiveWebSocketCount('proj-123');

			expect(count).toBe(3);
		});
	});

	describe('getUsageHistory', () => {
		it('should return daily usage history', async () => {
			const { getUsageHistory } = await import('$lib/server/resources/usage');

			mockRedisClient.keys.mockResolvedValue([
				'usage:daily:proj-123:2024-01-13',
				'usage:daily:proj-123:2024-01-14',
				'usage:daily:proj-123:2024-01-15'
			]);

			const mockPipeline = {
				hgetall: vi.fn().mockReturnThis(),
				exec: vi.fn().mockResolvedValue([
					[null, { agentHours: '5', apiCalls: '1000' }],
					[null, { agentHours: '8', apiCalls: '1500' }],
					[null, { agentHours: '3', apiCalls: '500' }]
				])
			};
			mockRedisClient.pipeline.mockReturnValue(mockPipeline);

			const history = await getUsageHistory('proj-123', 7);

			expect(history).toHaveLength(3);
			expect(mockRedisClient.keys).toHaveBeenCalledWith(
				expect.stringContaining('usage:daily:proj-123')
			);
		});
	});

	describe('resetDailyUsage', () => {
		it('should archive current day and reset counters', async () => {
			const { archiveDailyUsage } = await import('$lib/server/resources/usage');

			mockRedisClient.hgetall.mockResolvedValue({
				agentHours: '12.5',
				apiCalls: '3000'
			});

			await archiveDailyUsage('proj-123');

			// Should save to daily archive
			expect(mockRedisClient.set).toHaveBeenCalledWith(
				expect.stringContaining('usage:daily:proj-123:'),
				expect.any(String)
			);
		});
	});

	describe('UsageDashboardData', () => {
		it('should compile dashboard data structure', async () => {
			const { getUsageDashboardData } = await import('$lib/server/resources/usage');

			mockRedisClient.hgetall.mockResolvedValue({
				agentHours: '25',
				apiCalls: '5000',
				storageUsedMB: '500',
				websocketConnections: '10',
				swarmExecutions: '20'
			});

			const dashboard = await getUsageDashboardData('proj-123');

			expect(dashboard).toMatchObject({
				current: expect.objectContaining({
					agentHours: expect.any(Number),
					apiCalls: expect.any(Number),
					storageUsedMB: expect.any(Number)
				}),
				projectId: 'proj-123',
				timestamp: expect.any(Number)
			});
		});
	});
});
