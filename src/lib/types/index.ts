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
  /** GAP-3.2.4: IDs of tickets that must be completed before this one can progress */
  dependencyIds?: string[];
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
  /** GAP-3.2.4: IDs of tickets this one depends on */
  dependencyIds?: string[];
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

/**
 * TASK-055: Question types for agent-user feedback loop
 */
export type QuestionType = 'TEXT' | 'CHOICE' | 'MULTISELECT' | 'CONFIRM' | 'CODE';

/**
 * TASK-055: Ticket question for feedback loop
 */
export interface TicketQuestion {
  id: string;
  ticketId: string;
  agentId: string;
  question: string;
  type: QuestionType;
  options: string[];
  required: boolean;
  context?: string | null;
  codeLanguage?: string | null;
  defaultValue?: string | null;
  answer?: string | null;
  answered: boolean;
  createdAt: Date;
  answeredAt?: Date | null;
}

/**
 * TASK-054: Ticket with questions for feedback display
 */
export interface TicketWithQuestions extends Ticket {
  questions: TicketQuestion[];
}

/**
 * GAP-3.2.5: Ticket attachment for file uploads
 */
export interface TicketAttachment {
  id: string;
  ticketId: string;
  filename: string;
  storedName: string;
  mimeType: string;
  size: number;
  path: string;
  description?: string | null;
  uploadedBy?: string | null;
  createdAt: Date;
}

/**
 * GAP-3.2.5: Ticket with attachments included
 */
export interface TicketWithAttachments extends Ticket {
  attachments: TicketAttachment[];
}

/**
 * TASK-076/077/078/079: Re-export neural types
 */
export * from './neural';

/**
 * TASK-084/085/086/087: Re-export transfer types
 */
export * from './transfer';

/**
 * GAP-3.3.3: Re-export ticket-agent assignment types
 */
export * from './ticket-agents';

/**
 * GAP-3.1.2: Re-export resource allocation types
 */
export * from './resources';

/**
 * GAP-UX.2: Re-export time travel types
 */
export * from './time-travel';
