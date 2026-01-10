/**
 * Redis Client Singleton
 *
 * Creates a single Redis client instance to avoid connection issues
 * in development mode where hot reloading can create multiple instances.
 * Also provides a separate pub/sub client for event subscriptions.
 *
 * TASK-112: Enhanced for production with:
 * - Health check support
 * - Connection retry strategy
 * - Memory and latency monitoring
 * - Graceful degradation
 *
 * SQLite Migration: Redis is now OPTIONAL
 * - Set REDIS_ENABLED=true to enable Redis features
 * - When disabled, all Redis functions return null or no-op implementations
 * - Real-time sync across tabs/users requires Redis
 */

import Redis from 'ioredis';

/**
 * Check if Redis is enabled via environment variable
 * Default: disabled for simpler local development
 */
export function isRedisEnabled(): boolean {
  return process.env.REDIS_ENABLED === 'true';
}

// Redis configuration from environment
const REDIS_CONFIG = {
  maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '10'),
  retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '1000'),
  connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000'),
  commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000')
};

const globalForRedis = globalThis as unknown as {
	redis: Redis | undefined;
	redisPubSub: Redis | undefined;
};

let redisClient: Redis | undefined;
let pubSubClient: Redis | undefined;

/**
 * Create Redis client with production-ready configuration
 */
function createRedisClient(url: string): Redis {
  return new Redis(url, {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    retryDelayOnClusterDown: 100,
    enableReadyCheck: true,
    lazyConnect: false,
    connectTimeout: REDIS_CONFIG.connectTimeout,
    commandTimeout: REDIS_CONFIG.commandTimeout,

    // Exponential backoff retry strategy
    retryStrategy: (times: number) => {
      if (times > REDIS_CONFIG.maxRetries) {
        console.error(`[Redis] Max retries (${REDIS_CONFIG.maxRetries}) exceeded`);
        return null; // Stop retrying
      }
      const delay = Math.min(times * REDIS_CONFIG.retryDelay, 30000);
      console.warn(`[Redis] Retrying connection in ${delay}ms (attempt ${times})`);
      return delay;
    },

    // Reconnect on error
    reconnectOnError: (err) => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        // Reconnect when master becomes read-only (failover)
        return true;
      }
      return false;
    }
  });
}

/**
 * Get the main Redis client instance (singleton pattern)
 * Returns null if Redis is disabled
 */
export function getRedisClient(): Redis | null {
	// Check if Redis is enabled
	if (!isRedisEnabled()) {
		return null;
	}

	if (redisClient) {
		return redisClient;
	}

	// Check global for existing instance (dev mode hot reload protection)
	if (globalForRedis.redis) {
		redisClient = globalForRedis.redis;
		return redisClient;
	}

	const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
	redisClient = createRedisClient(redisUrl);

	// Set up error handling
	redisClient.on('error', (error) => {
		console.error('[Redis] Client error:', error.message);
	});

	redisClient.on('connect', () => {
		if (process.env.NODE_ENV !== 'production') {
			console.log('[Redis] Client connected');
		}
	});

	redisClient.on('ready', () => {
		if (process.env.NODE_ENV !== 'production') {
			console.log('[Redis] Client ready');
		}
	});

	redisClient.on('close', () => {
		console.warn('[Redis] Connection closed');
	});

	redisClient.on('reconnecting', () => {
		console.warn('[Redis] Reconnecting...');
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
 * Returns null if Redis is disabled
 */
export function getPubSubClient(): Redis | null {
	// Check if Redis is enabled
	if (!isRedisEnabled()) {
		return null;
	}

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
	if (!mainClient) {
		return null;
	}
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

/**
 * TASK-112: Health check for Redis connectivity
 * Returns connection status and memory info for monitoring
 * Returns disabled status if Redis is not enabled
 */
export async function checkRedisHealth(): Promise<{
  healthy: boolean;
  enabled: boolean;
  latencyMs?: number;
  memory?: {
    used: string;
    peak: string;
    maxmemory: string;
  };
  clients?: number;
  error?: string;
}> {
  // Return disabled status if Redis is not enabled
  if (!isRedisEnabled()) {
    return {
      healthy: true,
      enabled: false,
      error: 'Redis is disabled (REDIS_ENABLED=false). Real-time sync is not available.'
    };
  }

  const start = Date.now();
  try {
    const client = getRedisClient();
    if (!client) {
      return {
        healthy: false,
        enabled: true,
        error: 'Redis client not available'
      };
    }
    const pong = await client.ping();

    if (pong !== 'PONG') {
      throw new Error('Unexpected PING response');
    }

    // Get memory info
    const info = await client.info('memory');
    const clientInfo = await client.info('clients');

    // Parse memory stats
    const memoryStats: Record<string, string> = {};
    info.split('\n').forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) memoryStats[key.trim()] = value.trim();
    });

    // Parse client count
    const clientMatch = clientInfo.match(/connected_clients:(\d+)/);
    const clientCount = clientMatch ? parseInt(clientMatch[1]) : undefined;

    return {
      healthy: true,
      enabled: true,
      latencyMs: Date.now() - start,
      memory: {
        used: memoryStats.used_memory_human || 'unknown',
        peak: memoryStats.used_memory_peak_human || 'unknown',
        maxmemory: memoryStats.maxmemory_human || 'unlimited'
      },
      clients: clientCount
    };
  } catch (error) {
    return {
      healthy: false,
      enabled: true,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get cache hit rate statistics
 * Returns zeros if Redis is disabled
 */
export async function getCacheStats(): Promise<{
  hits: number;
  misses: number;
  hitRate: number;
}> {
  try {
    const client = getRedisClient();
    if (!client) {
      return { hits: 0, misses: 0, hitRate: 0 };
    }
    const info = await client.info('stats');

    const hitsMatch = info.match(/keyspace_hits:(\d+)/);
    const missesMatch = info.match(/keyspace_misses:(\d+)/);

    const hits = hitsMatch ? parseInt(hitsMatch[1]) : 0;
    const misses = missesMatch ? parseInt(missesMatch[1]) : 0;
    const total = hits + misses;

    return {
      hits,
      misses,
      hitRate: total > 0 ? (hits / total) * 100 : 0
    };
  } catch {
    return { hits: 0, misses: 0, hitRate: 0 };
  }
}

// Export config for monitoring
export { REDIS_CONFIG };
