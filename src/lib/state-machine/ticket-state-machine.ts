/**
 * TASK-008: Ticket State Machine Implementation
 *
 * Implements the state machine for ticket status transitions.
 * Uses Prisma for persistence and records history for every transition.
 */

import type { TicketState, TransitionMetadata } from './types';
import { VALID_TRANSITIONS, InvalidTransitionError } from './types';
import type { Ticket, TicketHistory } from '@prisma/client';
import { prisma } from '$lib/server/prisma';

/**
 * Result type for transition operations with history
 */
export interface TransitionResultWithHistory {
  ticket: Ticket;
  history: TicketHistory;
}

export class TicketStateMachine {
  /**
   * Check if a transition from one state to another is valid
   */
  canTransition(from: TicketState, to: TicketState): boolean {
    // Self-transitions are not allowed
    if (from === to) {
      return false;
    }
    return VALID_TRANSITIONS[from].includes(to);
  }

  /**
   * Transition a ticket to a new state
   */
  async transition(
    ticketId: string,
    newState: TicketState,
    metadata: TransitionMetadata
  ): Promise<Ticket> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const currentState = ticket.status as TicketState;

    if (!this.canTransition(currentState, newState)) {
      throw new InvalidTransitionError(currentState, newState);
    }

    // Update ticket and create history entry in a transaction
    const updatedTicket = await prisma.$transaction(async (tx) => {
      // Create history entry
      await tx.ticketHistory.create({
        data: {
          ticketId,
          fromStatus: currentState,
          toStatus: newState,
          triggeredBy: metadata.triggeredBy,
          reason: metadata.reason
        }
      });

      // Update ticket status
      return tx.ticket.update({
        where: { id: ticketId },
        data: { status: newState }
      });
    });

    return updatedTicket;
  }

  /**
   * Transition a ticket with full result including history
   */
  async transitionWithHistory(
    ticketId: string,
    newState: TicketState,
    metadata: TransitionMetadata
  ): Promise<TransitionResultWithHistory> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const currentState = ticket.status as TicketState;

    if (!this.canTransition(currentState, newState)) {
      throw new InvalidTransitionError(currentState, newState);
    }

    // Perform the transition and record history in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create history entry
      const history = await tx.ticketHistory.create({
        data: {
          ticketId,
          fromStatus: currentState,
          toStatus: newState,
          triggeredBy: metadata.triggeredBy,
          reason: metadata.reason
        }
      });

      // Update ticket status
      const updatedTicket = await tx.ticket.update({
        where: { id: ticketId },
        data: { status: newState }
      });

      return { ticket: updatedTicket, history };
    });

    return result;
  }

  /**
   * Get the transition history for a ticket
   */
  async getHistory(ticketId: string): Promise<TicketHistory[]> {
    return prisma.ticketHistory.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' }
    });
  }

  /**
   * Get all possible transitions for a ticket's current state
   */
  async getAvailableTransitions(ticketId: string): Promise<TicketState[]> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    return [...VALID_TRANSITIONS[ticket.status as TicketState]];
  }
}

// Export as singleton for use in API routes
export const ticketStateMachine = new TicketStateMachine();
