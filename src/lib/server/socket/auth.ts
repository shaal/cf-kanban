/**
 * TASK-025: WebSocket Authentication
 *
 * Socket.IO authentication middleware for handling user identification.
 * Phase 1 supports anonymous users with optional mock token authentication.
 */

import type { Socket } from 'socket.io';
import type { SocketData } from '$lib/types/socket-events';

/**
 * User info extracted from authentication
 */
export interface AuthenticatedUser {
  userId: string;
  userName: string;
  isAuthenticated: boolean;
}

/**
 * Counter for generating unique anonymous user IDs
 */
let anonymousCounter = 0;

/**
 * Generate a unique anonymous user
 * @returns Anonymous user info
 */
export function generateAnonymousUser(): AuthenticatedUser {
  anonymousCounter++;
  const id = `anon-${Date.now()}-${anonymousCounter}`;
  return {
    userId: id,
    userName: `Anonymous ${anonymousCounter}`,
    isAuthenticated: false
  };
}

/**
 * Extract user info from a token
 *
 * Phase 1 Implementation:
 * Uses a simple mock token format: "mock-token:userId:userName"
 * This will be replaced with proper JWT/session validation in Phase 3.
 *
 * @param token - The authentication token
 * @returns User info if valid, null otherwise
 */
export function extractUserFromToken(token: string | undefined): AuthenticatedUser | null {
  if (!token || token.trim() === '') {
    return null;
  }

  // Mock token format: "mock-token:userId:userName"
  if (token.startsWith('mock-token:')) {
    const parts = token.split(':');
    if (parts.length >= 2) {
      const userId = parts[1];
      const userName = parts.slice(2).join(':'); // Handle usernames with colons

      if (userId) {
        return {
          userId,
          userName: userName || '',
          isAuthenticated: true
        };
      }
    }
  }

  return null;
}

/**
 * Socket.IO authentication middleware
 *
 * Attaches user info to socket.data for use in event handlers.
 * Allows all connections (anonymous users get a generated ID).
 *
 * @param socket - The Socket.IO socket
 * @param next - Callback to continue or reject the connection
 */
export function authenticateSocket(
  socket: Socket<any, any, any, SocketData>,
  next: (err?: Error) => void
): void {
  // Try to get token from auth object first, then query params
  const authToken = socket.handshake.auth?.token as string | undefined;
  const queryToken = socket.handshake.query?.token as string | undefined;
  const token = authToken || queryToken;

  // Try to extract user from token
  const user = extractUserFromToken(token);

  if (user) {
    // Authenticated user
    socket.data.userId = user.userId;
    socket.data.userName = user.userName;
    socket.data.isAuthenticated = true;
  } else {
    // Anonymous user
    const anonymousUser = generateAnonymousUser();
    socket.data.userId = anonymousUser.userId;
    socket.data.userName = anonymousUser.userName;
    socket.data.isAuthenticated = false;
  }

  // Always allow connection in Phase 1
  next();
}

/**
 * Optional: Middleware to require authentication
 * Can be used on specific namespaces that need auth
 *
 * @param socket - The Socket.IO socket
 * @param next - Callback to continue or reject the connection
 */
export function requireAuthentication(
  socket: Socket<any, any, any, SocketData>,
  next: (err?: Error) => void
): void {
  // First run the base authentication
  authenticateSocket(socket, (err) => {
    if (err) {
      next(err);
      return;
    }

    // Then check if user is authenticated
    if (!socket.data.isAuthenticated) {
      next(new Error('Authentication required'));
      return;
    }

    next();
  });
}
