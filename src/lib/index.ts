/**
 * Main exports for $lib
 *
 * Re-exports all components, types, and utilities for easy importing
 */

// Utilities
export { cn } from './utils';

// Types
export type {
  Ticket,
  TicketStatus,
  Priority,
  Project,
  TicketHistory,
  CreateTicketRequest,
  TransitionTicketRequest,
  TransitionTicketResponse
} from './types/index';

// State machine types and utilities
export {
  TICKET_STATES,
  VALID_TRANSITIONS,
  STATE_LABELS
} from './state-machine/types';

export type {
  TicketState
} from './state-machine/types';

// UI Components
export { Button, Card, Badge, Input } from './components/ui/index';

// Kanban Components
export { KanbanCard, KanbanColumn, KanbanBoard } from './components/kanban/index';
