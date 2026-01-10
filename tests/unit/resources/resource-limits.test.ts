/**
 * TASK-105: Resource Limits Tests
 *
 * Tests for resource limits configuration including:
 * - Max agents per project
 * - Max concurrent swarms
 * - Storage quotas per project
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Redis client
const mockRedisClient = {
	get: vi.fn(),
	set: vi.fn().mockResolvedValue('OK'),
	del: vi.fn().mockResolvedValue(1),
	hget: vi.fn(),
	hset: vi.fn().mockResolvedValue(1),
	hgetall: vi.fn(),
	hincrby: vi.fn().mockResolvedValue(1),
	hdel: vi.fn().mockResolvedValue(1)
};

vi.mock('$lib/server/redis', () => ({
	getRedisClient: vi.fn(() => mockRedisClient)
}));

describe('Resource Limits', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('ResourceLimitsConfig', () => {
		it('should define default limits for projects', async () => {
			const { DEFAULT_RESOURCE_LIMITS } = await import('$lib/server/resources/limits');

			expect(DEFAULT_RESOURCE_LIMITS).toMatchObject({
				maxAgentsPerProject: expect.any(Number),
				maxConcurrentSwarms: expect.any(Number),
				storageQuotaMB: expect.any(Number),
				maxApiCallsPerHour: expect.any(Number),
				maxWebSocketConnections: expect.any(Number)
			});
		});

		it('should have reasonable default values', async () => {
			const { DEFAULT_RESOURCE_LIMITS } = await import('$lib/server/resources/limits');

			expect(DEFAULT_RESOURCE_LIMITS.maxAgentsPerProject).toBeGreaterThanOrEqual(5);
			expect(DEFAULT_RESOURCE_LIMITS.maxConcurrentSwarms).toBeGreaterThanOrEqual(1);
			expect(DEFAULT_RESOURCE_LIMITS.storageQuotaMB).toBeGreaterThanOrEqual(100);
			expect(DEFAULT_RESOURCE_LIMITS.maxApiCallsPerHour).toBeGreaterThanOrEqual(1000);
			expect(DEFAULT_RESOURCE_LIMITS.maxWebSocketConnections).toBeGreaterThanOrEqual(10);
		});
	});

	describe('ResourceTier', () => {
		it('should define multiple resource tiers', async () => {
			const { ResourceTier, TIER_LIMITS } = await import('$lib/server/resources/limits');

			expect(ResourceTier.FREE).toBe('free');
			expect(ResourceTier.STARTER).toBe('starter');
			expect(ResourceTier.PRO).toBe('pro');
			expect(ResourceTier.ENTERPRISE).toBe('enterprise');

			expect(TIER_LIMITS[ResourceTier.FREE]).toBeDefined();
			expect(TIER_LIMITS[ResourceTier.STARTER]).toBeDefined();
			expect(TIER_LIMITS[ResourceTier.PRO]).toBeDefined();
			expect(TIER_LIMITS[ResourceTier.ENTERPRISE]).toBeDefined();
		});

		it('should have increasing limits per tier', async () => {
			const { ResourceTier, TIER_LIMITS } = await import('$lib/server/resources/limits');

			const freeLimits = TIER_LIMITS[ResourceTier.FREE];
			const starterLimits = TIER_LIMITS[ResourceTier.STARTER];
			const proLimits = TIER_LIMITS[ResourceTier.PRO];
			const enterpriseLimits = TIER_LIMITS[ResourceTier.ENTERPRISE];

			// Each tier should have higher limits than the previous
			expect(starterLimits.maxAgentsPerProject).toBeGreaterThan(freeLimits.maxAgentsPerProject);
			expect(proLimits.maxAgentsPerProject).toBeGreaterThan(starterLimits.maxAgentsPerProject);
			expect(enterpriseLimits.maxAgentsPerProject).toBeGreaterThan(proLimits.maxAgentsPerProject);
		});
	});

	describe('getProjectLimits', () => {
		it('should return cached limits when available', async () => {
			const { getProjectLimits, ResourceLimits } = await import('$lib/server/resources/limits');

			const cachedLimits: ResourceLimits = {
				maxAgentsPerProject: 20,
				maxConcurrentSwarms: 5,
				storageQuotaMB: 500,
				maxApiCallsPerHour: 5000,
				maxWebSocketConnections: 50
			};

			mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedLimits));

			const result = await getProjectLimits('proj-123');

			expect(mockRedisClient.get).toHaveBeenCalledWith('resource-limits:project:proj-123');
			expect(result).toEqual(cachedLimits);
		});

		it('should return default limits when no cache exists', async () => {
			const { getProjectLimits, DEFAULT_RESOURCE_LIMITS } = await import('$lib/server/resources/limits');

			mockRedisClient.get.mockResolvedValue(null);

			const result = await getProjectLimits('proj-123');

			expect(result).toEqual(DEFAULT_RESOURCE_LIMITS);
		});
	});

	describe('setProjectLimits', () => {
		it('should store project limits in cache', async () => {
			const { setProjectLimits, ResourceLimits } = await import('$lib/server/resources/limits');

			const limits: ResourceLimits = {
				maxAgentsPerProject: 30,
				maxConcurrentSwarms: 10,
				storageQuotaMB: 1000,
				maxApiCallsPerHour: 10000,
				maxWebSocketConnections: 100
			};

			await setProjectLimits('proj-123', limits);

			expect(mockRedisClient.set).toHaveBeenCalledWith(
				'resource-limits:project:proj-123',
				JSON.stringify(limits)
			);
		});
	});

	describe('getUserLimits', () => {
		it('should return user-specific limits', async () => {
			const { getUserLimits, ResourceLimits } = await import('$lib/server/resources/limits');

			const cachedLimits: ResourceLimits = {
				maxAgentsPerProject: 15,
				maxConcurrentSwarms: 3,
				storageQuotaMB: 250,
				maxApiCallsPerHour: 2500,
				maxWebSocketConnections: 25
			};

			mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedLimits));

			const result = await getUserLimits('user-456');

			expect(mockRedisClient.get).toHaveBeenCalledWith('resource-limits:user:user-456');
			expect(result).toEqual(cachedLimits);
		});
	});

	describe('setUserTier', () => {
		it('should set user limits based on tier', async () => {
			const { setUserTier, ResourceTier, TIER_LIMITS } = await import('$lib/server/resources/limits');

			await setUserTier('user-456', ResourceTier.PRO);

			expect(mockRedisClient.set).toHaveBeenCalledWith(
				'resource-limits:user:user-456',
				JSON.stringify(TIER_LIMITS[ResourceTier.PRO])
			);
		});
	});

	describe('checkLimitExceeded', () => {
		it('should return false when under limit', async () => {
			const { checkLimitExceeded, ResourceLimits } = await import('$lib/server/resources/limits');

			const limits: ResourceLimits = {
				maxAgentsPerProject: 10,
				maxConcurrentSwarms: 3,
				storageQuotaMB: 500,
				maxApiCallsPerHour: 1000,
				maxWebSocketConnections: 20
			};

			mockRedisClient.get.mockResolvedValue(JSON.stringify(limits));

			const result = await checkLimitExceeded('proj-123', 'agents', 5);

			expect(result.exceeded).toBe(false);
			expect(result.current).toBe(5);
			expect(result.limit).toBe(10);
			expect(result.remaining).toBe(5);
		});

		it('should return true when at or over limit', async () => {
			const { checkLimitExceeded, ResourceLimits } = await import('$lib/server/resources/limits');

			const limits: ResourceLimits = {
				maxAgentsPerProject: 10,
				maxConcurrentSwarms: 3,
				storageQuotaMB: 500,
				maxApiCallsPerHour: 1000,
				maxWebSocketConnections: 20
			};

			mockRedisClient.get.mockResolvedValue(JSON.stringify(limits));

			const result = await checkLimitExceeded('proj-123', 'agents', 10);

			expect(result.exceeded).toBe(true);
			expect(result.current).toBe(10);
			expect(result.limit).toBe(10);
			expect(result.remaining).toBe(0);
		});

		it('should handle storage quota checks', async () => {
			const { checkLimitExceeded, ResourceLimits } = await import('$lib/server/resources/limits');

			const limits: ResourceLimits = {
				maxAgentsPerProject: 10,
				maxConcurrentSwarms: 3,
				storageQuotaMB: 500,
				maxApiCallsPerHour: 1000,
				maxWebSocketConnections: 20
			};

			mockRedisClient.get.mockResolvedValue(JSON.stringify(limits));

			const result = await checkLimitExceeded('proj-123', 'storage', 600);

			expect(result.exceeded).toBe(true);
			expect(result.limit).toBe(500);
		});

		it('should handle swarm limit checks', async () => {
			const { checkLimitExceeded, ResourceLimits } = await import('$lib/server/resources/limits');

			const limits: ResourceLimits = {
				maxAgentsPerProject: 10,
				maxConcurrentSwarms: 3,
				storageQuotaMB: 500,
				maxApiCallsPerHour: 1000,
				maxWebSocketConnections: 20
			};

			mockRedisClient.get.mockResolvedValue(JSON.stringify(limits));

			const result = await checkLimitExceeded('proj-123', 'swarms', 2);

			expect(result.exceeded).toBe(false);
			expect(result.limit).toBe(3);
			expect(result.remaining).toBe(1);
		});
	});

	describe('LimitCheckResult', () => {
		it('should provide helpful error message when exceeded', async () => {
			const { checkLimitExceeded, ResourceLimits } = await import('$lib/server/resources/limits');

			const limits: ResourceLimits = {
				maxAgentsPerProject: 10,
				maxConcurrentSwarms: 3,
				storageQuotaMB: 500,
				maxApiCallsPerHour: 1000,
				maxWebSocketConnections: 20
			};

			mockRedisClient.get.mockResolvedValue(JSON.stringify(limits));

			const result = await checkLimitExceeded('proj-123', 'agents', 15);

			expect(result.exceeded).toBe(true);
			expect(result.message).toContain('limit');
			expect(result.message).toContain('exceeded');
		});
	});
});
