/**
 * TASK-023: WebSocket Event Types
 *
 * Type definitions for Socket.IO events used in real-time synchronization.
 * These types ensure type safety between client and server communication.
 */

import type { Ticket, TicketStatus, Priority } from './index';

/**
 * Payload for moving a ticket between states
 */
export interface TicketMovedPayload {
  ticketId: string;
  projectId: string;
  fromStatus: TicketStatus;
  toStatus: TicketStatus;
  newPosition: number;
  triggeredBy: 'user' | 'agent' | 'system';
  reason?: string;
}

/**
 * Payload for creating a new ticket
 */
export interface TicketCreatedPayload {
  projectId: string;
  ticket: Ticket;
}

/**
 * Payload for updating a ticket
 */
export interface TicketUpdatedPayload {
  ticketId: string;
  projectId: string;
  updates: Partial<{
    title: string;
    description: string | null;
    priority: Priority;
    labels: string[];
    complexity: number | null;
  }>;
}

/**
 * Payload for deleting a ticket
 */
export interface TicketDeletedPayload {
  ticketId: string;
  projectId: string;
}

/**
 * Payload for joining a project room
 */
export interface JoinProjectPayload {
  projectId: string;
}

/**
 * Payload for leaving a project room
 */
export interface LeaveProjectPayload {
  projectId: string;
}

/**
 * Payload for error responses
 */
export interface ErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Payload when a user joins a project
 */
export interface UserJoinedPayload {
  projectId: string;
  userId: string;
  userName?: string;
}

/**
 * Payload when a user leaves a project
 */
export interface UserLeftPayload {
  projectId: string;
  userId: string;
}

/**
 * Events sent from client to server
 */
export interface ClientToServerEvents {
  'ticket:move': (
    payload: TicketMovedPayload,
    callback?: (response: { success: boolean; error?: ErrorPayload }) => void
  ) => void;
  'ticket:create': (
    payload: Omit<TicketCreatedPayload, 'ticket'> & {
      ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>;
    },
    callback?: (response: { success: boolean; ticket?: Ticket; error?: ErrorPayload }) => void
  ) => void;
  'ticket:update': (
    payload: TicketUpdatedPayload,
    callback?: (response: { success: boolean; error?: ErrorPayload }) => void
  ) => void;
  'ticket:delete': (
    payload: TicketDeletedPayload,
    callback?: (response: { success: boolean; error?: ErrorPayload }) => void
  ) => void;
  'project:join': (
    payload: JoinProjectPayload,
    callback?: (response: { success: boolean; users?: string[]; error?: ErrorPayload }) => void
  ) => void;
  'project:leave': (payload: LeaveProjectPayload) => void;
}

/**
 * Events sent from server to client
 */
export interface ServerToClientEvents {
  'ticket:moved': (payload: TicketMovedPayload) => void;
  'ticket:created': (payload: TicketCreatedPayload) => void;
  'ticket:updated': (payload: TicketUpdatedPayload) => void;
  'ticket:deleted': (payload: TicketDeletedPayload) => void;
  'user:joined': (payload: UserJoinedPayload) => void;
  'user:left': (payload: UserLeftPayload) => void;
  error: (payload: ErrorPayload) => void;
}

/**
 * Inter-server events (for scaling with multiple servers)
 */
export interface InterServerEvents {
  ping: () => void;
}

/**
 * Socket data attached to each connection
 */
export interface SocketData {
  userId?: string;
  userName?: string;
  currentProject?: string;
  isAuthenticated?: boolean;
}

/**
 * Type-safe socket instance for client-side usage
 */
export type TypedSocket = {
  on<E extends keyof ServerToClientEvents>(event: E, listener: ServerToClientEvents[E]): void;
  off<E extends keyof ServerToClientEvents>(event: E, listener?: ServerToClientEvents[E]): void;
  emit<E extends keyof ClientToServerEvents>(
    event: E,
    ...args: Parameters<ClientToServerEvents[E]>
  ): void;
  connect(): void;
  disconnect(): void;
  connected: boolean;
  id?: string;
};
