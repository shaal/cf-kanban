/**
 * GAP-ROAD.1: Redis Memory Cache Tests
 *
 * Tests for memory search caching functionality added as part of Redis integration.
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

const MEMORY_SEARCH_TTL = 120;
const DEFAULT_TTL = 300;

describe('Redis Memory Cache', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPipeline.set.mockClear().mockReturnThis();
		mockPipeline.del.mockClear().mockReturnThis();
		mockPipeline.get.mockClear().mockReturnThis();
		mockPipeline.exec.mockClear().mockResolvedValue([]);
	});

	describe('cacheMemorySearch', () => {
		it('should cache memory search result with default TTL', async () => {
			const { cacheMemorySearch } = await import('$lib/server/redis/cache');

			const result = {
				entries: [
					{ key: 'entry-1', value: 'test value', namespace: 'default' }
				],
				query: 'test query',
				namespace: 'default',
				totalFound: 1,
				cachedAt: Date.now()
			};

			await cacheMemorySearch('test query', result, 'default', 20);

			expect(mockRedisClient.set).toHaveBeenCalledWith(
				expect.stringMatching(/^memory:search:default:20:/),
				expect.stringContaining('"query":"test query"'),
				'EX',
				MEMORY_SEARCH_TTL
			);
		});

		it('should allow custom TTL', async () => {
			const { cacheMemorySearch } = await import('$lib/server/redis/cache');

			const result = {
				entries: [],
				query: 'another query',
				totalFound: 0,
				cachedAt: Date.now()
			};

			await cacheMemorySearch('another query', result, undefined, undefined, 60);

			expect(mockRedisClient.set).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				'EX',
				60
			);
		});
	});

	describe('getMemorySearch', () => {
		it('should return cached search result when found', async () => {
			const { getMemorySearch } = await import('$lib/server/redis/cache');

			const cachedResult = {
				entries: [{ key: 'e1', value: 'v1', namespace: 'ns' }],
				query: 'search term',
				namespace: 'patterns',
				totalFound: 1,
				cachedAt: Date.now()
			};

			mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedResult));

			const result = await getMemorySearch('search term', 'patterns', 20);

			expect(result).toEqual(cachedResult);
		});

		it('should return null when not cached', async () => {
			const { getMemorySearch } = await import('$lib/server/redis/cache');

			mockRedisClient.get.mockResolvedValue(null);

			const result = await getMemorySearch('unknown query');

			expect(result).toBeNull();
		});

		it('should return null for invalid JSON', async () => {
			const { getMemorySearch } = await import('$lib/server/redis/cache');

			mockRedisClient.get.mockResolvedValue('not valid json');

			const result = await getMemorySearch('query');

			expect(result).toBeNull();
		});
	});

	describe('invalidateMemorySearchCache', () => {
		it('should delete all memory search cache keys', async () => {
			const { invalidateMemorySearchCache } = await import('$lib/server/redis/cache');

			// Mock scan returning some keys then completing
			mockRedisClient.scan
				.mockResolvedValueOnce(['1', ['memory:search:ns1:20:abc', 'memory:search:ns2:10:def']])
				.mockResolvedValueOnce(['0', []]);

			await invalidateMemorySearchCache();

			expect(mockRedisClient.scan).toHaveBeenCalled();
			expect(mockRedisClient.del).toHaveBeenCalledWith(
				'memory:search:ns1:20:abc',
				'memory:search:ns2:10:def'
			);
		});

		it('should handle empty cache gracefully', async () => {
			const { invalidateMemorySearchCache } = await import('$lib/server/redis/cache');

			mockRedisClient.scan.mockResolvedValue(['0', []]);

			await invalidateMemorySearchCache();

			// Should not attempt to delete anything
			expect(mockRedisClient.del).not.toHaveBeenCalled();
		});
	});

	describe('cacheMemoryEntry', () => {
		it('should cache a memory entry with default TTL', async () => {
			const { cacheMemoryEntry } = await import('$lib/server/redis/cache');

			const entry = {
				key: 'my-key',
				value: 'my-value',
				namespace: 'patterns',
				tags: ['tag1', 'tag2']
			};

			await cacheMemoryEntry(entry);

			expect(mockRedisClient.set).toHaveBeenCalledWith(
				'memory:patterns:my-key',
				JSON.stringify(entry),
				'EX',
				DEFAULT_TTL
			);
		});

		it('should use default namespace when not specified', async () => {
			const { cacheMemoryEntry } = await import('$lib/server/redis/cache');

			const entry = {
				key: 'my-key',
				value: 'my-value',
				namespace: 'default'
			};

			await cacheMemoryEntry(entry);

			expect(mockRedisClient.set).toHaveBeenCalledWith(
				'memory:default:my-key',
				expect.any(String),
				'EX',
				DEFAULT_TTL
			);
		});
	});

	describe('getMemoryEntry', () => {
		it('should return cached entry when found', async () => {
			const { getMemoryEntry } = await import('$lib/server/redis/cache');

			const entry = {
				key: 'cached-key',
				value: 'cached-value',
				namespace: 'patterns'
			};

			mockRedisClient.get.mockResolvedValue(JSON.stringify(entry));

			const result = await getMemoryEntry('cached-key', 'patterns');

			expect(mockRedisClient.get).toHaveBeenCalledWith('memory:patterns:cached-key');
			expect(result).toEqual(entry);
		});

		it('should return null when not found', async () => {
			const { getMemoryEntry } = await import('$lib/server/redis/cache');

			mockRedisClient.get.mockResolvedValue(null);

			const result = await getMemoryEntry('unknown-key');

			expect(result).toBeNull();
		});
	});

	describe('invalidateMemoryEntry', () => {
		it('should delete specific entry and invalidate search cache', async () => {
			const { invalidateMemoryEntry } = await import('$lib/server/redis/cache');

			mockRedisClient.scan.mockResolvedValue(['0', []]);

			await invalidateMemoryEntry('my-key', 'patterns');

			expect(mockRedisClient.del).toHaveBeenCalledWith('memory:patterns:my-key');
			// Search cache invalidation also runs
			expect(mockRedisClient.scan).toHaveBeenCalled();
		});

		it('should use default namespace when not specified', async () => {
			const { invalidateMemoryEntry } = await import('$lib/server/redis/cache');

			mockRedisClient.scan.mockResolvedValue(['0', []]);

			await invalidateMemoryEntry('my-key');

			expect(mockRedisClient.del).toHaveBeenCalledWith('memory:default:my-key');
		});
	});
});
