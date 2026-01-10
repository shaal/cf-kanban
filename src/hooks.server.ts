/**
 * TASK-096: SvelteKit Server Hooks
 *
 * Handles authentication middleware using Auth.js.
 * Protects routes and adds session to locals.
 */

import { handle as authHandle } from '$lib/server/auth';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';

/**
 * Protected route patterns
 * Routes matching these patterns require authentication
 */
const PROTECTED_ROUTES = [
  '/projects',
  '/api/projects',
  '/api/tickets',
  '/api/memory',
  '/learning',
  '/admin'
];

/**
 * Public route patterns
 * Routes matching these patterns are always accessible
 */
const PUBLIC_ROUTES = ['/auth', '/api/health', '/', '/projects', '/api/projects', '/api/tickets'];

/**
 * Check if a path matches any pattern in the list
 */
function matchesPattern(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.endsWith('*')) {
      return path.startsWith(pattern.slice(0, -1));
    }
    return path === pattern || path.startsWith(pattern + '/');
  });
}

/**
 * Authorization middleware
 * Checks if user is authenticated for protected routes
 */
const authorizationHandle: Handle = async ({ event, resolve }) => {
  const path = event.url.pathname;

  // Skip auth check for public routes
  if (matchesPattern(path, PUBLIC_ROUTES)) {
    return resolve(event);
  }

  // Check if route is protected
  if (matchesPattern(path, PROTECTED_ROUTES)) {
    const session = await event.locals.auth();

    if (!session?.user) {
      // For API routes, return 401
      if (path.startsWith('/api/')) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // For page routes, redirect to sign in
      const redirectUrl = encodeURIComponent(event.url.pathname + event.url.search);
      return new Response(null, {
        status: 303,
        headers: { Location: `/auth/signin?callbackUrl=${redirectUrl}` }
      });
    }

    // Check if user is active
    if (session.user.isActive === false) {
      if (path.startsWith('/api/')) {
        return new Response(JSON.stringify({ error: 'Account is deactivated' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(null, {
        status: 303,
        headers: { Location: '/auth/deactivated' }
      });
    }
  }

  return resolve(event);
};

/**
 * Request logging middleware (development only)
 */
const loggingHandle: Handle = async ({ event, resolve }) => {
  if (process.env.NODE_ENV === 'development') {
    const start = Date.now();
    const response = await resolve(event);
    const duration = Date.now() - start;

    console.log(`[${event.request.method}] ${event.url.pathname} - ${response.status} (${duration}ms)`);

    return response;
  }

  return resolve(event);
};

/**
 * Combined hooks
 * Auth.js handle must come first to populate event.locals.auth
 */
export const handle = sequence(authHandle, authorizationHandle, loggingHandle);
