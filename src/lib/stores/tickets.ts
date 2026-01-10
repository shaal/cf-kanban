/**
 * Tickets Store - Reactive store for ticket state management
 *
 * TASK-032/034: Connect Kanban board to WebSocket with optimistic updates
 *
 * Features:
 * - Central ticket state management
 * - Derived store for tickets grouped by status
 * - CRUD operations for tickets
 * - Real-time sync with WebSocket events
 * - Optimistic updates with rollback support
 */

import { writable, derived, get } from 'svelte/store';
import type { Ticket, TicketStatus } from '$lib/types';

/**
 * Previous state for rollback support
 */
export interface TicketPreviousState {
  status: TicketStatus;
  position: number;
}

/** Main tickets store */
export const tickets = writable<Ticket[]>([]);

/**
 * Set all tickets (typically on initial load)
 * @param newTickets - Array of tickets to set
 */
export function setTickets(newTickets: Ticket[]): void {
  tickets.set(newTickets);
}

/**
 * Initialize tickets (alias for setTickets for TASK-032 compatibility)
 * @param initialTickets - Array of tickets to initialize with
 */
export function initTickets(initialTickets: Ticket[]): void {
  tickets.set([...initialTickets]);
}

/**
 * Clear all tickets from the store
 */
export function clearTickets(): void {
  tickets.set([]);
}

/**
 * Add a new ticket to the store
 * If ticket with same ID exists, update it instead
 * @param ticket - Ticket to add
 */
export function addTicket(ticket: Ticket): void {
  tickets.update((current) => {
    const existingIndex = current.findIndex((t) => t.id === ticket.id);
    if (existingIndex >= 0) {
      // Update existing ticket
      const updated = [...current];
      updated[existingIndex] = ticket;
      return updated;
    }
    return [...current, ticket];
  });
}

/**
 * Update an existing ticket
 * @param ticketId - ID of ticket to update
 * @param updates - Partial ticket data to merge
 */
export function updateTicket(ticketId: string, updates: Partial<Ticket>): void {
  tickets.update((current) => {
    return current.map((ticket) => {
      if (ticket.id === ticketId) {
        return { ...ticket, ...updates };
      }
      return ticket;
    });
  });
}

/**
 * Remove a ticket from the store
 * @param ticketId - ID of ticket to remove
 */
export function removeTicket(ticketId: string): void {
  tickets.update((current) => current.filter((t) => t.id !== ticketId));
}

/**
 * Move a ticket to a new status and position (with rollback support)
 * @param ticketId - ID of ticket to move
 * @param newStatus - New status column
 * @param newPosition - New position in the column
 * @returns Previous state for rollback, or null if ticket not found
 */
export function moveTicket(ticketId: string, newStatus: TicketStatus, newPosition: number): TicketPreviousState | null {
  let previousState: TicketPreviousState | null = null;

  tickets.update((current) => {
    const ticket = current.find((t) => t.id === ticketId);
    if (!ticket) {
      return current;
    }

    previousState = {
      status: ticket.status,
      position: ticket.position,
    };

    return current.map((t) => {
      if (t.id === ticketId) {
        return { ...t, status: newStatus, position: newPosition };
      }
      return t;
    });
  });

  return previousState;
}

/**
 * Rollback a ticket to its previous state
 * @param ticketId - ID of ticket to rollback
 * @param previousState - Previous state to restore
 */
export function rollbackTicket(ticketId: string, previousState: TicketPreviousState): void {
  tickets.update((current) =>
    current.map((t) =>
      t.id === ticketId
        ? { ...t, status: previousState.status, position: previousState.position }
        : t
    )
  );
}

/**
 * Get a single ticket by ID
 * @param ticketId - ID of ticket to find
 * @returns Ticket or undefined
 */
export function getTicketById(ticketId: string): Ticket | undefined {
  return get(tickets).find((t) => t.id === ticketId);
}

/** Derived store: tickets grouped by status and sorted by position */
export const ticketsByStatus = derived(tickets, ($tickets) => {
  const grouped: Record<TicketStatus, Ticket[]> = {
    BACKLOG: [],
    TODO: [],
    IN_PROGRESS: [],
    NEEDS_FEEDBACK: [],
    READY_TO_RESUME: [],
    REVIEW: [],
    DONE: [],
    CANCELLED: []
  };

  for (const ticket of $tickets) {
    const status = ticket.status as TicketStatus;
    if (grouped[status]) {
      grouped[status].push(ticket);
    }
  }

  // Sort tickets by position within each status
  for (const status of Object.keys(grouped) as TicketStatus[]) {
    grouped[status].sort((a, b) => a.position - b.position);
  }

  return grouped;
});

/**
 * Get tickets for a specific status
 * @param status - Status to filter by
 * @returns Array of tickets in that status
 */
export function getTicketsByStatus(status: TicketStatus): Ticket[] {
  return get(ticketsByStatus)[status] || [];
}
