/**
 * TASK-045: Error Handling and Retries
 *
 * Provides resilience patterns including exponential backoff,
 * circuit breaker, and error classification for CLI commands.
 */

import { CLIError } from './cli';

/**
 * Error categories for classification
 */
export type ErrorCategory =
	| 'transient'
	| 'network'
	| 'timeout'
	| 'resource'
	| 'authentication'
	| 'validation'
	| 'internal'
	| 'unknown';

/**
 * Classified error with additional metadata
 */
export interface ClassifiedError {
	/** Original error */
	original: Error;
	/** Error category */
	category: ErrorCategory;
	/** Whether the error is retryable */
	retryable: boolean;
	/** Suggested wait time before retry in ms */
	retryAfter?: number;
	/** Additional context */
	context?: Record<string, unknown>;
}

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
	/** Maximum number of retry attempts */
	maxRetries?: number;
	/** Initial delay in ms */
	initialDelay?: number;
	/** Maximum delay in ms */
	maxDelay?: number;
	/** Backoff multiplier */
	backoffMultiplier?: number;
	/** Add jitter to delays */
	jitter?: boolean;
	/** Filter function to determine if error is retryable */
	retryIf?: (error: Error, attempt: number) => boolean;
	/** Callback for each retry attempt */
	onRetry?: (error: Error, attempt: number, delay: number) => void;
}

/**
 * Configuration for circuit breaker
 */
export interface CircuitBreakerConfig {
	/** Failure threshold before opening */
	failureThreshold?: number;
	/** Success threshold to close from half-open */
	successThreshold?: number;
	/** Timeout in ms before transitioning to half-open */
	resetTimeout?: number;
	/** Callback when circuit opens */
	onOpen?: () => void;
	/** Callback when circuit closes */
	onClose?: () => void;
	/** Callback when circuit half-opens */
	onHalfOpen?: () => void;
}

/**
 * Circuit breaker state
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Error classification patterns
 */
const ERROR_PATTERNS: Array<{
	pattern: RegExp | ((error: Error) => boolean);
	category: ErrorCategory;
	retryable: boolean;
}> = [
	// Timeout errors
	{ pattern: /timeout/i, category: 'timeout', retryable: true },
	{ pattern: /timed out/i, category: 'timeout', retryable: true },
	{ pattern: (e) => e instanceof CLIError && e.timedOut, category: 'timeout', retryable: true },

	// Network errors
	{ pattern: /network/i, category: 'network', retryable: true },
	{ pattern: /ECONNREFUSED/i, category: 'network', retryable: true },
	{ pattern: /ECONNRESET/i, category: 'network', retryable: true },
	{ pattern: /ENOTFOUND/i, category: 'network', retryable: true },
	{ pattern: /socket hang up/i, category: 'network', retryable: true },

	// Resource errors
	{ pattern: /ENOMEM/i, category: 'resource', retryable: true },
	{ pattern: /EMFILE/i, category: 'resource', retryable: true },
	{ pattern: /too many open files/i, category: 'resource', retryable: true },
	{ pattern: /out of memory/i, category: 'resource', retryable: true },

	// Transient errors
	{ pattern: /temporarily unavailable/i, category: 'transient', retryable: true },
	{ pattern: /try again/i, category: 'transient', retryable: true },
	{ pattern: /rate limit/i, category: 'transient', retryable: true },
	{ pattern: /throttl/i, category: 'transient', retryable: true },
	{ pattern: (e) => e instanceof CLIError && e.exitCode === 429, category: 'transient', retryable: true },

	// Authentication errors (not retryable)
	{ pattern: /authentication/i, category: 'authentication', retryable: false },
	{ pattern: /unauthorized/i, category: 'authentication', retryable: false },
	{ pattern: /api key/i, category: 'authentication', retryable: false },
	{ pattern: (e) => e instanceof CLIError && e.exitCode === 401, category: 'authentication', retryable: false },

	// Validation errors (not retryable)
	{ pattern: /invalid/i, category: 'validation', retryable: false },
	{ pattern: /validation/i, category: 'validation', retryable: false },
	{ pattern: /malformed/i, category: 'validation', retryable: false },
	{ pattern: (e) => e instanceof CLIError && e.exitCode === 400, category: 'validation', retryable: false },

	// Internal errors (sometimes retryable)
	{ pattern: /internal error/i, category: 'internal', retryable: true },
	{ pattern: (e) => e instanceof CLIError && e.exitCode >= 500, category: 'internal', retryable: true }
];

