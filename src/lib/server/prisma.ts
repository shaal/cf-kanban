/**
 * Prisma Client Singleton
 *
 * Creates a single Prisma client instance to avoid connection issues
 * in development mode where hot reloading can create multiple instances.
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// In development, attach to globalThis to prevent multiple instances
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
