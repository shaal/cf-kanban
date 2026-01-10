/**
 * TASK-021: Socket.IO Server Setup
 *
 * Socket.IO server configuration and initialization for SvelteKit.
 * This module provides the socket server factory and configuration.
 */

import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
} from '$lib/types/socket-events';
import { authenticateSocket } from './auth';
import { createTicketHandlers, createProjectHandlers, handleDisconnect } from './handlers';
import { RoomManager, roomManager } from './rooms';
import { getSocketServerConfig } from './config';

// Re-export config utilities
export { getSocketServerConfig } from './config';
export type { SocketServerConfig } from './config';

/**
 * Create and configure a Socket.IO server
 * @param httpServer - The HTTP server to attach to
 * @param manager - Optional room manager instance (uses singleton by default)
 * @returns Configured Socket.IO server
 */
export function createSocketServer(
  httpServer: HTTPServer,
  manager: RoomManager = roomManager
): SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
  const config = getSocketServerConfig(process.env.NODE_ENV || 'development');

  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    config
  );

  // Apply authentication middleware
  io.use(authenticateSocket);

  // Handle new connections
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id} (${socket.data.userName || 'Anonymous'})`);

    // Create handlers
    const ticketHandlers = createTicketHandlers(socket, manager);
    const projectHandlers = createProjectHandlers(socket, manager);

    // Register ticket event handlers
    socket.on('ticket:move', ticketHandlers['ticket:move']);
    socket.on('ticket:create', ticketHandlers['ticket:create']);
    socket.on('ticket:update', ticketHandlers['ticket:update']);
    socket.on('ticket:delete', ticketHandlers['ticket:delete']);

    // Register project event handlers
    socket.on('project:join', projectHandlers['project:join']);
    socket.on('project:leave', projectHandlers['project:leave']);

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`Client disconnected: ${socket.id} (${reason})`);
      handleDisconnect(socket, manager);
    });
  });

  return io;
}

/**
 * Global Socket.IO server instance (set by the custom server)
 */
let globalIo: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | null = null;

/**
 * Set the global Socket.IO server instance
 * @param io - The Socket.IO server instance
 */
export function setGlobalIO(
  io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
): void {
  globalIo = io;
}

/**
 * Get the global Socket.IO server instance
 * @returns The Socket.IO server instance or null if not initialized
 */
export function getGlobalIO(): SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
> | null {
  return globalIo;
}
