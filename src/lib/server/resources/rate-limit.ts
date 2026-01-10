/**
 * TASK-107: Rate Limiting
 *
 * Provides rate limiting for:
 * - API endpoints
 * - WebSocket messages
 * - Per-user limits
 * - Graceful error handling with proper messages
 */

import { getRedisClient } from '$lib/server/redis';

/**
 * Rate limit configuration for a specific resource type
 */
export interface RateLimitConfig {
	/** Maximum number of requests allowed */
	maxRequests: number;
	/** Time window in milliseconds */
	windowMs: number;
}

/**
 * Rate limit type categories
 */
export type RateLimitType = 'api' | 'websocket' | 'auth' | 'upload';

/**
 * Result of a rate limit check
 */
export interface RateLimitResult {
	/** Whether the request is allowed */
	allowed: boolean;
	/** Maximum requests per window */
	limit: number;
	/** Remaining requests in current window */
	remaining: number;
	/** Time until reset in milliseconds */
	resetIn: number;
	/** Current request count */
	current: number;
	/** Error message if Redis failed (request still allowed) */
	error?: string;
}

/**
 * Rate limit error response
 */
export interface RateLimitError {
	status: 429;
	message: string;
	retryAfter: number;
}

/**
 * Rate limit status
 */
export interface RateLimitStatus {
	current: number;
	limit: number;
	resetIn: number;
	type: RateLimitType;
}

// Redis key prefix
const RATE_LIMIT_PREFIX = 'rate-limit:';

/**
 * Default rate limits per type
 */
export const DEFAULT_RATE_LIMITS: Record<RateLimitType, RateLimitConfig> = {
	api: {
		maxRequests: 100,
		windowMs: 60000 // 1 minute
	},
	websocket: {
		maxRequests: 200,
		windowMs: 60000 // 1 minute (for messages)
	},
	auth: {
		maxRequests: 10,
		windowMs: 300000 // 5 minutes (for login attempts)
	},
	upload: {
		maxRequests: 20,
		windowMs: 3600000 // 1 hour
	}
};

// Alias for websocket to use maxMessages
const websocketAlias = {
	get maxMessages(): number {
		return DEFAULT_RATE_LIMITS.websocket.maxRequests;
	}
};
Object.defineProperty(DEFAULT_RATE_LIMITS.websocket, 'maxMessages', {
	get: () => DEFAULT_RATE_LIMITS.websocket.maxRequests
});

/**
 * Get the rate limit key for a user/identifier and type
 */
