/**
 * TASK-034: Tickets Store Tests (TDD - RED Phase)
 *
 * Tests for the reactive tickets store that syncs with WebSocket events.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

describe('Tickets Store', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('tickets store', () => {
    it('should have empty initial state', async () => {
      const { tickets } = await import('$lib/stores/tickets');
      expect(get(tickets)).toEqual([]);
    });

    it('should allow setting tickets', async () => {
      const { tickets, setTickets } = await import('$lib/stores/tickets');
      const mockTickets = [
        {
          id: '1',
          title: 'Test Ticket',
          status: 'BACKLOG' as const,
          priority: 'MEDIUM' as const,
          labels: [],
          position: 0,
          projectId: 'project-1',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      setTickets(mockTickets);

      expect(get(tickets)).toEqual(mockTickets);
    });
  });

  describe('addTicket', () => {
    it('should add a new ticket to the store', async () => {
      const { tickets, setTickets, addTicket } = await import('$lib/stores/tickets');
      setTickets([]);

      const newTicket = {
        id: '1',
        title: 'New Ticket',
        status: 'BACKLOG' as const,
        priority: 'LOW' as const,
        labels: [],
        position: 0,
        projectId: 'project-1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      addTicket(newTicket);

      const currentTickets = get(tickets);
      expect(currentTickets).toHaveLength(1);
      expect(currentTickets[0].id).toBe('1');
    });

    it('should not add duplicate tickets', async () => {
      const { tickets, setTickets, addTicket } = await import('$lib/stores/tickets');
      const ticket = {
        id: '1',
        title: 'Test',
        status: 'BACKLOG' as const,
        priority: 'LOW' as const,
        labels: [],
        position: 0,
        projectId: 'project-1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setTickets([ticket]);
      addTicket({ ...ticket, title: 'Updated' });

      const currentTickets = get(tickets);
      expect(currentTickets).toHaveLength(1);
      expect(currentTickets[0].title).toBe('Updated');
    });
  });

  describe('updateTicket', () => {
    it('should update an existing ticket', async () => {
      const { tickets, setTickets, updateTicket } = await import('$lib/stores/tickets');
      const initialTicket = {
        id: '1',
        title: 'Original',
        status: 'BACKLOG' as const,
        priority: 'LOW' as const,
        labels: [],
        position: 0,
        projectId: 'project-1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setTickets([initialTicket]);
      updateTicket('1', { title: 'Updated', status: 'TODO' as const });

      const currentTickets = get(tickets);
      expect(currentTickets[0].title).toBe('Updated');
      expect(currentTickets[0].status).toBe('TODO');
    });

    it('should not modify store if ticket not found', async () => {
      const { tickets, setTickets, updateTicket } = await import('$lib/stores/tickets');
      const initialTicket = {
        id: '1',
        title: 'Original',
        status: 'BACKLOG' as const,
        priority: 'LOW' as const,
        labels: [],
        position: 0,
        projectId: 'project-1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setTickets([initialTicket]);
      updateTicket('999', { title: 'Updated' });

      const currentTickets = get(tickets);
      expect(currentTickets[0].title).toBe('Original');
    });
  });

  describe('removeTicket', () => {
    it('should remove a ticket from the store', async () => {
      const { tickets, setTickets, removeTicket } = await import('$lib/stores/tickets');
      const ticket = {
        id: '1',
        title: 'Test',
        status: 'BACKLOG' as const,
        priority: 'LOW' as const,
        labels: [],
        position: 0,
        projectId: 'project-1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setTickets([ticket]);
      removeTicket('1');

      expect(get(tickets)).toHaveLength(0);
    });
  });

  describe('ticketsByStatus', () => {
    it('should group tickets by status', async () => {
      const { ticketsByStatus, setTickets } = await import('$lib/stores/tickets');
      const now = new Date();

      setTickets([
        { id: '1', title: 'T1', status: 'BACKLOG' as const, priority: 'LOW' as const, labels: [], position: 0, projectId: 'p1', createdAt: now, updatedAt: now },
        { id: '2', title: 'T2', status: 'BACKLOG' as const, priority: 'LOW' as const, labels: [], position: 1, projectId: 'p1', createdAt: now, updatedAt: now },
        { id: '3', title: 'T3', status: 'TODO' as const, priority: 'LOW' as const, labels: [], position: 0, projectId: 'p1', createdAt: now, updatedAt: now }
      ]);

      const grouped = get(ticketsByStatus);
      expect(grouped.BACKLOG).toHaveLength(2);
      expect(grouped.TODO).toHaveLength(1);
      expect(grouped.IN_PROGRESS).toHaveLength(0);
    });

    it('should sort tickets by position within each status', async () => {
      const { ticketsByStatus, setTickets } = await import('$lib/stores/tickets');
      const now = new Date();

      setTickets([
        { id: '1', title: 'T1', status: 'BACKLOG' as const, priority: 'LOW' as const, labels: [], position: 2, projectId: 'p1', createdAt: now, updatedAt: now },
        { id: '2', title: 'T2', status: 'BACKLOG' as const, priority: 'LOW' as const, labels: [], position: 0, projectId: 'p1', createdAt: now, updatedAt: now },
        { id: '3', title: 'T3', status: 'BACKLOG' as const, priority: 'LOW' as const, labels: [], position: 1, projectId: 'p1', createdAt: now, updatedAt: now }
      ]);

      const grouped = get(ticketsByStatus);
      expect(grouped.BACKLOG[0].id).toBe('2');
      expect(grouped.BACKLOG[1].id).toBe('3');
      expect(grouped.BACKLOG[2].id).toBe('1');
    });
  });

  describe('moveTicket', () => {
    it('should update ticket status and position', async () => {
      const { tickets, setTickets, moveTicket } = await import('$lib/stores/tickets');
      const now = new Date();

      setTickets([
        { id: '1', title: 'T1', status: 'BACKLOG' as const, priority: 'LOW' as const, labels: [], position: 0, projectId: 'p1', createdAt: now, updatedAt: now }
      ]);

      moveTicket('1', 'TODO', 5);

      const currentTickets = get(tickets);
      expect(currentTickets[0].status).toBe('TODO');
      expect(currentTickets[0].position).toBe(5);
    });
  });
});
