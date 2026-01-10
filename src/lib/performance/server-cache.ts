/**
 * TASK-092: Server-Side Caching Module
 *
 * Provides API response caching in Redis with cache invalidation,
 * cache headers generation, and hit rate monitoring.
 */

import { getRedisClient } from '$lib/server/redis';

// Type definitions
interface CacheOptions {
	ttl?: number;
	tags?: string[];
}

interface CacheHeaderOptions {
	public?: boolean;
	maxAge: number;
	staleWhileRevalidate?: number;
	noStore?: boolean;
}

interface CacheStats {
	hits: number;
	misses: number;
	hitRate: number;
}

interface MiddlewareOptions {
	ttl?: number;
	exclude?: RegExp[];
}

type RequestEvent = {
	url: URL;
	request: Request;
};

// Constants
const DEFAULT_TTL = 300; // 5 minutes
const API_PREFIX = 'api:';
const STATS_KEY = 'cache:stats';

/**
 * Cache an API response in Redis
 *
 * @param endpoint - The API endpoint path
 * @param data - The response data to cache
 * @param options - Caching options
 */
export async function cacheApiResponse(
	endpoint: string,
	data: unknown,
	options: CacheOptions = {}
): Promise<void> {
	const { ttl = DEFAULT_TTL } = options;
	const client = getRedisClient();
	const key = `${API_PREFIX}${endpoint}`;

	await client.set(key, JSON.stringify(data), 'EX', ttl);
}

/**
 * Get a cached API response
 *
 * @param endpoint - The API endpoint path
 * @returns The cached data or null if not found
 */
export async function getCachedResponse<T = unknown>(endpoint: string): Promise<T | null> {
	const client = getRedisClient();
	const key = `${API_PREFIX}${endpoint}`;
	const cached = await client.get(key);

	if (!cached) {
		return null;
	}

	try {
		return JSON.parse(cached) as T;
	} catch {
		return null;
	}
}

/**
 * Invalidate a specific cache entry
 *
 * @param endpoint - The API endpoint to invalidate
 */
export async function invalidateApiCache(endpoint: string): Promise<void> {
	const client = getRedisClient();
	const key = `${API_PREFIX}${endpoint}`;
	await client.del(key);
}

/**
 * Invalidate cache entries matching a pattern
 *
 * @param pattern - The pattern to match (e.g., '/api/projects*')
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
	const client = getRedisClient();
	const keys = await client.keys(`${API_PREFIX}${pattern}`);

	if (keys.length === 0) {
		return;
	}

	const pipeline = client.pipeline();
	for (const key of keys) {
		pipeline.del(key);
	}
	await pipeline.exec();
}

/**
 * Generate HTTP cache headers
 *
 * @param options - Cache header options
 * @returns Headers object
 */
export function getCacheHeaders(options: CacheHeaderOptions): Record<string, string> {
	const { maxAge, staleWhileRevalidate, noStore = false } = options;
	const isPublic = options.public ?? true;

	if (noStore) {
		return { 'Cache-Control': 'no-store' };
	}

	let cacheControl = isPublic ? 'public' : 'private';
	cacheControl += `, max-age=${maxAge}`;

	if (staleWhileRevalidate) {
		cacheControl += `, stale-while-revalidate=${staleWhileRevalidate}`;
	}

	return { 'Cache-Control': cacheControl };
}

/**
 * Generate an ETag for content
 *
 * @param content - The content to generate ETag for
 * @returns ETag string in quoted format
 */
export function generateETag(content: unknown): string {
	const str = JSON.stringify(content);
	let hash = 0;

	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}

	// Convert to positive hex string
	const hexHash = Math.abs(hash).toString(16);
	return `"${hexHash}"`;
}

/**
 * Record a cache hit for monitoring
 *
 * @param endpoint - The endpoint that was hit
 */
export async function recordCacheHit(endpoint: string): Promise<void> {
	const client = getRedisClient();
	await client.hincrby(STATS_KEY, 'hits', 1);
}

