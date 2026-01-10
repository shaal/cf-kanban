/**
 * TASK-107: Rate Limiting Tests
 *
 * Tests for rate limiting including:
 * - API rate limiting middleware
 * - WebSocket rate limiting
 * - Per-user limits
 * - Graceful error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Redis client
const mockRedisClient = {
	get: vi.fn(),
	set: vi.fn().mockResolvedValue('OK'),
	incr: vi.fn().mockResolvedValue(1),
	expire: vi.fn().mockResolvedValue(1),
	ttl: vi.fn().mockResolvedValue(60),
	pttl: vi.fn().mockResolvedValue(60000),
	del: vi.fn().mockResolvedValue(1)
};

vi.mock('$lib/server/redis', () => ({
	getRedisClient: vi.fn(() => mockRedisClient)
}));

describe('Rate Limiting', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('RateLimitConfig', () => {
		it('should define rate limit configuration', async () => {
			const { RateLimitConfig, DEFAULT_RATE_LIMITS } = await import('$lib/server/resources/rate-limit');

			expect(DEFAULT_RATE_LIMITS).toMatchObject({
				api: expect.objectContaining({
					maxRequests: expect.any(Number),
					windowMs: expect.any(Number)
				}),
				websocket: expect.objectContaining({
					maxMessages: expect.any(Number),
					windowMs: expect.any(Number)
				})
			});
		});
	});

	describe('RateLimitResult', () => {
		it('should return allowed result when under limit', async () => {
			const { checkRateLimit } = await import('$lib/server/resources/rate-limit');

			mockRedisClient.incr.mockResolvedValue(5);
			mockRedisClient.pttl.mockResolvedValue(30000);

			const result = await checkRateLimit('user-123', 'api');

			expect(result.allowed).toBe(true);
			expect(result.remaining).toBeGreaterThan(0);
			expect(result.resetIn).toBeLessThanOrEqual(60000);
		});

		it('should return blocked result when over limit', async () => {
			const { checkRateLimit } = await import('$lib/server/resources/rate-limit');

			mockRedisClient.incr.mockResolvedValue(101);
			mockRedisClient.pttl.mockResolvedValue(30000);

			const result = await checkRateLimit('user-123', 'api');

			expect(result.allowed).toBe(false);
			expect(result.remaining).toBe(0);
		});
	});

	describe('checkRateLimit', () => {
		it('should increment counter on each request', async () => {
			const { checkRateLimit } = await import('$lib/server/resources/rate-limit');

			mockRedisClient.incr.mockResolvedValue(1);

			await checkRateLimit('user-123', 'api');

			expect(mockRedisClient.incr).toHaveBeenCalledWith(
				expect.stringContaining('rate-limit:api:user-123')
			);
		});

		it('should set expiry on first request', async () => {
			const { checkRateLimit } = await import('$lib/server/resources/rate-limit');

			mockRedisClient.incr.mockResolvedValue(1);
			mockRedisClient.pttl.mockResolvedValue(-1); // No TTL set

			await checkRateLimit('user-123', 'api');

			expect(mockRedisClient.expire).toHaveBeenCalled();
		});

		it('should not reset expiry on subsequent requests', async () => {
			const { checkRateLimit } = await import('$lib/server/resources/rate-limit');

			mockRedisClient.incr.mockResolvedValue(5);
			mockRedisClient.pttl.mockResolvedValue(45000); // TTL exists

			await checkRateLimit('user-123', 'api');

			// expire should not be called when TTL already exists
			expect(mockRedisClient.expire).not.toHaveBeenCalled();
		});
	});

	describe('WebSocket Rate Limiting', () => {
		it('should limit WebSocket messages per connection', async () => {
			const { checkRateLimit } = await import('$lib/server/resources/rate-limit');

			mockRedisClient.incr.mockResolvedValue(50);
			mockRedisClient.pttl.mockResolvedValue(30000);

			const result = await checkRateLimit('socket-123', 'websocket');

			expect(result.allowed).toBe(true);
		});

		it('should block excessive WebSocket messages', async () => {
			const { checkRateLimit, DEFAULT_RATE_LIMITS } = await import('$lib/server/resources/rate-limit');

			mockRedisClient.incr.mockResolvedValue(DEFAULT_RATE_LIMITS.websocket.maxMessages + 1);
			mockRedisClient.pttl.mockResolvedValue(30000);

			const result = await checkRateLimit('socket-123', 'websocket');

			expect(result.allowed).toBe(false);
		});
	});

	describe('Per-User Rate Limiting', () => {
		it('should track limits separately per user', async () => {
			const { checkRateLimit } = await import('$lib/server/resources/rate-limit');

			mockRedisClient.incr.mockResolvedValue(1);

			await checkRateLimit('user-1', 'api');
			await checkRateLimit('user-2', 'api');

			expect(mockRedisClient.incr).toHaveBeenCalledWith(
				expect.stringContaining('user-1')
			);
			expect(mockRedisClient.incr).toHaveBeenCalledWith(
				expect.stringContaining('user-2')
			);
		});
	});

	describe('Custom Limits', () => {
		it('should accept custom rate limits', async () => {
			const { checkRateLimitWithConfig } = await import('$lib/server/resources/rate-limit');

			mockRedisClient.incr.mockResolvedValue(5);
			mockRedisClient.pttl.mockResolvedValue(30000);

			const result = await checkRateLimitWithConfig('user-123', {
				maxRequests: 10,
				windowMs: 60000
			});

			expect(result.limit).toBe(10);
		});
	});

	describe('Rate Limit Headers', () => {
		it('should provide headers for HTTP responses', async () => {
			const { getRateLimitHeaders } = await import('$lib/server/resources/rate-limit');

			mockRedisClient.incr.mockResolvedValue(50);
			mockRedisClient.pttl.mockResolvedValue(30000);

			const { checkRateLimit } = await import('$lib/server/resources/rate-limit');
			const result = await checkRateLimit('user-123', 'api');

			const headers = getRateLimitHeaders(result);

			expect(headers['X-RateLimit-Limit']).toBeDefined();
			expect(headers['X-RateLimit-Remaining']).toBeDefined();
			expect(headers['X-RateLimit-Reset']).toBeDefined();
		});

		it('should include Retry-After header when blocked', async () => {
			const { getRateLimitHeaders, checkRateLimit } = await import('$lib/server/resources/rate-limit');

			mockRedisClient.incr.mockResolvedValue(200);
			mockRedisClient.pttl.mockResolvedValue(30000);

			const result = await checkRateLimit('user-123', 'api');

			const headers = getRateLimitHeaders(result);

			expect(headers['Retry-After']).toBeDefined();
		});
	});

	describe('createRateLimitMiddleware', () => {
		it('should return middleware function', async () => {
			const { createRateLimitMiddleware } = await import('$lib/server/resources/rate-limit');

			const middleware = createRateLimitMiddleware();

			expect(typeof middleware).toBe('function');
		});

		it('should extract user ID from request', async () => {
			const { createRateLimitMiddleware } = await import('$lib/server/resources/rate-limit');

			mockRedisClient.incr.mockResolvedValue(1);
			mockRedisClient.pttl.mockResolvedValue(-1);

			const middleware = createRateLimitMiddleware();

			const mockRequest = {
				headers: new Map([['x-user-id', 'user-123']]),
				url: 'http://localhost/api/test'
			};

			const result = await middleware(mockRequest as any);

			expect(result.allowed).toBe(true);
		});

		it('should use IP fallback when no user ID', async () => {
			const { createRateLimitMiddleware } = await import('$lib/server/resources/rate-limit');

			mockRedisClient.incr.mockResolvedValue(1);
			mockRedisClient.pttl.mockResolvedValue(-1);

			const middleware = createRateLimitMiddleware();

			const mockRequest = {
				headers: new Map([['x-forwarded-for', '192.168.1.1']]),
				url: 'http://localhost/api/test'
			};

			const result = await middleware(mockRequest as any);

			expect(mockRedisClient.incr).toHaveBeenCalledWith(
				expect.stringContaining('192.168.1.1')
			);
		});
	});

	describe('Graceful Error Handling', () => {
		it('should return error response with proper message', async () => {
			const { createRateLimitError } = await import('$lib/server/resources/rate-limit');

			const error = createRateLimitError(30);

			expect(error.status).toBe(429);
			expect(error.message).toContain('rate limit');
			expect(error.retryAfter).toBe(30);
		});

		it('should handle Redis errors gracefully', async () => {
			const { checkRateLimit } = await import('$lib/server/resources/rate-limit');

			mockRedisClient.incr.mockRejectedValue(new Error('Redis connection failed'));

			// Should not throw, but allow the request (fail open)
			const result = await checkRateLimit('user-123', 'api');

			expect(result.allowed).toBe(true);
			expect(result.error).toBeDefined();
		});
	});

	describe('Sliding Window Rate Limiting', () => {
		it('should use sliding window for more accurate limiting', async () => {
			const { checkSlidingWindowRateLimit } = await import('$lib/server/resources/rate-limit');

			mockRedisClient.get.mockResolvedValue(JSON.stringify({
				count: 50,
				timestamp: Date.now() - 30000 // 30 seconds ago
			}));
			mockRedisClient.incr.mockResolvedValue(51);

			const result = await checkSlidingWindowRateLimit('user-123', 'api');

			expect(result.allowed).toBe(true);
		});
	});

	describe('resetRateLimit', () => {
		it('should reset rate limit for a user', async () => {
			const { resetRateLimit } = await import('$lib/server/resources/rate-limit');

			await resetRateLimit('user-123', 'api');

			expect(mockRedisClient.del).toHaveBeenCalledWith(
				expect.stringContaining('user-123')
			);
		});
	});

	describe('getRateLimitStatus', () => {
		it('should return current rate limit status', async () => {
			const { getRateLimitStatus } = await import('$lib/server/resources/rate-limit');

			mockRedisClient.get.mockResolvedValue('45');
			mockRedisClient.pttl.mockResolvedValue(25000);

			const status = await getRateLimitStatus('user-123', 'api');

			expect(status.current).toBe(45);
			expect(status.resetIn).toBe(25000);
		});
	});
});