function getRateLimitKey(identifier: string, type: RateLimitType): string {
	const now = new Date();
	const windowKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}-${now.getUTCMinutes()}`;
	return `${RATE_LIMIT_PREFIX}${type}:${identifier}:${windowKey}`;
}

/**
 * Check rate limit for a user/identifier
 *
 * @param identifier - User ID, IP address, or socket ID
 * @param type - Type of rate limit to check
 * @returns RateLimitResult with allowed status and details
 */
export async function checkRateLimit(
	identifier: string,
	type: RateLimitType
): Promise<RateLimitResult> {
	const config = DEFAULT_RATE_LIMITS[type];
	return checkRateLimitWithConfig(identifier, config, type);
}

/**
 * Check rate limit with custom configuration
 *
 * @param identifier - User ID, IP address, or socket ID
 * @param config - Custom rate limit configuration
 * @param type - Optional type for key naming (defaults to 'api')
 * @returns RateLimitResult with allowed status and details
 */
export async function checkRateLimitWithConfig(
	identifier: string,
	config: RateLimitConfig,
	type: RateLimitType = 'api'
): Promise<RateLimitResult> {
	const client = getRedisClient();
	const key = getRateLimitKey(identifier, type);
	const windowSeconds = Math.ceil(config.windowMs / 1000);

	try {
		// Increment counter
		const current = await client.incr(key);

		// Set expiry on first request
		const ttl = await client.pttl(key);
		if (ttl < 0) {
			await client.expire(key, windowSeconds);
		}

		const resetIn = ttl > 0 ? ttl : config.windowMs;
		const allowed = current <= config.maxRequests;
		const remaining = Math.max(0, config.maxRequests - current);

		return {
			allowed,
			limit: config.maxRequests,
			remaining,
			resetIn,
			current
		};
	} catch (error) {
		// Fail open - allow request but log error
		console.error('Rate limit check failed:', error);
		return {
			allowed: true,
			limit: config.maxRequests,
			remaining: config.maxRequests,
			resetIn: config.windowMs,
			current: 0,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Check rate limit using sliding window algorithm
 * More accurate than fixed window but slightly more complex
 *
 * @param identifier - User ID, IP address, or socket ID
 * @param type - Type of rate limit
 * @returns RateLimitResult
 */
export async function checkSlidingWindowRateLimit(
	identifier: string,
	type: RateLimitType
): Promise<RateLimitResult> {
	const config = DEFAULT_RATE_LIMITS[type];
	const client = getRedisClient();
	const key = `${RATE_LIMIT_PREFIX}sliding:${type}:${identifier}`;
	const windowSeconds = Math.ceil(config.windowMs / 1000);

	try {
		const now = Date.now();

		// Get previous window data
		const prevData = await client.get(key);
		let prevCount = 0;
		let prevTimestamp = now;

		if (prevData) {
			try {
				const parsed = JSON.parse(prevData);
				prevCount = parsed.count || 0;
				prevTimestamp = parsed.timestamp || now;
			} catch {
				// Invalid data, start fresh
			}
		}

		// Calculate sliding window rate
		const elapsed = now - prevTimestamp;
		const windowRatio = Math.min(1, elapsed / config.windowMs);
		const adjustedPrevCount = Math.floor(prevCount * (1 - windowRatio));

		// Increment current count
		const current = await client.incr(`${key}:current`);
		const effectiveCount = adjustedPrevCount + current;

		// Update window data
		await client.set(
			key,
			JSON.stringify({ count: current, timestamp: now }),
			'EX',
			windowSeconds * 2
		);

		const allowed = effectiveCount <= config.maxRequests;
		const remaining = Math.max(0, config.maxRequests - effectiveCount);
		const resetIn = config.windowMs - elapsed;

		return {
			allowed,
			limit: config.maxRequests,
			remaining,
			resetIn: Math.max(0, resetIn),
			current: effectiveCount
		};
	} catch (error) {
		console.error('Sliding window rate limit check failed:', error);
		return {
			allowed: true,
			limit: config.maxRequests,
			remaining: config.maxRequests,
			resetIn: config.windowMs,
			current: 0,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Generate HTTP headers for rate limit responses
 *
 * @param result - Rate limit check result
 * @returns Record of header name to value
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
	const headers: Record<string, string> = {
		'X-RateLimit-Limit': String(result.limit),
		'X-RateLimit-Remaining': String(result.remaining),
		'X-RateLimit-Reset': String(Math.ceil(Date.now() + result.resetIn))
	};

	if (!result.allowed) {
		headers['Retry-After'] = String(Math.ceil(result.resetIn / 1000));
	}

	return headers;
}

/**
 * Create a rate limit error response
 *
 * @param retryAfterSeconds - Seconds until rate limit resets
 * @returns RateLimitError object
 */
export function createRateLimitError(retryAfterSeconds: number): RateLimitError {
	return {
		status: 429,
		message: `Too many requests. You have exceeded the rate limit. Please retry after ${retryAfterSeconds} seconds.`,
		retryAfter: retryAfterSeconds
	};
}

/**
 * Interface for request-like objects
 */
interface RequestLike {
	headers: Map<string, string> | Headers | Record<string, string>;
	url: string;
}

/**
 * Extract identifier from request headers
 */
function getIdentifierFromRequest(request: RequestLike): string {
	const headers = request.headers;

	// Try to get user ID from header
	let userId: string | null = null;
	let forwarded: string | null = null;

	if (headers instanceof Map) {
		userId = headers.get('x-user-id') || null;
		forwarded = headers.get('x-forwarded-for') || null;
	} else if (headers instanceof Headers) {
		userId = headers.get('x-user-id');
		forwarded = headers.get('x-forwarded-for');
	} else {
		userId = headers['x-user-id'] || null;
		forwarded = headers['x-forwarded-for'] || null;
	}

	if (userId) {
		return userId;
	}

	// Fall back to IP address
	if (forwarded) {
		return forwarded.split(',')[0].trim();
	}

	// Last resort - use a hash of the URL
	return `anonymous:${Buffer.from(request.url).toString('base64').slice(0, 16)}`;
}

/**
 * Create rate limiting middleware
 *
 * @param type - Type of rate limit to apply
 * @param config - Optional custom configuration
 * @returns Middleware function
 */
export function createRateLimitMiddleware(
	type: RateLimitType = 'api',
	config?: RateLimitConfig
) {
	return async (request: RequestLike): Promise<RateLimitResult> => {
		const identifier = getIdentifierFromRequest(request);

		if (config) {
			return checkRateLimitWithConfig(identifier, config, type);
		}

		return checkRateLimit(identifier, type);
	};
}

/**
 * Reset rate limit for a user
 *
 * @param identifier - User ID or IP address
 * @param type - Type of rate limit
 */
export async function resetRateLimit(identifier: string, type: RateLimitType): Promise<void> {
	const client = getRedisClient();
	const key = getRateLimitKey(identifier, type);
	await client.del(key);
}

/**
 * Get current rate limit status for a user
 *
 * @param identifier - User ID or IP address
 * @param type - Type of rate limit
 * @returns Current status
 */
export async function getRateLimitStatus(
	identifier: string,
	type: RateLimitType
): Promise<RateLimitStatus> {
	const client = getRedisClient();
	const key = getRateLimitKey(identifier, type);
	const config = DEFAULT_RATE_LIMITS[type];

	try {
		const current = await client.get(key);
		const ttl = await client.pttl(key);

		return {
			current: current ? parseInt(current, 10) : 0,
			limit: config.maxRequests,
			resetIn: ttl > 0 ? ttl : 0,
			type
		};
	} catch {
		return {
			current: 0,
			limit: config.maxRequests,
			resetIn: 0,
			type
		};
	}
}

/**
 * Check if any rate limits are exceeded for a user
 *
 * @param identifier - User ID or IP address
 * @returns True if any rate limit is exceeded
 */
export async function isRateLimited(identifier: string): Promise<boolean> {
	const types: RateLimitType[] = ['api', 'websocket', 'auth', 'upload'];

	for (const type of types) {
		const status = await getRateLimitStatus(identifier, type);
		if (status.current >= DEFAULT_RATE_LIMITS[type].maxRequests) {
			return true;
		}
	}

	return false;
}

/**
 * WebSocket-specific rate limiting
 */
export async function checkWebSocketRateLimit(socketId: string): Promise<RateLimitResult> {
	return checkRateLimit(socketId, 'websocket');
}

/**
 * Authentication-specific rate limiting (stricter limits)
 */
export async function checkAuthRateLimit(identifier: string): Promise<RateLimitResult> {
	return checkRateLimit(identifier, 'auth');
}

/**
 * Upload-specific rate limiting
 */
export async function checkUploadRateLimit(userId: string): Promise<RateLimitResult> {
	return checkRateLimit(userId, 'upload');
}
