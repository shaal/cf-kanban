/**
 * Socket.IO Event Handlers for Client
 *
 * TASK-031: Add Socket.IO event handlers (client)
 *
 * This module provides:
 * - Event handler setup and cleanup
 * - Typed emit helper functions
 * - Connection/disconnection handlers
 */

import { getSocket } from './index';
import type { Ticket } from '$lib/types';
import type {
  TicketMovedPayload,
  TicketCreatedPayload,
  TicketUpdatedPayload,
  TicketDeletedPayload,
  UserJoinedPayload,
  UserLeftPayload,
  ErrorPayload,
  JoinProjectPayload,
  LeaveProjectPayload,
} from '$lib/types/socket-events';

/**
 * Callback types for event handlers
 */
export interface EventHandlerCallbacks {
  onTicketMoved?: (payload: TicketMovedPayload) => void;
  onTicketCreated?: (payload: TicketCreatedPayload) => void;
  onTicketUpdated?: (payload: TicketUpdatedPayload) => void;
  onTicketDeleted?: (payload: TicketDeletedPayload) => void;
  onUserJoined?: (payload: UserJoinedPayload) => void;
  onUserLeft?: (payload: UserLeftPayload) => void;
  onError?: (payload: ErrorPayload) => void;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
}

/**
 * Response types for emit callbacks
 */
export interface JoinProjectResponse {
  success: boolean;
  users?: string[];
  error?: ErrorPayload;
}

export interface TicketOperationResponse {
  success: boolean;
  ticket?: Ticket;
  error?: ErrorPayload;
}

/**
 * Set up all event handlers on the socket
 *
 * @param callbacks - Object containing callback functions for each event
 */
export function setupEventHandlers(callbacks: EventHandlerCallbacks): void {
  const socket = getSocket();
  if (!socket) return;

  // Ticket events
  if (callbacks.onTicketMoved) {
    socket.on('ticket:moved', callbacks.onTicketMoved);
  }
  if (callbacks.onTicketCreated) {
    socket.on('ticket:created', callbacks.onTicketCreated);
  }
  if (callbacks.onTicketUpdated) {
    socket.on('ticket:updated', callbacks.onTicketUpdated);
  }
  if (callbacks.onTicketDeleted) {
    socket.on('ticket:deleted', callbacks.onTicketDeleted);
  }

  // User events
  if (callbacks.onUserJoined) {
    socket.on('user:joined', callbacks.onUserJoined);
  }
  if (callbacks.onUserLeft) {
    socket.on('user:left', callbacks.onUserLeft);
  }

  // Error and connection events
  if (callbacks.onError) {
    socket.on('error', callbacks.onError);
  }
  if (callbacks.onConnect) {
    socket.on('connect', callbacks.onConnect);
  }
  if (callbacks.onDisconnect) {
    socket.on('disconnect', callbacks.onDisconnect);
  }
}

/**
 * Remove all event handlers from the socket
 */
export function removeEventHandlers(): void {
  const socket = getSocket();
  if (!socket) return;

  socket.off('ticket:moved');
  socket.off('ticket:created');
  socket.off('ticket:updated');
  socket.off('ticket:deleted');
  socket.off('user:joined');
  socket.off('user:left');
  socket.off('error');
  socket.off('connect');
  socket.off('disconnect');
}

/**
 * Emit a project:join event
 *
 * @param projectId - The project ID to join
 * @param callback - Optional callback for the server response
 */
export function emitJoinProject(
  projectId: string,
  callback?: (response: JoinProjectResponse) => void
): void {
  const socket = getSocket();
  if (!socket) return;

  const payload: JoinProjectPayload = { projectId };
  socket.emit('project:join', payload, callback || (() => {}));
}

/**
 * Emit a project:leave event
 *
 * @param projectId - The project ID to leave
 */
export function emitLeaveProject(projectId: string): void {
  const socket = getSocket();
  if (!socket) return;

  const payload: LeaveProjectPayload = { projectId };
  socket.emit('project:leave', payload);
}

/**
 * Emit a ticket:move event
 *
 * @param payload - The ticket move payload
 * @param callback - Optional callback for the server response
 */
export function emitTicketMove(
  payload: TicketMovedPayload,
  callback?: (response: TicketOperationResponse) => void
): void {
  const socket = getSocket();
  if (!socket) return;

  socket.emit('ticket:move', payload, callback || (() => {}));
}

/**
 * Emit a ticket:create event
 *
 * @param payload - The ticket create payload
 * @param callback - Optional callback for the server response
 */
export function emitTicketCreate(
  payload: Omit<TicketCreatedPayload, 'ticket'> & {
    ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>;
  },
  callback?: (response: TicketOperationResponse) => void
): void {
  const socket = getSocket();
  if (!socket) return;

  socket.emit('ticket:create', payload, callback || (() => {}));
}

/**
 * Emit a ticket:update event
 *
 * @param payload - The ticket update payload
 * @param callback - Optional callback for the server response
 */
export function emitTicketUpdate(
  payload: TicketUpdatedPayload,
  callback?: (response: TicketOperationResponse) => void
): void {
  const socket = getSocket();
  if (!socket) return;

  socket.emit('ticket:update', payload, callback || (() => {}));
}

/**
 * Emit a ticket:delete event
 *
 * @param payload - The ticket delete payload
 * @param callback - Optional callback for the server response
 */
export function emitTicketDelete(
  payload: TicketDeletedPayload,
  callback?: (response: TicketOperationResponse) => void
): void {
  const socket = getSocket();
  if (!socket) return;

  socket.emit('ticket:delete', payload, callback || (() => {}));
}
