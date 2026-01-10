/**
 * GAP-ROAD.1: Redis Pattern Cache Tests
 *
 * Tests for pattern caching functionality added as part of Redis integration.
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

const PATTERN_TTL = 600;

describe('Redis Pattern Cache', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPipeline.set.mockClear().mockReturnThis();
		mockPipeline.del.mockClear().mockReturnThis();
		mockPipeline.get.mockClear().mockReturnThis();
		mockPipeline.exec.mockClear().mockResolvedValue([]);
	});

	describe('cachePattern', () => {
		it('should cache a pattern with default TTL', async () => {
			const { cachePattern } = await import('$lib/server/redis/cache');

			const pattern = {
				id: 'pattern-1',
				key: 'auth-pattern',
				name: 'Auth Pattern',
				value: 'JWT authentication pattern',
				namespace: 'patterns',
				domain: 'auth',
				successRate: 0.95,
				usageCount: 42
			};

			await cachePattern(pattern);

			expect(mockRedisClient.set).toHaveBeenCalledWith(
				'pattern:pattern-1',
				JSON.stringify(pattern),
				'EX',
				PATTERN_TTL
			);
		});

		it('should allow custom TTL', async () => {
			const { cachePattern } = await import('$lib/server/redis/cache');

			const pattern = {
				id: 'pattern-2',
				key: 'api-pattern',
				name: 'API Pattern',
				value: 'REST API pattern',
				namespace: 'patterns',
				domain: 'api',
				successRate: 0.88,
				usageCount: 28
			};

			await cachePattern(pattern, 1200);

			expect(mockRedisClient.set).toHaveBeenCalledWith(
				'pattern:pattern-2',
				JSON.stringify(pattern),
				'EX',
				1200
			);
		});
	});

	describe('getPattern', () => {
		it('should return cached pattern when found', async () => {
			const { getPattern } = await import('$lib/server/redis/cache');

			const pattern = {
				id: 'pattern-1',
				key: 'auth-pattern',
				name: 'Auth Pattern',
				value: 'JWT authentication pattern',
				namespace: 'patterns',
				domain: 'auth',
				successRate: 0.95,
				usageCount: 42
			};

			mockRedisClient.get.mockResolvedValue(JSON.stringify(pattern));

			const result = await getPattern('pattern-1');

			expect(mockRedisClient.get).toHaveBeenCalledWith('pattern:pattern-1');
			expect(result).toEqual(pattern);
		});

		it('should return null when pattern not found', async () => {
			const { getPattern } = await import('$lib/server/redis/cache');

			mockRedisClient.get.mockResolvedValue(null);

			const result = await getPattern('non-existent');

			expect(result).toBeNull();
		});

		it('should return null when cached data is invalid JSON', async () => {
			const { getPattern } = await import('$lib/server/redis/cache');

			mockRedisClient.get.mockResolvedValue('invalid json');

			const result = await getPattern('pattern-1');

			expect(result).toBeNull();
		});
	});

	describe('invalidatePattern', () => {
		it('should delete pattern from cache', async () => {
			const { invalidatePattern } = await import('$lib/server/redis/cache');

			await invalidatePattern('pattern-1');

			expect(mockRedisClient.del).toHaveBeenCalledWith('pattern:pattern-1');
		});
	});

	describe('cachePatternList', () => {
		it('should cache multiple patterns using pipeline', async () => {
			const { cachePatternList } = await import('$lib/server/redis/cache');

			const patterns = [
				{
					id: 'p1',
					key: 'pattern-1',
					name: 'Pattern 1',
					value: 'Value 1',
					namespace: 'patterns',
					domain: 'auth',
					successRate: 0.9,
					usageCount: 10
				},
				{
					id: 'p2',
					key: 'pattern-2',
					name: 'Pattern 2',
					value: 'Value 2',
					namespace: 'patterns',
					domain: 'api',
					successRate: 0.85,
					usageCount: 20
				}
			];

			await cachePatternList('patterns', patterns);

			expect(mockRedisClient.pipeline).toHaveBeenCalled();
			// 2 patterns + 1 list key = 3 set calls
			expect(mockPipeline.set).toHaveBeenCalledTimes(3);
			expect(mockPipeline.exec).toHaveBeenCalled();
		});
	});

	describe('getPatternListIds', () => {
		it('should return pattern IDs when cached', async () => {
			const { getPatternListIds } = await import('$lib/server/redis/cache');

			mockRedisClient.get.mockResolvedValue(
				JSON.stringify({ ids: ['p1', 'p2', 'p3'], cachedAt: Date.now() })
			);

			const result = await getPatternListIds('patterns');

			expect(result).toEqual(['p1', 'p2', 'p3']);
		});

		it('should return null when not cached', async () => {
			const { getPatternListIds } = await import('$lib/server/redis/cache');

			mockRedisClient.get.mockResolvedValue(null);

			const result = await getPatternListIds('patterns');

			expect(result).toBeNull();
		});
	});

	describe('invalidatePatternList', () => {
		it('should delete all patterns in namespace', async () => {
			const { invalidatePatternList, getPatternListIds } = await import('$lib/server/redis/cache');

			// Mock that we have cached pattern IDs
			mockRedisClient.get.mockResolvedValue(
				JSON.stringify({ ids: ['p1', 'p2', 'p3'], cachedAt: Date.now() })
			);

			await invalidatePatternList('patterns');

			expect(mockRedisClient.pipeline).toHaveBeenCalled();
			// 3 patterns + 1 list key = 4 del calls
			expect(mockPipeline.del).toHaveBeenCalledTimes(4);
		});

		it('should handle empty pattern list', async () => {
			const { invalidatePatternList } = await import('$lib/server/redis/cache');

			mockRedisClient.get.mockResolvedValue(null);

			await invalidatePatternList('patterns');

			// Should just delete the list key directly
			expect(mockRedisClient.del).toHaveBeenCalledWith('patterns:list:patterns');
		});
	});

	describe('getPatterns', () => {
		it('should return empty array for empty input', async () => {
			const { getPatterns } = await import('$lib/server/redis/cache');

			const result = await getPatterns([]);

			expect(result).toEqual([]);
			expect(mockRedisClient.pipeline).not.toHaveBeenCalled();
		});

		it('should use pipeline for multiple patterns', async () => {
			const { getPatterns } = await import('$lib/server/redis/cache');

			const patterns = [
				{ id: 'p1', key: 'k1', name: 'Pattern 1', value: 'v1', namespace: 'ns', domain: 'd', successRate: 0.9, usageCount: 1 },
				{ id: 'p2', key: 'k2', name: 'Pattern 2', value: 'v2', namespace: 'ns', domain: 'd', successRate: 0.8, usageCount: 2 }
			];

			mockPipeline.exec.mockResolvedValue([
				[null, JSON.stringify(patterns[0])],
				[null, JSON.stringify(patterns[1])]
			]);

			const result = await getPatterns(['p1', 'p2']);

			expect(mockRedisClient.pipeline).toHaveBeenCalled();
			expect(result).toEqual(patterns);
		});
	});
});
