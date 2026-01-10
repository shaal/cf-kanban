/**
 * GAP-ROAD.1: Redis Health Check API Endpoint
 *
 * GET /api/health/redis
 * Returns detailed Redis connection health, memory info, and cache statistics.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkRedisHealth, getCacheStats, REDIS_CONFIG } from '$lib/server/redis';
import { getCacheStatistics } from '$lib/server/redis/cache';

export interface RedisHealthResponse {
	status: 'healthy' | 'degraded' | 'unhealthy';
	connection: {
		healthy: boolean;
		latencyMs?: number;
		error?: string;
	};
	memory?: {
		used: string;
		peak: string;
		maxmemory: string;
	};
	clients?: number;
	cache: {
		hits: number;
		misses: number;
		hitRate: number;
		statistics?: {
			patterns: { count: number; keys: string[] };
			memory: { count: number; keys: string[] };
			agents: { count: number; keys: string[] };
			totalKeys: number;
		};
	};
	pubsub: {
		channels: string[];
		active: boolean;
	};
	config: {
		maxRetries: number;
		retryDelay: number;
		connectTimeout: number;
		commandTimeout: number;
	};
	timestamp: string;
}

export const GET: RequestHandler = async ({ url }) => {
	const includeStats = url.searchParams.get('stats') !== 'false';

	try {
		// Check Redis connection health
		const healthResult = await checkRedisHealth();

		// Get cache hit rate statistics
		const cacheStats = await getCacheStats();

		// Get detailed cache statistics if requested
		let cacheStatistics;
		if (includeStats && healthResult.healthy) {
			try {
				cacheStatistics = await getCacheStatistics();
			} catch {
				// Cache statistics are optional
			}
		}

		// Determine overall status
		let status: 'healthy' | 'degraded' | 'unhealthy' = 'unhealthy';
		if (healthResult.healthy) {
			// Check for degraded conditions
			const latencyThreshold = 100; // ms
			const hitRateThreshold = 50; // percent

			if (healthResult.latencyMs && healthResult.latencyMs > latencyThreshold) {
				status = 'degraded';
			} else if (cacheStats.hitRate < hitRateThreshold && cacheStats.hits + cacheStats.misses > 100) {
				status = 'degraded';
			} else {
				status = 'healthy';
			}
		}

		const response: RedisHealthResponse = {
			status,
			connection: {
				healthy: healthResult.healthy,
				latencyMs: healthResult.latencyMs,
				error: healthResult.error
			},
			memory: healthResult.memory,
			clients: healthResult.clients,
			cache: {
				hits: cacheStats.hits,
				misses: cacheStats.misses,
				hitRate: Math.round(cacheStats.hitRate * 100) / 100,
				statistics: cacheStatistics
			},
			pubsub: {
				channels: [
					'kanban:tickets',
					'kanban:projects',
					'kanban:system',
					'kanban:patterns',
					'kanban:memory',
					'kanban:agents'
				],
				active: healthResult.healthy
			},
			config: {
				maxRetries: REDIS_CONFIG.maxRetries,
				retryDelay: REDIS_CONFIG.retryDelay,
				connectTimeout: REDIS_CONFIG.connectTimeout,
				commandTimeout: REDIS_CONFIG.commandTimeout
			},
			timestamp: new Date().toISOString()
		};

		const statusCode = status === 'unhealthy' ? 503 : 200;

		return json(response, { status: statusCode });
	} catch (error) {
		const errorResponse: RedisHealthResponse = {
			status: 'unhealthy',
			connection: {
				healthy: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			cache: {
				hits: 0,
				misses: 0,
				hitRate: 0
			},
			pubsub: {
				channels: [],
				active: false
			},
			config: {
				maxRetries: REDIS_CONFIG.maxRetries,
				retryDelay: REDIS_CONFIG.retryDelay,
				connectTimeout: REDIS_CONFIG.connectTimeout,
				commandTimeout: REDIS_CONFIG.commandTimeout
			},
			timestamp: new Date().toISOString()
		};

		return json(errorResponse, { status: 503 });
	}
};
