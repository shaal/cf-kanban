/**
 * Socket Store - WebSocket connection management for real-time updates
 *
 * TASK-034: Connect Kanban board to WebSocket
 *
 * Features:
 * - Connection status tracking (disconnected, connecting, connected, error)
 * - Project room management (join/leave)
 * - Event subscriptions for ticket updates
 */

import { writable, get } from 'svelte/store';
import type { Socket } from 'socket.io-client';
import type { Ticket } from '$lib/types';

/** Connection status type */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/** Current connection status */
export const connectionStatus = writable<ConnectionStatus>('disconnected');

/** Current project ID the socket is subscribed to */
export const currentProjectId = writable<string | null>(null);

/** Socket instance (module-level for singleton pattern) */
let socket: Socket | null = null;

/** Event callbacks registry */
const eventCallbacks: {
  ticketCreated: Set<(ticket: Ticket) => void>;
  ticketUpdated: Set<(ticket: Partial<Ticket> & { id: string }) => void>;
  ticketDeleted: Set<(ticketId: string) => void>;
  ticketMoved: Set<(data: { ticketId: string; newStatus: string; newPosition: number; version: number }) => void>;
} = {
  ticketCreated: new Set(),
  ticketUpdated: new Set(),
  ticketDeleted: new Set(),
  ticketMoved: new Set()
};

/**
 * Connect to the WebSocket server
 * @param url - WebSocket server URL
 */
export function connect(url: string): void {
  // Don't create multiple connections
  if (socket) {
    return;
  }

  connectionStatus.set('connecting');

  // Dynamic import to avoid SSR issues
  import('socket.io-client').then(({ io }) => {
    socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Connection event handlers
    socket.on('connect', () => {
      connectionStatus.set('connected');

      // Rejoin project room if we were in one
      const projectId = get(currentProjectId);
      if (projectId) {
        socket?.emit('join-project', projectId);
      }
    });

    socket.on('disconnect', () => {
      connectionStatus.set('disconnected');
    });

    socket.on('connect_error', () => {
      connectionStatus.set('error');
    });

    // Ticket event handlers
    socket.on('ticket:created', (ticket: Ticket) => {
      eventCallbacks.ticketCreated.forEach((cb) => cb(ticket));
    });

    socket.on('ticket:updated', (ticket: Partial<Ticket> & { id: string }) => {
      eventCallbacks.ticketUpdated.forEach((cb) => cb(ticket));
    });

    socket.on('ticket:deleted', (ticketId: string) => {
      eventCallbacks.ticketDeleted.forEach((cb) => cb(ticketId));
    });

    socket.on('ticket:moved', (data: { ticketId: string; newStatus: string; newPosition: number; version: number }) => {
      eventCallbacks.ticketMoved.forEach((cb) => cb(data));
    });
  });
}

/**
 * Disconnect from the WebSocket server
 */
export function disconnect(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  // Always reset state, even if socket was null
  connectionStatus.set('disconnected');
  currentProjectId.set(null);
}

/**
 * Join a project room to receive updates for that project
 * @param projectId - Project ID to join
 */
export function joinProject(projectId: string): void {
  currentProjectId.set(projectId);
  if (socket) {
    socket.emit('join-project', projectId);
  }
}

/**
 * Leave a project room
 * @param projectId - Project ID to leave
 */
export function leaveProject(projectId: string): void {
  if (socket) {
    socket.emit('leave-project', projectId);
  }
  currentProjectId.set(null);
}

/**
 * Subscribe to ticket created events
 * @param callback - Callback function when ticket is created
 * @returns Unsubscribe function
 */
export function onTicketCreated(callback: (ticket: Ticket) => void): () => void {
  eventCallbacks.ticketCreated.add(callback);
  return () => eventCallbacks.ticketCreated.delete(callback);
}

/**
 * Subscribe to ticket updated events
 * @param callback - Callback function when ticket is updated
 * @returns Unsubscribe function
 */
export function onTicketUpdated(callback: (ticket: Partial<Ticket> & { id: string }) => void): () => void {
  eventCallbacks.ticketUpdated.add(callback);
  return () => eventCallbacks.ticketUpdated.delete(callback);
}

/**
 * Subscribe to ticket deleted events
 * @param callback - Callback function when ticket is deleted
 * @returns Unsubscribe function
 */
export function onTicketDeleted(callback: (ticketId: string) => void): () => void {
  eventCallbacks.ticketDeleted.add(callback);
  return () => eventCallbacks.ticketDeleted.delete(callback);
}

/**
 * Subscribe to ticket moved events
 * @param callback - Callback function when ticket is moved
 * @returns Unsubscribe function
 */
export function onTicketMoved(
  callback: (data: { ticketId: string; newStatus: string; newPosition: number; version: number }) => void
): () => void {
  eventCallbacks.ticketMoved.add(callback);
  return () => eventCallbacks.ticketMoved.delete(callback);
}

/**
 * Get the current socket instance (for testing or advanced use)
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Emit an event through the socket
 * @param event - Event name
 * @param data - Event data
 */
export function emit(event: string, data: unknown): void {
  if (socket) {
    socket.emit(event, data);
  }
}
