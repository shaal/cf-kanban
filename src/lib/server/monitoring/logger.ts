/**
 * TASK-113: Structured Logging Module
 *
 * Provides structured logging with JSON output for log aggregation.
 * Compatible with ELK, Datadog, Loki, and other log aggregation systems.
 */

// Log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// Log level priorities
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4
};

// Structured log entry
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  environment: string;
  version?: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  requestId?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  [key: string]: unknown;
}

// Logger configuration
export interface LoggerConfig {
  level: LogLevel;
  service: string;
  environment: string;
  version?: string;
  format: 'json' | 'pretty';
  output: 'stdout' | 'stderr' | 'both';
}

// Global context that's included in all log entries
const globalContext: Record<string, unknown> = {};

/**
 * Get current log level from environment
 */
function getMinLogLevel(): LogLevel {
  const level = (process.env.LOG_LEVEL || 'info').toLowerCase();
  if (level in LOG_LEVEL_PRIORITY) {
    return level as LogLevel;
  }
  return 'info';
}

/**
 * Get logger configuration from environment
 */
function getLoggerConfig(): LoggerConfig {
  return {
    level: getMinLogLevel(),
    service: process.env.SERVICE_NAME || 'cf-kanban',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || process.env.SENTRY_RELEASE,
    format: process.env.LOG_FORMAT === 'pretty' ? 'pretty' : 'json',
    output: 'stdout'
  };
}

/**
 * Check if a log level should be logged
 */
function shouldLog(level: LogLevel): boolean {
  const config = getLoggerConfig();
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[config.level];
}

/**
 * Format log entry for output
 */
function formatLogEntry(entry: LogEntry, format: 'json' | 'pretty'): string {
  if (format === 'json') {
    return JSON.stringify(entry);
  }

  // Pretty format for development
  const levelColors: Record<LogLevel, string> = {
    debug: '\x1b[36m',  // Cyan
    info: '\x1b[32m',   // Green
    warn: '\x1b[33m',   // Yellow
    error: '\x1b[31m',  // Red
    fatal: '\x1b[35m'   // Magenta
  };
  const reset = '\x1b[0m';

  const color = levelColors[entry.level];
  const levelStr = entry.level.toUpperCase().padEnd(5);
  const time = entry.timestamp.split('T')[1].replace('Z', '');

  let output = `${color}${levelStr}${reset} [${time}] ${entry.message}`;

  // Add context
  const contextKeys = Object.keys(entry).filter(
    k => !['timestamp', 'level', 'message', 'service', 'environment', 'version'].includes(k)
  );

  if (contextKeys.length > 0) {
    const context = contextKeys
      .map(k => {
        const v = entry[k];
        if (k === 'error' && typeof v === 'object' && v !== null) {
          return `error=${(v as { message: string }).message}`;
        }
        if (typeof v === 'object') {
          return `${k}=${JSON.stringify(v)}`;
        }
        return `${k}=${v}`;
      })
      .join(' ');
    output += ` ${context}`;
  }

  // Add stack trace for errors
  if (entry.error?.stack && entry.level === 'error') {
    output += `\n${entry.error.stack}`;
  }

  return output;
}

/**
 * Write log entry to output
 */
function writeLog(entry: LogEntry): void {
  const config = getLoggerConfig();
  const output = formatLogEntry(entry, config.format);

  if (entry.level === 'error' || entry.level === 'fatal') {
    console.error(output);
  } else {
    console.log(output);
  }
}

/**
 * Create a log entry
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>
): LogEntry {
  const config = getLoggerConfig();

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: config.service,
    environment: config.environment,
    ...globalContext,
    ...context
  };

  if (config.version) {
    entry.version = config.version;
  }

  return entry;
}

/**
 * Set global context that's included in all log entries
 */
export function setGlobalContext(context: Record<string, unknown>): void {
  Object.assign(globalContext, context);
}

/**
 * Clear global context
 */
export function clearGlobalContext(): void {
  Object.keys(globalContext).forEach(key => delete globalContext[key]);
}

/**
 * Create a child logger with additional context
 */
export function createChildLogger(context: Record<string, unknown>) {
  return {
    debug: (message: string, extra?: Record<string, unknown>) =>
      debug(message, { ...context, ...extra }),
    info: (message: string, extra?: Record<string, unknown>) =>
      info(message, { ...context, ...extra }),
    warn: (message: string, extra?: Record<string, unknown>) =>
      warn(message, { ...context, ...extra }),
    error: (message: string, error?: Error | Record<string, unknown>, extra?: Record<string, unknown>) =>
      logError(message, error, { ...context, ...extra }),
    fatal: (message: string, error?: Error, extra?: Record<string, unknown>) =>
      fatal(message, error, { ...context, ...extra })
  };
}

/**
 * Log at debug level
 */
export function debug(message: string, context?: Record<string, unknown>): void {
  if (!shouldLog('debug')) return;
  writeLog(createLogEntry('debug', message, context));
}

/**
 * Log at info level
 */
export function info(message: string, context?: Record<string, unknown>): void {
  if (!shouldLog('info')) return;
  writeLog(createLogEntry('info', message, context));
}

/**
 * Log at warn level
 */
export function warn(message: string, context?: Record<string, unknown>): void {
  if (!shouldLog('warn')) return;
  writeLog(createLogEntry('warn', message, context));
}

/**
 * Log at error level
 */
export function logError(
  message: string,
  error?: Error | Record<string, unknown>,
  context?: Record<string, unknown>
): void {
  if (!shouldLog('error')) return;

  const entry = createLogEntry('error', message, context);

  if (error instanceof Error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  } else if (error) {
    entry.error = error as { name: string; message: string };
  }

  writeLog(entry);
}

// Alias for error
export { logError as error };

/**
 * Log at fatal level
 */
export function fatal(
  message: string,
  error?: Error,
  context?: Record<string, unknown>
): void {
  if (!shouldLog('fatal')) return;

  const entry = createLogEntry('fatal', message, context);

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  writeLog(entry);
}

/**
 * Log HTTP request
 */
export function logRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  context?: Record<string, unknown>
): void {
  const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

  if (!shouldLog(level)) return;

  writeLog(createLogEntry(level, `${method} ${path} ${statusCode}`, {
    method,
    path,
    statusCode,
    duration,
    ...context
  }));
}

/**
 * Create a request logger middleware context
 */
export function createRequestContext(requestId: string, userId?: string): Record<string, unknown> {
  return {
    requestId,
    userId
  };
}

// Default export for convenience
const logger = {
  debug,
  info,
  warn,
  error: logError,
  fatal,
  setGlobalContext,
  clearGlobalContext,
  createChildLogger,
  logRequest,
  createRequestContext
};

export default logger;
