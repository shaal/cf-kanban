/**
 * TASK-113: Health Check Module
 *
 * Provides comprehensive health checks for all application components.
 * Used by load balancers, Kubernetes probes, and monitoring systems.
 */

import { checkDatabaseHealth } from '../prisma';
import { checkRedisHealth } from '../redis';

// Health check result
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: ComponentHealth[];
  timestamp: string;
  version?: string;
  uptime: number;
}

// Individual component health
export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'unhealthy';
  latencyMs?: number;
  message?: string;
  details?: Record<string, unknown>;
}

// Service start time for uptime calculation
const serviceStartTime = Date.now();

/**
 * Check application health
 */
export async function checkHealth(): Promise<HealthCheckResult> {
  const checks: ComponentHealth[] = [];

  // Run all health checks in parallel
  const [dbHealth, redisHealth] = await Promise.all([
    checkDatabaseHealthSafe(),
    checkRedisHealthSafe()
  ]);

  checks.push(dbHealth);
  checks.push(redisHealth);

  // Determine overall status
  const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
  let status: 'healthy' | 'degraded' | 'unhealthy';

  if (unhealthyCount === 0) {
    status = 'healthy';
  } else if (unhealthyCount < checks.length) {
    status = 'degraded';
  } else {
    status = 'unhealthy';
  }

  return {
    status,
    checks,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || process.env.SENTRY_RELEASE,
    uptime: Math.floor((Date.now() - serviceStartTime) / 1000)
  };
}

/**
 * Safe wrapper for database health check
 */
async function checkDatabaseHealthSafe(): Promise<ComponentHealth> {
  try {
    const result = await checkDatabaseHealth();
    return {
      name: 'database',
      status: result.healthy ? 'healthy' : 'unhealthy',
      latencyMs: result.latencyMs,
      message: result.error || 'PostgreSQL connection OK',
      details: result.healthy ? undefined : { error: result.error }
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: { error: String(error) }
    };
  }
}

/**
 * Safe wrapper for Redis health check
 */
async function checkRedisHealthSafe(): Promise<ComponentHealth> {
  try {
    const result = await checkRedisHealth();
    return {
      name: 'redis',
      status: result.healthy ? 'healthy' : 'unhealthy',
      latencyMs: result.latencyMs,
      message: result.error || 'Redis connection OK',
      details: result.healthy ? { memory: result.memory, clients: result.clients } : { error: result.error }
    };
  } catch (error) {
    return {
      name: 'redis',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: { error: String(error) }
    };
  }
}

/**
 * Simple liveness check (is the process alive?)
 */
export function checkLiveness(): { status: 'ok'; timestamp: string } {
  return {
    status: 'ok',
    timestamp: new Date().toISOString()
  };
}

/**
 * Readiness check (is the service ready to accept traffic?)
 */
export async function checkReadiness(): Promise<{
  status: 'ready' | 'not_ready';
  reason?: string;
}> {
  try {
    // Check critical dependencies
    const [dbHealth, redisHealth] = await Promise.all([
      checkDatabaseHealthSafe(),
      checkRedisHealthSafe()
    ]);

    // Database is required for readiness
    if (dbHealth.status === 'unhealthy') {
      return {
        status: 'not_ready',
        reason: `Database unhealthy: ${dbHealth.message}`
      };
    }

    // Redis is required for full functionality
    if (redisHealth.status === 'unhealthy') {
      return {
        status: 'not_ready',
        reason: `Redis unhealthy: ${redisHealth.message}`
      };
    }

    return { status: 'ready' };
  } catch (error) {
    return {
      status: 'not_ready',
      reason: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get system metrics for health dashboard
 */
export function getSystemMetrics(): {
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu?: {
    usage: number;
  };
} {
  const memUsage = process.memoryUsage();
  const totalMemory = memUsage.heapTotal;
  const usedMemory = memUsage.heapUsed;

  return {
    uptime: Math.floor((Date.now() - serviceStartTime) / 1000),
    memory: {
      used: usedMemory,
      total: totalMemory,
      percentage: Math.round((usedMemory / totalMemory) * 100)
    }
  };
}

/**
 * Generate health response for HTTP endpoint
 */
export async function generateHealthResponse(): Promise<{
  statusCode: number;
  body: HealthCheckResult;
}> {
  const health = await checkHealth();

  let statusCode: number;
  switch (health.status) {
    case 'healthy':
      statusCode = 200;
      break;
    case 'degraded':
      statusCode = 200; // Still serving traffic
      break;
    case 'unhealthy':
      statusCode = 503;
      break;
  }

  return { statusCode, body: health };
}
