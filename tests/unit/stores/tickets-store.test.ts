/**
 * Tests for Tickets Store
 *
 * TASK-032: Create real-time Svelte stores
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import type { Ticket } from '$lib/types';
import { tickets } from '$lib/stores/tickets';
import {
  ticketsByStatus,
  initTickets,
  addTicket,
  updateTicket,
  removeTicket,
  moveTicket,
  rollbackTicket,
  clearTickets,
} from '$lib/stores/tickets';

const createMockTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: 'ticket-1',
  title: 'Test Ticket',
  description: 'Description',
  status: 'BACKLOG',
  priority: 'MEDIUM',
  labels: [],
  complexity: null,
  position: 0,
  projectId: 'project-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

describe('Tickets Store', () => {
  beforeEach(() => {
    clearTickets();
  });

  describe('initTickets', () => {
    it('should initialize store with tickets', () => {
      const mockTickets = [
        createMockTicket({ id: 'ticket-1' }),
        createMockTicket({ id: 'ticket-2', status: 'TODO' }),
      ];

      initTickets(mockTickets);

      const state = get(tickets);
      expect(state).toHaveLength(2);
      expect(state[0].id).toBe('ticket-1');
      expect(state[1].id).toBe('ticket-2');
    });

    it('should replace existing tickets', () => {
      initTickets([createMockTicket({ id: 'ticket-1' })]);
      initTickets([createMockTicket({ id: 'ticket-2' })]);

      const state = get(tickets);
      expect(state).toHaveLength(1);
      expect(state[0].id).toBe('ticket-2');
    });
  });

  describe('addTicket', () => {
    it('should add a ticket to the store', () => {
      const ticket = createMockTicket();

      addTicket(ticket);

      const state = get(tickets);
      expect(state).toHaveLength(1);
      expect(state[0]).toEqual(ticket);
    });

    it('should not add duplicate tickets', () => {
      const ticket = createMockTicket();

      addTicket(ticket);
      addTicket(ticket);

      const state = get(tickets);
      expect(state).toHaveLength(1);
    });

    it('should add ticket at correct position', () => {
      const ticket1 = createMockTicket({ id: 'ticket-1', position: 0 });
      const ticket2 = createMockTicket({ id: 'ticket-2', position: 1 });

      addTicket(ticket2);
      addTicket(ticket1);

      const state = get(tickets);
      expect(state[0].id).toBe('ticket-2');
      expect(state[1].id).toBe('ticket-1');
    });
  });

  describe('updateTicket', () => {
    it('should update an existing ticket', () => {
      const ticket = createMockTicket();
      initTickets([ticket]);

      updateTicket('ticket-1', { title: 'Updated Title' });

      const state = get(tickets);
      expect(state[0].title).toBe('Updated Title');
    });

    it('should not modify other fields', () => {
      const ticket = createMockTicket();
      initTickets([ticket]);

      updateTicket('ticket-1', { title: 'Updated Title' });

      const state = get(tickets);
      expect(state[0].description).toBe('Description');
      expect(state[0].status).toBe('BACKLOG');
    });

    it('should do nothing if ticket not found', () => {
      const ticket = createMockTicket();
      initTickets([ticket]);

      updateTicket('non-existent', { title: 'Updated Title' });

      const state = get(tickets);
      expect(state[0].title).toBe('Test Ticket');
    });
  });

  describe('removeTicket', () => {
    it('should remove a ticket by id', () => {
      const ticket1 = createMockTicket({ id: 'ticket-1' });
      const ticket2 = createMockTicket({ id: 'ticket-2' });
      initTickets([ticket1, ticket2]);

      removeTicket('ticket-1');

      const state = get(tickets);
      expect(state).toHaveLength(1);
      expect(state[0].id).toBe('ticket-2');
    });

    it('should remove the ticket from the store', () => {
      const ticket = createMockTicket();
      initTickets([ticket]);

      removeTicket('ticket-1');

      const state = get(tickets);
      expect(state).toHaveLength(0);
    });

    it('should do nothing if ticket not found', () => {
      initTickets([createMockTicket()]);

      removeTicket('non-existent');

      const state = get(tickets);
      expect(state).toHaveLength(1);
    });
  });

  describe('moveTicket', () => {
    it('should update ticket status and position', () => {
      const ticket = createMockTicket({ status: 'BACKLOG', position: 0 });
      initTickets([ticket]);

      moveTicket('ticket-1', 'TODO', 5);

      const state = get(tickets);
      expect(state[0].status).toBe('TODO');
      expect(state[0].position).toBe(5);
    });

    it('should return the previous state for rollback', () => {
      const ticket = createMockTicket({ status: 'BACKLOG', position: 0 });
      initTickets([ticket]);

      const previousState = moveTicket('ticket-1', 'TODO', 5);

      expect(previousState).toEqual({
        status: 'BACKLOG',
        position: 0,
      });
    });

    it('should return null if ticket not found', () => {
      initTickets([createMockTicket()]);

      const result = moveTicket('non-existent', 'TODO', 0);

      expect(result).toBeNull();
    });
  });

  describe('rollbackTicket', () => {
    it('should restore ticket to previous state', () => {
      const ticket = createMockTicket({ status: 'BACKLOG', position: 0 });
      initTickets([ticket]);

      // Move and then rollback
      moveTicket('ticket-1', 'TODO', 5);
      rollbackTicket('ticket-1', { status: 'BACKLOG', position: 0 });

      const state = get(tickets);
      expect(state[0].status).toBe('BACKLOG');
      expect(state[0].position).toBe(0);
    });
  });

  describe('ticketsByStatus (derived store)', () => {
    it('should group tickets by status', () => {
      const tickets = [
        createMockTicket({ id: 'ticket-1', status: 'BACKLOG' }),
        createMockTicket({ id: 'ticket-2', status: 'BACKLOG' }),
        createMockTicket({ id: 'ticket-3', status: 'TODO' }),
        createMockTicket({ id: 'ticket-4', status: 'IN_PROGRESS' }),
      ];
      initTickets(tickets);

      const grouped = get(ticketsByStatus);

      expect(grouped.BACKLOG).toHaveLength(2);
      expect(grouped.TODO).toHaveLength(1);
      expect(grouped.IN_PROGRESS).toHaveLength(1);
      expect(grouped.REVIEW).toHaveLength(0);
      expect(grouped.DONE).toHaveLength(0);
    });

    it('should sort tickets by position within each status', () => {
      const tickets = [
        createMockTicket({ id: 'ticket-1', status: 'BACKLOG', position: 2 }),
        createMockTicket({ id: 'ticket-2', status: 'BACKLOG', position: 0 }),
        createMockTicket({ id: 'ticket-3', status: 'BACKLOG', position: 1 }),
      ];
      initTickets(tickets);

      const grouped = get(ticketsByStatus);

      expect(grouped.BACKLOG[0].id).toBe('ticket-2');
      expect(grouped.BACKLOG[1].id).toBe('ticket-3');
      expect(grouped.BACKLOG[2].id).toBe('ticket-1');
    });

    it('should update when tickets change', () => {
      initTickets([createMockTicket({ id: 'ticket-1', status: 'BACKLOG' })]);

      let grouped = get(ticketsByStatus);
      expect(grouped.BACKLOG).toHaveLength(1);
      expect(grouped.TODO).toHaveLength(0);

      moveTicket('ticket-1', 'TODO', 0);

      grouped = get(ticketsByStatus);
      expect(grouped.BACKLOG).toHaveLength(0);
      expect(grouped.TODO).toHaveLength(1);
    });
  });

  describe('clearTickets', () => {
    it('should remove all tickets', () => {
      initTickets([
        createMockTicket({ id: 'ticket-1' }),
        createMockTicket({ id: 'ticket-2' }),
      ]);

      clearTickets();

      const state = get(tickets);
      expect(state).toHaveLength(0);
    });
  });
});
