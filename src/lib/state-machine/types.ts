/**
 * State Machine Types
 *
 * TASK-006: Define State Machine Types
 */

export const TICKET_STATES = [
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'NEEDS_FEEDBACK',
  'READY_TO_RESUME',
  'REVIEW',
  'DONE',
  'CANCELLED'
] as const;

export type TicketState = (typeof TICKET_STATES)[number];

export const VALID_TRANSITIONS: Record<TicketState, TicketState[]> = {
  BACKLOG: ['TODO', 'CANCELLED'],
  TODO: ['IN_PROGRESS', 'BACKLOG', 'CANCELLED'],
  IN_PROGRESS: ['NEEDS_FEEDBACK', 'REVIEW', 'TODO', 'CANCELLED'],
  NEEDS_FEEDBACK: ['READY_TO_RESUME', 'CANCELLED'],
  READY_TO_RESUME: ['IN_PROGRESS'],
  REVIEW: ['DONE', 'IN_PROGRESS', 'CANCELLED'],
  DONE: [], // Terminal state
  CANCELLED: ['BACKLOG'] // Can be reopened
};

export const STATE_LABELS: Record<TicketState, string> = {
  BACKLOG: 'Backlog',
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  NEEDS_FEEDBACK: 'Needs Feedback',
  READY_TO_RESUME: 'Ready to Resume',
  REVIEW: 'Review',
  DONE: 'Done',
  CANCELLED: 'Cancelled'
};

/**
 * Metadata for state transitions
 */
export interface TransitionMetadata {
  /** Who triggered the transition: 'user', 'agent', or 'system' */
  triggeredBy: 'user' | 'agent' | 'system';
  /** Optional reason for the transition */
  reason?: string;
}

/**
 * Error thrown when an invalid transition is attempted
 */
export class InvalidTransitionError extends Error {
  constructor(
    public readonly fromState: TicketState,
    public readonly toState: TicketState
  ) {
    super(`Invalid transition from ${fromState} to ${toState}`);
    this.name = 'InvalidTransitionError';
  }
}

/**
 * Check if a state is a terminal state (no outgoing transitions)
 */
export function isTerminalState(state: TicketState): boolean {
  return VALID_TRANSITIONS[state].length === 0;
}

/**
 * Get all states that can transition to the given state
 */
export function getIncomingTransitions(state: TicketState): TicketState[] {
  return TICKET_STATES.filter((s) => VALID_TRANSITIONS[s].includes(state));
}

/**
 * Get all states that the given state can transition to
 */
export function getOutgoingTransitions(state: TicketState): TicketState[] {
  return [...VALID_TRANSITIONS[state]];
}
