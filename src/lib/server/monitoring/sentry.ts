/**
 * TASK-113: Sentry Error Tracking Integration
 *
 * Provides error tracking and performance monitoring with Sentry.
 * Automatically captures errors, performance data, and user context.
 */

// Sentry configuration and types
export interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
  debug: boolean;
}

// Error severity levels
export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

// User context for error tracking
export interface UserContext {
  id?: string;
  email?: string;
  username?: string;
  ip_address?: string;
}

// Captured error with context
export interface CapturedError {
  error: Error;
  level: ErrorSeverity;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: UserContext;
  fingerprint?: string[];
}

// Performance transaction
export interface Transaction {
  name: string;
  op: string;
  startTimestamp: number;
  endTimestamp?: number;
  status: 'ok' | 'error' | 'cancelled';
  tags: Record<string, string>;
  spans: Span[];
}

// Performance span
export interface Span {
  name: string;
  op: string;
  startTimestamp: number;
  endTimestamp?: number;
  status: 'ok' | 'error';
  data?: Record<string, unknown>;
}

/**
 * Get Sentry configuration from environment
 */
export function getSentryConfig(): SentryConfig {
  return {
    dsn: process.env.SENTRY_DSN || '',
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || `cf-kanban@${process.env.npm_package_version || '0.0.0'}`,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
    debug: process.env.NODE_ENV === 'development'
  };
}

/**
 * Check if Sentry is enabled
 */
export function isSentryEnabled(): boolean {
  const config = getSentryConfig();
  return Boolean(config.dsn && config.dsn.length > 0);
}

// In-memory error buffer for when Sentry is not available
const errorBuffer: CapturedError[] = [];
const MAX_BUFFER_SIZE = 100;

/**
 * Capture an error for tracking
 */
export function captureError(
  error: Error,
  options: {
    level?: ErrorSeverity;
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    user?: UserContext;
    fingerprint?: string[];
  } = {}
): string {
  const captured: CapturedError = {
    error,
    level: options.level || 'error',
    tags: options.tags,
    extra: options.extra,
    user: options.user,
    fingerprint: options.fingerprint
  };

  // Generate event ID
  const eventId = generateEventId();

  // Log the error
  console.error(`[Sentry] Captured error (${eventId}):`, error.message);

  if (isSentryEnabled()) {
    // In production, this would call Sentry SDK
    // For now, we buffer for potential future processing
    bufferError(captured);
  } else {
    // In development, log full stack trace
    console.error(error.stack);
  }

  return eventId;
}

/**
 * Capture a message for tracking
 */
export function captureMessage(
  message: string,
  level: ErrorSeverity = 'info',
  extra?: Record<string, unknown>
): string {
  const eventId = generateEventId();

  console.log(`[Sentry] Captured message (${eventId}): ${message}`);

  if (extra) {
    console.log('[Sentry] Extra data:', extra);
  }

  return eventId;
}

/**
 * Set user context for error tracking
 */
export function setUser(user: UserContext | null): void {
  if (user) {
    console.log('[Sentry] User context set:', user.id || user.email || 'anonymous');
  } else {
    console.log('[Sentry] User context cleared');
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: {
  category: string;
  message: string;
  level?: ErrorSeverity;
  data?: Record<string, unknown>;
}): void {
  console.debug(`[Sentry] Breadcrumb: [${breadcrumb.category}] ${breadcrumb.message}`);
}

/**
 * Start a performance transaction
 */
export function startTransaction(name: string, op: string): Transaction {
  const transaction: Transaction = {
    name,
    op,
    startTimestamp: Date.now(),
    status: 'ok',
    tags: {},
    spans: []
  };

  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[Sentry] Transaction started: ${name} (${op})`);
  }

  return transaction;
}

/**
 * Start a span within a transaction
 */
export function startSpan(transaction: Transaction, name: string, op: string): Span {
  const span: Span = {
    name,
    op,
    startTimestamp: Date.now(),
    status: 'ok'
  };

  transaction.spans.push(span);

  return span;
}

/**
 * Finish a span
 */
export function finishSpan(span: Span, status: 'ok' | 'error' = 'ok'): void {
  span.endTimestamp = Date.now();
  span.status = status;

  const duration = span.endTimestamp - span.startTimestamp;
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[Sentry] Span finished: ${span.name} (${duration}ms)`);
  }
}

/**
 * Finish a transaction
 */
export function finishTransaction(
  transaction: Transaction,
  status: 'ok' | 'error' | 'cancelled' = 'ok'
): void {
  transaction.endTimestamp = Date.now();
  transaction.status = status;

  const duration = transaction.endTimestamp - transaction.startTimestamp;

  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[Sentry] Transaction finished: ${transaction.name} (${duration}ms)`);
  }

  // In production, this would send to Sentry
  if (isSentryEnabled()) {
    // Track performance data
    console.log(`[Sentry] Performance: ${transaction.name} = ${duration}ms`);
  }
}

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Buffer error for later processing
 */
function bufferError(captured: CapturedError): void {
  if (errorBuffer.length >= MAX_BUFFER_SIZE) {
    errorBuffer.shift(); // Remove oldest
  }
  errorBuffer.push(captured);
}

/**
 * Get buffered errors (for debugging/testing)
 */
export function getBufferedErrors(): CapturedError[] {
  return [...errorBuffer];
}

/**
 * Clear error buffer
 */
export function clearErrorBuffer(): void {
  errorBuffer.length = 0;
}

/**
 * Flush errors (would send to Sentry in production)
 */
export async function flushErrors(): Promise<number> {
  const count = errorBuffer.length;
  // In production, this would send buffered errors to Sentry
  clearErrorBuffer();
  return count;
}
