/**
 * Socket.IO Client Setup for SvelteKit
 *
 * TASK-030: Set up Socket.IO client in SvelteKit
 *
 * This module provides a typed Socket.IO client that:
 * - Handles SSR by checking for browser environment
 * - Provides a singleton socket instance
 * - Exports typed helper functions for socket operations
 */

import { browser } from '$app/environment';
import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '$lib/types/socket-events';

/**
 * Typed Socket.IO socket instance
 */
export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Singleton socket instance
 */
let socket: TypedSocket | null = null;

/**
 * Default socket options
 */
const DEFAULT_OPTIONS = {
  autoConnect: false,
  transports: ['websocket', 'polling'] as const,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
  timeout: 20000,
};

/**
 * Initialize the Socket.IO client
 *
 * @param url - The Socket.IO server URL (defaults to window.location.origin in browser)
 * @param options - Additional Socket.IO options to merge with defaults
 * @returns The initialized socket instance or null if not in browser
 */
export function initSocket(
  url?: string,
  options: Partial<typeof DEFAULT_OPTIONS> = {}
): TypedSocket | null {
  if (!browser) {
    return null;
  }

  // If socket already exists, return it
  if (socket) {
    return socket;
  }

  const serverUrl = url || window.location.origin;
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  socket = io(serverUrl, mergedOptions) as TypedSocket;

  return socket;
}

/**
 * Get the current socket instance
 *
 * @returns The socket instance or null if not initialized or not in browser
 */
export function getSocket(): TypedSocket | null {
  if (!browser) {
    return null;
  }

  // Initialize with defaults if not already done
  if (!socket) {
    initSocket();
  }

  return socket;
}

/**
 * Connect the socket to the server
 */
export function connectSocket(): void {
  const s = getSocket();
  if (s) {
    s.connect();
  }
}

/**
 * Disconnect the socket from the server
 */
export function disconnectSocket(): void {
  const s = getSocket();
  if (s) {
    s.disconnect();
  }
}

/**
 * Check if the socket is currently connected
 *
 * @returns true if connected, false otherwise
 */
export function isConnected(): boolean {
  const s = getSocket();
  return s?.connected ?? false;
}

/**
 * Get the socket's connection ID
 *
 * @returns The socket ID if connected, undefined otherwise
 */
export function getSocketId(): string | undefined {
  const s = getSocket();
  return s?.id;
}

/**
 * Destroy the socket instance and reset state
 * Useful for testing and cleanup
 */
export function destroySocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Re-export types for convenience
export type { ClientToServerEvents, ServerToClientEvents } from '$lib/types/socket-events';