/**
 * Classify an error into a category
 *
 * @param error - The error to classify
 * @returns Classified error with metadata
 */
export function classifyError(error: Error): ClassifiedError {
	const errorMessage = error.message + (error instanceof CLIError ? error.stderr : '');

	for (const { pattern, category, retryable } of ERROR_PATTERNS) {
		const matches = typeof pattern === 'function'
			? pattern(error)
			: pattern.test(errorMessage);

		if (matches) {
			return {
				original: error,
				category,
				retryable,
				retryAfter: retryable ? suggestRetryDelay(category) : undefined
			};
		}
	}

	return {
		original: error,
		category: 'unknown',
		retryable: false
	};
}

/**
 * Suggest a retry delay based on error category
 */
function suggestRetryDelay(category: ErrorCategory): number {
	switch (category) {
		case 'transient':
			return 5000; // 5 seconds for rate limits
		case 'network':
			return 1000; // 1 second for network issues
		case 'timeout':
			return 2000; // 2 seconds after timeout
		case 'resource':
			return 10000; // 10 seconds for resource issues
		case 'internal':
			return 3000; // 3 seconds for internal errors
		default:
			return 1000;
	}
}

/**
 * Calculate delay with exponential backoff and optional jitter
 *
 * @param attempt - Current attempt number (0-based)
 * @param initialDelay - Initial delay in ms
 * @param maxDelay - Maximum delay in ms
 * @param multiplier - Backoff multiplier
 * @param jitter - Whether to add jitter
 * @returns Delay in ms
 */
export function calculateBackoff(
	attempt: number,
	initialDelay = 1000,
	maxDelay = 30000,
	multiplier = 2,
	jitter = true
): number {
	let delay = initialDelay * Math.pow(multiplier, attempt);
	delay = Math.min(delay, maxDelay);

	if (jitter) {
		// Add 0-25% random jitter
		const jitterAmount = delay * 0.25 * Math.random();
		delay += jitterAmount;
	}

	return Math.floor(delay);
}

/**
 * Execute a function with retry logic
 *
 * @param fn - Function to execute
 * @param config - Retry configuration
 * @returns Result of the function
 * @throws Error if all retries fail
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	config: RetryConfig = {}
): Promise<T> {
	const {
		maxRetries = 3,
		initialDelay = 1000,
		maxDelay = 30000,
		backoffMultiplier = 2,
		jitter = true,
		retryIf = defaultRetryPredicate,
		onRetry
	} = config;

	let lastError: Error;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			if (attempt >= maxRetries || !retryIf(lastError, attempt)) {
				throw lastError;
			}

			const delay = calculateBackoff(attempt, initialDelay, maxDelay, backoffMultiplier, jitter);

			onRetry?.(lastError, attempt + 1, delay);

			await sleep(delay);
		}
	}

	throw lastError!;
}

/**
 * Default retry predicate
 */
