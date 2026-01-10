/**
 * TASK-022: Socket.IO Event Handlers
 *
 * Server-side event handlers for ticket and project operations.
 * These handlers process events from clients and broadcast updates to rooms.
 */

import type { Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  TicketMovedPayload,
  TicketCreatedPayload,
  TicketUpdatedPayload,
  TicketDeletedPayload,
  JoinProjectPayload,
  LeaveProjectPayload,
  ErrorPayload
} from '$lib/types/socket-events';
import type { RoomManager } from './rooms';
import type { Ticket } from '$lib/types/index';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

/**
 * Ticket event handlers
 */
export interface TicketHandlers {
  'ticket:move': (
    payload: TicketMovedPayload,
    callback?: (response: { success: boolean; error?: ErrorPayload }) => void
  ) => Promise<void>;
  'ticket:create': (
    payload: Omit<TicketCreatedPayload, 'ticket'> & {
      ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>;
    },
    callback?: (response: { success: boolean; ticket?: Ticket; error?: ErrorPayload }) => void
  ) => Promise<void>;
  'ticket:update': (
    payload: TicketUpdatedPayload,
    callback?: (response: { success: boolean; error?: ErrorPayload }) => void
  ) => Promise<void>;
  'ticket:delete': (
    payload: TicketDeletedPayload,
    callback?: (response: { success: boolean; error?: ErrorPayload }) => void
  ) => Promise<void>;
}

/**
 * Project event handlers
 */
export interface ProjectHandlers {
  'project:join': (
    payload: JoinProjectPayload,
    callback?: (response: { success: boolean; users?: string[]; error?: ErrorPayload }) => void
  ) => Promise<void>;
  'project:leave': (payload: LeaveProjectPayload) => Promise<void>;
}

/**
 * Create ticket event handlers for a socket
 * @param socket - The Socket.IO socket
 * @param roomManager - The room manager instance
 * @returns Object with ticket event handlers
 */
export function createTicketHandlers(socket: TypedSocket, roomManager: RoomManager): TicketHandlers {
  return {
    'ticket:move': async (payload, callback) => {
      try {
        const { projectId } = payload;

        // Verify socket is in the project room
        if (!roomManager.isInRoom(projectId, socket.id)) {
          callback?.({
            success: false,
            error: {
              code: 'NOT_IN_PROJECT',
              message: 'You must join the project before moving tickets'
            }
          });
          return;
        }

        // TODO: Validate transition with state machine in Phase 3
        // TODO: Persist change to database in Phase 3

        // Broadcast to all clients in the room except sender
        socket.to(projectId).emit('ticket:moved', payload);

        callback?.({ success: true });
      } catch (error) {
        callback?.({
          success: false,
          error: {
            code: 'MOVE_FAILED',
            message: error instanceof Error ? error.message : 'Failed to move ticket'
          }
        });
      }
    },

    'ticket:create': async (payload, callback) => {
      try {
        const { projectId, ticket } = payload;

        // Verify socket is in the project room
        if (!roomManager.isInRoom(projectId, socket.id)) {
          callback?.({
            success: false,
            error: {
              code: 'NOT_IN_PROJECT',
              message: 'You must join the project before creating tickets'
            }
          });
          return;
        }

        // TODO: Create ticket in database in Phase 3
        // For now, generate a mock ticket
        const createdTicket: Ticket = {
          id: `ticket-${Date.now()}`,
          ...ticket,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Broadcast to all clients in the room except sender
        socket.to(projectId).emit('ticket:created', { projectId, ticket: createdTicket });

        callback?.({ success: true, ticket: createdTicket });
      } catch (error) {
        callback?.({
          success: false,
          error: {
            code: 'CREATE_FAILED',
            message: error instanceof Error ? error.message : 'Failed to create ticket'
          }
        });
      }
    },

    'ticket:update': async (payload, callback) => {
      try {
        const { projectId } = payload;

        // Verify socket is in the project room
        if (!roomManager.isInRoom(projectId, socket.id)) {
          callback?.({
            success: false,
            error: {
              code: 'NOT_IN_PROJECT',
              message: 'You must join the project before updating tickets'
            }
          });
          return;
        }

        // TODO: Update ticket in database in Phase 3

        // Broadcast to all clients in the room except sender
        socket.to(projectId).emit('ticket:updated', payload);

        callback?.({ success: true });
      } catch (error) {
        callback?.({
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: error instanceof Error ? error.message : 'Failed to update ticket'
          }
        });
      }
    },

    'ticket:delete': async (payload, callback) => {
      try {
        const { projectId } = payload;

        // Verify socket is in the project room
        if (!roomManager.isInRoom(projectId, socket.id)) {
          callback?.({
            success: false,
            error: {
              code: 'NOT_IN_PROJECT',
              message: 'You must join the project before deleting tickets'
            }
          });
          return;
        }

        // TODO: Delete ticket from database in Phase 3

        // Broadcast to all clients in the room except sender
        socket.to(projectId).emit('ticket:deleted', payload);

        callback?.({ success: true });
      } catch (error) {
        callback?.({
          success: false,
          error: {
            code: 'DELETE_FAILED',
            message: error instanceof Error ? error.message : 'Failed to delete ticket'
          }
        });
      }
    }
  };
}

/**
 * Create project event handlers for a socket
 * @param socket - The Socket.IO socket
 * @param roomManager - The room manager instance
 * @returns Object with project event handlers
 */
export function createProjectHandlers(socket: TypedSocket, roomManager: RoomManager): ProjectHandlers {
  return {
    'project:join': async (payload, callback) => {
      try {
        const { projectId } = payload;

        // Join the Socket.IO room
        await socket.join(projectId);

        // Track in room manager
        roomManager.joinRoom(projectId, socket.id, {
          userId: socket.data.userId,
          userName: socket.data.userName
        });

        // Update socket data
        socket.data.currentProject = projectId;

        // Get current users in room
        const users = roomManager
          .getUsersInRoom(projectId)
          .map((u) => u.userName || u.userId || 'Anonymous')
          .filter(Boolean) as string[];

        // Notify other users in the room
        socket.to(projectId).emit('user:joined', {
          projectId,
          userId: socket.data.userId || socket.id,
          userName: socket.data.userName
        });

        callback?.({ success: true, users });
      } catch (error) {
        callback?.({
          success: false,
          error: {
            code: 'JOIN_FAILED',
            message: error instanceof Error ? error.message : 'Failed to join project'
          }
        });
      }
    },

    'project:leave': async (payload) => {
      try {
        const { projectId } = payload;

        // Notify other users before leaving
        socket.to(projectId).emit('user:left', {
          projectId,
          userId: socket.data.userId || socket.id
        });

        // Leave the Socket.IO room
        await socket.leave(projectId);

        // Remove from room manager
        roomManager.leaveRoom(projectId, socket.id);

        // Update socket data
        if (socket.data.currentProject === projectId) {
          socket.data.currentProject = undefined;
        }
      } catch (error) {
        // Log error but don't throw - leaving should be best-effort
        console.error('Error leaving project:', error);
      }
    }
  };
}

/**
 * Handle socket disconnect - clean up all rooms
 * @param socket - The Socket.IO socket
 * @param roomManager - The room manager instance
 */
export function handleDisconnect(socket: TypedSocket, roomManager: RoomManager): void {
  // Get all rooms the socket was in
  const leftRooms = roomManager.leaveAllRooms(socket.id);

  // Notify each room that the user left
  for (const projectId of leftRooms) {
    socket.to(projectId).emit('user:left', {
      projectId,
      userId: socket.data.userId || socket.id
    });
  }
}
