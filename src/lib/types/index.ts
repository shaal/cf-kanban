/**
 * Core type definitions for CF-Kanban
 *
 * These types match the Prisma schema and are used throughout the application.
 */

import type { TicketState } from '../state-machine/types';

/**
 * Priority levels for tickets
 */
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Re-export TicketStatus for convenience
 */
export type TicketStatus = TicketState;

/**
 * Project representation
 */
export interface Project {
  id: string;
  name: string;
  description?: string | null;
  settings: Record<string, unknown>;
  tickets?: Ticket[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Ticket representation matching Prisma model
 */
export interface Ticket {
  id: string;
  title: string;
  description?: string | null;
  status: TicketStatus;
  priority: Priority;
  labels: string[];
  complexity?: number | null;
  position: number;
  projectId: string;
  project?: Project;
  history?: TicketHistory[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Ticket history entry for state transitions
 */
export interface TicketHistory {
  id: string;
  ticketId: string;
  ticket?: Ticket;
  fromStatus: TicketStatus;
  toStatus: TicketStatus;
  reason?: string | null;
  triggeredBy: string;
  createdAt: Date;
}

/**
 * Request body for creating a new ticket
 */
export interface CreateTicketRequest {
  title: string;
  description?: string;
  priority?: Priority;
  labels?: string[];
  complexity?: number;
}

/**
 * Request body for transitioning a ticket
 */
export interface TransitionTicketRequest {
  toState: TicketStatus;
  triggeredBy: 'user' | 'agent' | 'system';
  reason?: string;
}

/**
 * Response from a successful transition
 */
export interface TransitionTicketResponse {
  ticket: Ticket;
  transition: {
    from: TicketStatus;
    to: TicketStatus;
  };
}