/**
 * Record a cache miss for monitoring
 *
 * @param endpoint - The endpoint that was missed
 */
export async function recordCacheMiss(endpoint: string): Promise<void> {
	const client = getRedisClient();
	await client.hincrby(STATS_KEY, 'misses', 1);
}

/**
 * Get cache statistics
 *
 * @returns Cache hit/miss statistics
 */
export async function getCacheStats(): Promise<CacheStats> {
	const client = getRedisClient();
	const stats = await client.hgetall(STATS_KEY);

	const hits = parseInt(stats.hits || '0', 10);
	const misses = parseInt(stats.misses || '0', 10);
	const total = hits + misses;

	return {
		hits,
		misses,
		hitRate: total > 0 ? hits / total : 0
	};
}

/**
 * Create a caching middleware for API routes
 *
 * @param options - Middleware options
 * @returns Middleware function
 */
export function createCacheMiddleware(options: MiddlewareOptions = {}) {
	const { ttl = DEFAULT_TTL, exclude = [] } = options;

	return async function cacheMiddleware(
		event: RequestEvent,
		resolve: (event: RequestEvent) => Promise<unknown>
	): Promise<unknown> {
		// Only cache GET requests
		if (event.request.method !== 'GET') {
			return resolve(event);
		}

		const pathname = event.url.pathname + event.url.search;

		// Check exclusions
		for (const pattern of exclude) {
			if (pattern.test(pathname)) {
				return resolve(event);
			}
		}

		// Try to get cached response
		const cached = await getCachedResponse(pathname);
		if (cached !== null) {
			await recordCacheHit(pathname);
			return cached;
		}

		// Cache miss - fetch fresh data
		await recordCacheMiss(pathname);
		const response = await resolve(event);

		// Cache the response
		await cacheApiResponse(pathname, response, { ttl });

		return response;
	};
}

/**
 * Warm the cache by preloading specified endpoints
 *
 * @param endpoints - Array of endpoints to warm
 * @param fetcher - Function to fetch data for each endpoint
 * @param options - Caching options
 */
export async function warmCache(
	endpoints: string[],
	fetcher: (endpoint: string) => Promise<unknown>,
	options: CacheOptions = {}
): Promise<void> {
	const { ttl = DEFAULT_TTL } = options;

	const warmPromises = endpoints.map(async (endpoint) => {
		const data = await fetcher(endpoint);
		await cacheApiResponse(endpoint, data, { ttl });
	});

	await Promise.all(warmPromises);
}

/**
 * Clear all cache statistics
 */
export async function clearCacheStats(): Promise<void> {
	const client = getRedisClient();
	await client.del(STATS_KEY);
}

/**
 * Get the TTL remaining for a cached endpoint
 *
 * @param endpoint - The API endpoint
 * @returns TTL in seconds, -1 if no TTL, -2 if not found
 */
export async function getCacheTTL(endpoint: string): Promise<number> {
	const client = getRedisClient();
	const key = `${API_PREFIX}${endpoint}`;
	return client.ttl(key);
}

/**
 * Check if an endpoint is cached
 *
 * @param endpoint - The API endpoint
 * @returns Whether the endpoint is cached
 */
export async function isCached(endpoint: string): Promise<boolean> {
	const client = getRedisClient();
	const key = `${API_PREFIX}${endpoint}`;
	const exists = await client.exists(key);
	return exists === 1;
}

/**
 * Batch cache multiple responses
 *
 * @param responses - Map of endpoint to response data
 * @param options - Caching options
 */
export async function batchCache(
	responses: Map<string, unknown>,
	options: CacheOptions = {}
): Promise<void> {
	const { ttl = DEFAULT_TTL } = options;
	const client = getRedisClient();
	const pipeline = client.pipeline();

	for (const [endpoint, data] of responses) {
		const key = `${API_PREFIX}${endpoint}`;
		pipeline.set(key, JSON.stringify(data), 'EX', ttl);
	}

	await pipeline.exec();
}
