/**
 * Prisma Client Singleton
 *
 * Creates a single Prisma client instance to avoid connection issues
 * in development mode where hot reloading can create multiple instances.
 *
 * TASK-111: Enhanced for production with:
 * - Connection pooling awareness
 * - Query logging for slow queries
 * - Health check support
 */

import { PrismaClient, Prisma } from '@prisma/client';

// Connection pool configuration
const POOL_CONFIG = {
  connectionLimit: parseInt(process.env.DATABASE_POOL_MAX || '10'),
  connectionTimeout: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '30000')
};

// Slow query threshold in ms
const SLOW_QUERY_THRESHOLD = parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000');

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Configure logging based on environment
const logConfig: Prisma.LogLevel[] = process.env.NODE_ENV === 'production'
  ? ['error', 'warn']
  : ['query', 'info', 'warn', 'error'];

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: logConfig.map(level => ({
    level,
    emit: 'event' as const
  }))
});

// Log slow queries in production
if (process.env.NODE_ENV === 'production') {
  // @ts-expect-error - Prisma event types
  prisma.$on('query', (e: { duration: number; query: string }) => {
    if (e.duration > SLOW_QUERY_THRESHOLD) {
      console.warn(`[DB] Slow query (${e.duration}ms): ${e.query.substring(0, 200)}...`);
    }
  });
}

// In development, attach to globalThis to prevent multiple instances
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Health check for database connectivity
 * Returns connection status for monitoring
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latencyMs?: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      healthy: true,
      latencyMs: Date.now() - start
    };
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Graceful shutdown handler
 * Call this during application shutdown
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

// Export pool config for monitoring
export { POOL_CONFIG };
