/**
 * TASK-045: Error Handling and Retries Tests
 *
 * Unit tests for resilience patterns.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	classifyError,
	calculateBackoff,
	withRetry,
	CircuitBreaker,
	CircuitBreakerError,
	RetryPolicies,
	withResilience,
	type ClassifiedError
} from '$lib/server/claude-flow/resilience';
import { CLIError } from '$lib/server/claude-flow/cli';

describe('classifyError', () => {
	it('should classify timeout errors', () => {
		const error = new Error('Request timeout');
		const classified = classifyError(error);

		expect(classified.category).toBe('timeout');
		expect(classified.retryable).toBe(true);
	});

	it('should classify network errors', () => {
		const error = new Error('ECONNREFUSED');
		const classified = classifyError(error);

		expect(classified.category).toBe('network');
		expect(classified.retryable).toBe(true);
	});

	it('should classify resource errors', () => {
		const error = new Error('ENOMEM: out of memory');
		const classified = classifyError(error);

		expect(classified.category).toBe('resource');
		expect(classified.retryable).toBe(true);
	});

	it('should classify transient errors', () => {
		const error = new Error('Rate limit exceeded, try again later');
		const classified = classifyError(error);

		expect(classified.category).toBe('transient');
		expect(classified.retryable).toBe(true);
	});

	it('should classify authentication errors as non-retryable', () => {
		const error = new Error('Authentication failed');
		const classified = classifyError(error);

		expect(classified.category).toBe('authentication');
		expect(classified.retryable).toBe(false);
	});

	it('should classify validation errors as non-retryable', () => {
		const error = new Error('Invalid argument: malformed input');
		const classified = classifyError(error);

		expect(classified.category).toBe('validation');
		expect(classified.retryable).toBe(false);
	});

	it('should classify CLIError with timedOut flag', () => {
		const error = new CLIError('Command timed out', -1, '', true);
		const classified = classifyError(error);

		expect(classified.category).toBe('timeout');
		expect(classified.retryable).toBe(true);
	});

	it('should classify CLIError with 401 exit code', () => {
		const error = new CLIError('Unauthorized', 401, 'Not authorized');
		const classified = classifyError(error);

		expect(classified.category).toBe('authentication');
		expect(classified.retryable).toBe(false);
	});

	it('should classify CLIError with 429 exit code', () => {
		const error = new CLIError('Too many requests', 429, 'Rate limited');
		const classified = classifyError(error);

		expect(classified.category).toBe('transient');
		expect(classified.retryable).toBe(true);
	});

	it('should classify unknown errors', () => {
		const error = new Error('Something unexpected');
		const classified = classifyError(error);

		expect(classified.category).toBe('unknown');
		expect(classified.retryable).toBe(false);
	});

	it('should include retry delay suggestion for retryable errors', () => {
		const error = new Error('Network connection failed');
		const classified = classifyError(error);

		expect(classified.retryAfter).toBeGreaterThan(0);
	});
});

describe('calculateBackoff', () => {
	it('should return initial delay for first attempt', () => {
		const delay = calculateBackoff(0, 1000, 30000, 2, false);

		expect(delay).toBe(1000);
	});

	it('should increase delay exponentially', () => {
		const delay0 = calculateBackoff(0, 1000, 30000, 2, false);
		const delay1 = calculateBackoff(1, 1000, 30000, 2, false);
		const delay2 = calculateBackoff(2, 1000, 30000, 2, false);

		expect(delay0).toBe(1000);
		expect(delay1).toBe(2000);
		expect(delay2).toBe(4000);
	});

	it('should respect max delay', () => {
		const delay = calculateBackoff(10, 1000, 5000, 2, false);

		expect(delay).toBe(5000);
	});

	it('should add jitter when enabled', () => {
		const delays = new Set<number>();
		for (let i = 0; i < 10; i++) {
			delays.add(calculateBackoff(1, 1000, 30000, 2, true));
		}

		// With jitter, we should get varied delays
		expect(delays.size).toBeGreaterThan(1);
	});

	it('should handle custom multiplier', () => {
		const delay = calculateBackoff(2, 1000, 30000, 3, false);

		expect(delay).toBe(9000); // 1000 * 3^2
	});
});

describe('withRetry', () => {
	it('should return result on first success', async () => {
		const fn = vi.fn().mockResolvedValue('success');

		const result = await withRetry(fn, { maxRetries: 3 });

		expect(result).toBe('success');
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('should retry on transient failure', async () => {
		const fn = vi.fn()
			.mockRejectedValueOnce(new Error('ECONNRESET'))
			.mockResolvedValue('success');

		const result = await withRetry(fn, {
			maxRetries: 3,
			initialDelay: 10
		});

		expect(result).toBe('success');
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('should respect maxRetries', async () => {
		const fn = vi.fn().mockRejectedValue(new Error('ECONNRESET'));

		await expect(withRetry(fn, { maxRetries: 2, initialDelay: 10 }))
			.rejects.toThrow('ECONNRESET');

		expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
	});

	it('should not retry non-retryable errors', async () => {
		const fn = vi.fn().mockRejectedValue(new Error('Authentication failed'));

		await expect(withRetry(fn, { maxRetries: 3, initialDelay: 10 }))
			.rejects.toThrow('Authentication failed');

		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('should call onRetry callback', async () => {
		const onRetry = vi.fn();
		const fn = vi.fn()
			.mockRejectedValueOnce(new Error('timeout'))
			.mockResolvedValue('success');

		await withRetry(fn, {
			maxRetries: 3,
			initialDelay: 10,
			onRetry
		});

		expect(onRetry).toHaveBeenCalledWith(
			expect.any(Error),
			1,
			expect.any(Number)
		);
	});

	it('should use custom retryIf predicate', async () => {
		const fn = vi.fn().mockRejectedValue(new Error('custom error'));
		const retryIf = vi.fn().mockReturnValue(true);

		await expect(withRetry(fn, {
			maxRetries: 1,
			initialDelay: 10,
			retryIf
		})).rejects.toThrow();

		expect(retryIf).toHaveBeenCalled();
		expect(fn).toHaveBeenCalledTimes(2);
	});
});

describe('CircuitBreaker', () => {
	let breaker: CircuitBreaker;

	beforeEach(() => {
		breaker = new CircuitBreaker({
			failureThreshold: 3,
			successThreshold: 2,
			resetTimeout: 100
		});
	});

	describe('closed state', () => {
		it('should allow execution', async () => {
			const fn = vi.fn().mockResolvedValue('result');

			const result = await breaker.execute(fn);

			expect(result).toBe('result');
			expect(breaker.getState()).toBe('closed');
		});

		it('should count failures', async () => {
			const fn = vi.fn().mockRejectedValue(new Error('fail'));

			await expect(breaker.execute(fn)).rejects.toThrow();
			await expect(breaker.execute(fn)).rejects.toThrow();

			const stats = breaker.getStats();
			expect(stats.failures).toBe(2);
			expect(breaker.getState()).toBe('closed');
		});

		it('should open after failure threshold', async () => {
			const fn = vi.fn().mockRejectedValue(new Error('fail'));

			for (let i = 0; i < 3; i++) {
				await expect(breaker.execute(fn)).rejects.toThrow();
			}

			expect(breaker.getState()).toBe('open');
		});
	});

	describe('open state', () => {
		it('should reject execution', async () => {
			breaker.trip();

			await expect(breaker.execute(() => Promise.resolve()))
				.rejects.toThrow(CircuitBreakerError);
		});

		it('should indicate circuit is open in error', async () => {
			breaker.trip();

			await expect(breaker.execute(() => Promise.resolve()))
				.rejects.toThrow('Circuit breaker is open');
		});

		it('should transition to half-open after timeout', async () => {
			breaker.trip();

			expect(breaker.getState()).toBe('open');

			// Wait for reset timeout
			await new Promise(r => setTimeout(r, 150));

			expect(breaker.canExecute()).toBe(true);
			expect(breaker.getState()).toBe('half-open');
		});
	});

	describe('half-open state', () => {
		beforeEach(async () => {
			breaker.trip();
			await new Promise(r => setTimeout(r, 150));
			// Now in half-open state
		});

		it('should close after success threshold', async () => {
			const fn = vi.fn().mockResolvedValue('success');

			await breaker.execute(fn);
			await breaker.execute(fn);

			expect(breaker.getState()).toBe('closed');
		});

		it('should reopen on failure', async () => {
			const fn = vi.fn().mockRejectedValue(new Error('fail'));

			await expect(breaker.execute(fn)).rejects.toThrow();

			expect(breaker.getState()).toBe('open');
		});
	});

	describe('callbacks', () => {
		it('should call onOpen when circuit opens', async () => {
			const onOpen = vi.fn();
			const cb = new CircuitBreaker({ failureThreshold: 2, onOpen });

			const fn = vi.fn().mockRejectedValue(new Error('fail'));
			await expect(cb.execute(fn)).rejects.toThrow();
			await expect(cb.execute(fn)).rejects.toThrow();

			expect(onOpen).toHaveBeenCalled();
		});

		it('should call onClose when circuit closes', async () => {
			const onClose = vi.fn();
			const cb = new CircuitBreaker({
				failureThreshold: 1,
				successThreshold: 1,
				resetTimeout: 10,
				onClose
			});

			cb.trip();
			await new Promise(r => setTimeout(r, 20));

			await cb.execute(() => Promise.resolve());

			expect(onClose).toHaveBeenCalled();
		});

		it('should call onHalfOpen when transitioning', async () => {
			const onHalfOpen = vi.fn();
			const cb = new CircuitBreaker({
				failureThreshold: 1,
				resetTimeout: 10,
				onHalfOpen
			});

			cb.trip();
			await new Promise(r => setTimeout(r, 20));

			cb.canExecute();

			expect(onHalfOpen).toHaveBeenCalled();
		});
	});

	describe('manual controls', () => {
		it('should allow manual reset', () => {
			breaker.trip();
			expect(breaker.getState()).toBe('open');

			breaker.reset();
			expect(breaker.getState()).toBe('closed');
		});

		it('should allow manual trip', () => {
			expect(breaker.getState()).toBe('closed');

			breaker.trip();
			expect(breaker.getState()).toBe('open');
		});

		it('should track last failure time', () => {
			const before = Date.now();
			breaker.trip();
			const after = Date.now();

			const stats = breaker.getStats();
			expect(stats.lastFailureTime).toBeGreaterThanOrEqual(before);
			expect(stats.lastFailureTime).toBeLessThanOrEqual(after);
		});
	});
});

describe('RetryPolicies', () => {
	it('should create conservative policy', () => {
		const policy = RetryPolicies.conservative();

		expect(policy.maxRetries).toBe(5);
		expect(policy.initialDelay).toBe(2000);
		expect(policy.maxDelay).toBe(60000);
	});

	it('should create aggressive policy', () => {
		const policy = RetryPolicies.aggressive();

		expect(policy.maxRetries).toBe(3);
		expect(policy.initialDelay).toBe(500);
	});

	it('should create no-retry policy', () => {
		const policy = RetryPolicies.none();

		expect(policy.maxRetries).toBe(0);
	});

	it('should create network-only policy', async () => {
		const policy = RetryPolicies.networkOnly();

		// Network error should be retryable
		const networkPredicate = policy.retryIf!;
		expect(networkPredicate(new Error('ECONNREFUSED'), 0)).toBe(true);

		// Other errors should not be retryable
		expect(networkPredicate(new Error('Authentication failed'), 0)).toBe(false);
	});

	it('should create transient-only policy', async () => {
		const policy = RetryPolicies.transientOnly();

		const predicate = policy.retryIf!;
		expect(predicate(new Error('Rate limit exceeded'), 0)).toBe(true);
		expect(predicate(new Error('Invalid input'), 0)).toBe(false);
	});
});

describe('withResilience', () => {
	it('should combine retry and circuit breaker', async () => {
		const breaker = new CircuitBreaker({ failureThreshold: 5 });
		const fn = vi.fn()
			.mockRejectedValueOnce(new Error('ECONNRESET'))
			.mockResolvedValue('success');

		const result = await withResilience(
			fn,
			{ maxRetries: 3, initialDelay: 10 },
			breaker
		);

		expect(result).toBe('success');
		expect(fn).toHaveBeenCalledTimes(2);
		expect(breaker.getState()).toBe('closed');
	});

	it('should fail fast when circuit is open', async () => {
		const breaker = new CircuitBreaker({ failureThreshold: 1 });
		breaker.trip();

		const fn = vi.fn().mockResolvedValue('success');

		await expect(
			withResilience(fn, { maxRetries: 3, initialDelay: 10 }, breaker)
		).rejects.toThrow(CircuitBreakerError);

		expect(fn).not.toHaveBeenCalled();
	});
});

describe('CircuitBreakerError', () => {
	it('should have correct name', () => {
		const error = new CircuitBreakerError('test');

		expect(error.name).toBe('CircuitBreakerError');
		expect(error.message).toBe('test');
		expect(error instanceof Error).toBe(true);
	});
});