function defaultRetryPredicate(error: Error): boolean {
	const classified = classifyError(error);
	return classified.retryable;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Circuit Breaker implementation
 *
 * Prevents cascading failures by temporarily stopping calls
 * to a failing service.
 */
export class CircuitBreaker {
	private state: CircuitState = 'closed';
	private failures: number = 0;
	private successes: number = 0;
	private lastFailureTime: number = 0;
	private readonly config: Required<CircuitBreakerConfig>;

	constructor(config: CircuitBreakerConfig = {}) {
		this.config = {
			failureThreshold: config.failureThreshold ?? 5,
			successThreshold: config.successThreshold ?? 2,
			resetTimeout: config.resetTimeout ?? 30000,
			onOpen: config.onOpen ?? (() => {}),
			onClose: config.onClose ?? (() => {}),
			onHalfOpen: config.onHalfOpen ?? (() => {})
		};
	}

	/**
	 * Execute a function through the circuit breaker
	 *
	 * @param fn - Function to execute
	 * @returns Result of the function
	 * @throws Error if circuit is open or function fails
	 */
	async execute<T>(fn: () => Promise<T>): Promise<T> {
		if (!this.canExecute()) {
			throw new CircuitBreakerError('Circuit breaker is open');
		}

		try {
			const result = await fn();
			this.recordSuccess();
			return result;
		} catch (error) {
			this.recordFailure();
			throw error;
		}
	}

	/**
	 * Check if a call can be made
	 */
	canExecute(): boolean {
		switch (this.state) {
			case 'closed':
				return true;

			case 'open':
				// Check if we should transition to half-open
				if (Date.now() - this.lastFailureTime >= this.config.resetTimeout) {
					this.transitionTo('half-open');
					return true;
				}
				return false;

			case 'half-open':
				return true;

			default:
				return false;
		}
	}

	/**
	 * Record a successful call
	 */
	private recordSuccess(): void {
		this.failures = 0;

		if (this.state === 'half-open') {
			this.successes++;
			if (this.successes >= this.config.successThreshold) {
				this.transitionTo('closed');
			}
		}
	}

	/**
	 * Record a failed call
	 */
	private recordFailure(): void {
		this.failures++;
		this.lastFailureTime = Date.now();

		if (this.state === 'half-open') {
			this.transitionTo('open');
		} else if (this.failures >= this.config.failureThreshold) {
			this.transitionTo('open');
		}
	}

	/**
	 * Transition to a new state
	 */
	private transitionTo(newState: CircuitState): void {
		const previousState = this.state;
		this.state = newState;

		if (newState === 'open') {
			this.config.onOpen();
		} else if (newState === 'closed') {
			this.successes = 0;
			this.failures = 0;
			this.config.onClose();
		} else if (newState === 'half-open') {
			this.successes = 0;
			this.config.onHalfOpen();
		}
	}

	/**
	 * Get current circuit state
	 */
	getState(): CircuitState {
		return this.state;
	}

	/**
	 * Get circuit statistics
	 */
	getStats(): {
		state: CircuitState;
		failures: number;
		successes: number;
		lastFailureTime: number | null;
	} {
		return {
			state: this.state,
			failures: this.failures,
			successes: this.successes,
			lastFailureTime: this.lastFailureTime || null
		};
	}

	/**
	 * Manually reset the circuit breaker
	 */
	reset(): void {
		this.transitionTo('closed');
	}

	/**
	 * Manually trip the circuit breaker
	 */
	trip(): void {
		this.lastFailureTime = Date.now();
		this.transitionTo('open');
	}
}

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CircuitBreakerError';
	}
}

/**
 * Retry policy factory
 *
 * Creates pre-configured retry configurations for common scenarios.
 */
export const RetryPolicies = {
	/** Conservative retry for important operations */
	conservative: (): RetryConfig => ({
		maxRetries: 5,
		initialDelay: 2000,
		maxDelay: 60000,
		backoffMultiplier: 2,
		jitter: true
	}),

	/** Aggressive retry for quick operations */
	aggressive: (): RetryConfig => ({
		maxRetries: 3,
		initialDelay: 500,
		maxDelay: 5000,
		backoffMultiplier: 1.5,
		jitter: true
	}),

	/** No retry */
	none: (): RetryConfig => ({
		maxRetries: 0
	}),

	/** Only network errors */
	networkOnly: (): RetryConfig => ({
		maxRetries: 3,
		initialDelay: 1000,
		maxDelay: 10000,
		backoffMultiplier: 2,
		jitter: true,
		retryIf: (error: Error) => {
			const classified = classifyError(error);
			return classified.category === 'network';
		}
	}),

	/** Only transient errors (rate limits, temporary failures) */
	transientOnly: (): RetryConfig => ({
		maxRetries: 5,
		initialDelay: 5000,
		maxDelay: 60000,
		backoffMultiplier: 2,
		jitter: true,
		retryIf: (error: Error) => {
			const classified = classifyError(error);
			return classified.category === 'transient';
		}
	})
};

/**
 * Combine retry with circuit breaker for maximum resilience
 *
 * @param fn - Function to execute
 * @param retryConfig - Retry configuration
 * @param circuitBreaker - Circuit breaker instance
 * @returns Result of the function
 */
export async function withResilience<T>(
	fn: () => Promise<T>,
	retryConfig: RetryConfig,
	circuitBreaker: CircuitBreaker
): Promise<T> {
	return withRetry(
		() => circuitBreaker.execute(fn),
		retryConfig
	);
}
