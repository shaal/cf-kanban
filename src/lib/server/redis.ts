/**
 * Redis Client Singleton
 *
 * Creates a single Redis client instance to avoid connection issues
 * in development mode where hot reloading can create multiple instances.
 * Also provides a separate pub/sub client for event subscriptions.
 */

import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
	redis: Redis | undefined;
	redisPubSub: Redis | undefined;
};

let redisClient: Redis | undefined;
let pubSubClient: Redis | undefined;

/**
 * Get the main Redis client instance (singleton pattern)
 */
export function getRedisClient(): Redis {
	if (redisClient) {
		return redisClient;
	}

	// Check global for existing instance (dev mode hot reload protection)
	if (globalForRedis.redis) {
		redisClient = globalForRedis.redis;
		return redisClient;
	}

	const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

	redisClient = new Redis(redisUrl, {
		maxRetriesPerRequest: 3,
		retryDelayOnFailover: 100,
		retryDelayOnClusterDown: 100,
		enableReadyCheck: true,
		lazyConnect: false
	});

	// Set up error handling
	redisClient.on('error', (error) => {
		console.error('Redis client error:', error);
	});

	redisClient.on('connect', () => {
		console.log('Redis client connected');
	});

	redisClient.on('ready', () => {
		console.log('Redis client ready');
	});

	// In development, attach to globalThis to prevent multiple instances
	if (process.env.NODE_ENV !== 'production') {
		globalForRedis.redis = redisClient;
	}

	return redisClient;
}

/**
 * Get a separate Redis client for pub/sub operations
 * Using a separate client because subscribing blocks the connection
 */
export function getPubSubClient(): Redis {
	if (pubSubClient) {
		return pubSubClient;
	}

	// Check global for existing instance (dev mode hot reload protection)
	if (globalForRedis.redisPubSub) {
		pubSubClient = globalForRedis.redisPubSub;
		return pubSubClient;
	}

	// Get the main client first, then duplicate for pub/sub
	const mainClient = getRedisClient();
	pubSubClient = mainClient.duplicate();

	// Set up error handling for pub/sub client
	pubSubClient.on('error', (error) => {
		console.error('Redis pub/sub client error:', error);
	});

	// In development, attach to globalThis to prevent multiple instances
	if (process.env.NODE_ENV !== 'production') {
		globalForRedis.redisPubSub = pubSubClient;
	}

	return pubSubClient;
}

/**
 * Close all Redis connections gracefully
 */
export async function closeRedisConnections(): Promise<void> {
	const closePromises: Promise<string>[] = [];

	if (redisClient) {
		closePromises.push(redisClient.quit());
		redisClient = undefined;
		globalForRedis.redis = undefined;
	}

	if (pubSubClient) {
		closePromises.push(pubSubClient.quit());
		pubSubClient = undefined;
		globalForRedis.redisPubSub = undefined;
	}

	await Promise.all(closePromises);
}
