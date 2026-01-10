/**
 * TASK-037: Optimistic Updates Store Tests (TDD - RED Phase)
 *
 * Tests for optimistic UI updates with rollback capability.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

describe('Optimistic Store', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('pendingOperations store', () => {
    it('should have empty initial state', async () => {
      const { pendingOperations } = await import('$lib/stores/optimistic');
      expect(get(pendingOperations)).toEqual([]);
    });
  });

  describe('addPendingOperation', () => {
    it('should add operation to pending list', async () => {
      const { pendingOperations, addPendingOperation } = await import('$lib/stores/optimistic');

      const operationId = addPendingOperation({
        type: 'move',
        ticketId: 'ticket-1',
        previousState: { status: 'BACKLOG', position: 0 },
        newState: { status: 'TODO', position: 0 }
      });

      const operations = get(pendingOperations);
      expect(operations).toHaveLength(1);
      expect(operations[0].id).toBe(operationId);
      expect(operations[0].type).toBe('move');
    });

    it('should generate unique operation IDs', async () => {
      const { addPendingOperation } = await import('$lib/stores/optimistic');

      const id1 = addPendingOperation({
        type: 'move',
        ticketId: 'ticket-1',
        previousState: { status: 'BACKLOG', position: 0 },
        newState: { status: 'TODO', position: 0 }
      });

      const id2 = addPendingOperation({
        type: 'move',
        ticketId: 'ticket-2',
        previousState: { status: 'TODO', position: 0 },
        newState: { status: 'IN_PROGRESS', position: 0 }
      });

      expect(id1).not.toBe(id2);
    });

    it('should include timestamp', async () => {
      const { pendingOperations, addPendingOperation } = await import('$lib/stores/optimistic');

      const before = Date.now();
      addPendingOperation({
        type: 'create',
        ticketId: 'ticket-1',
        previousState: null,
        newState: { status: 'BACKLOG', position: 0 }
      });
      const after = Date.now();

      const operations = get(pendingOperations);
      expect(operations[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(operations[0].timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('removePendingOperation', () => {
    it('should remove operation by ID', async () => {
      const { pendingOperations, addPendingOperation, removePendingOperation } = await import('$lib/stores/optimistic');

      const operationId = addPendingOperation({
        type: 'update',
        ticketId: 'ticket-1',
        previousState: { title: 'Old' },
        newState: { title: 'New' }
      });

      removePendingOperation(operationId);

      expect(get(pendingOperations)).toHaveLength(0);
    });

    it('should not affect other operations', async () => {
      const { pendingOperations, addPendingOperation, removePendingOperation } = await import('$lib/stores/optimistic');

      const id1 = addPendingOperation({
        type: 'move',
        ticketId: 'ticket-1',
        previousState: { status: 'BACKLOG', position: 0 },
        newState: { status: 'TODO', position: 0 }
      });

      addPendingOperation({
        type: 'move',
        ticketId: 'ticket-2',
        previousState: { status: 'TODO', position: 0 },
        newState: { status: 'IN_PROGRESS', position: 0 }
      });

      removePendingOperation(id1);

      const operations = get(pendingOperations);
      expect(operations).toHaveLength(1);
      expect(operations[0].ticketId).toBe('ticket-2');
    });
  });

  describe('rollbackOperation', () => {
    it('should return previous state for rollback', async () => {
      const { addPendingOperation, rollbackOperation } = await import('$lib/stores/optimistic');

      const previousState = { status: 'BACKLOG', position: 0, title: 'Test' };
      const operationId = addPendingOperation({
        type: 'move',
        ticketId: 'ticket-1',
        previousState,
        newState: { status: 'TODO', position: 0 }
      });

      const result = rollbackOperation(operationId);

      expect(result).toEqual({
        ticketId: 'ticket-1',
        state: previousState
      });
    });

    it('should remove operation after rollback', async () => {
      const { pendingOperations, addPendingOperation, rollbackOperation } = await import('$lib/stores/optimistic');

      const operationId = addPendingOperation({
        type: 'move',
        ticketId: 'ticket-1',
        previousState: { status: 'BACKLOG', position: 0 },
        newState: { status: 'TODO', position: 0 }
      });

      rollbackOperation(operationId);

      expect(get(pendingOperations)).toHaveLength(0);
    });

    it('should return null for unknown operation', async () => {
      const { rollbackOperation } = await import('$lib/stores/optimistic');

      const result = rollbackOperation('unknown-id');

      expect(result).toBeNull();
    });
  });

  describe('hasPending', () => {
    it('should return true when operations exist', async () => {
      const { addPendingOperation, hasPending } = await import('$lib/stores/optimistic');

      addPendingOperation({
        type: 'move',
        ticketId: 'ticket-1',
        previousState: { status: 'BACKLOG', position: 0 },
        newState: { status: 'TODO', position: 0 }
      });

      expect(get(hasPending)).toBe(true);
    });

    it('should return false when no operations', async () => {
      const { hasPending } = await import('$lib/stores/optimistic');
      expect(get(hasPending)).toBe(false);
    });
  });

  describe('getPendingForTicket', () => {
    it('should return operations for specific ticket', async () => {
      const { addPendingOperation, getPendingForTicket } = await import('$lib/stores/optimistic');

      addPendingOperation({
        type: 'move',
        ticketId: 'ticket-1',
        previousState: { status: 'BACKLOG', position: 0 },
        newState: { status: 'TODO', position: 0 }
      });

      addPendingOperation({
        type: 'update',
        ticketId: 'ticket-1',
        previousState: { title: 'Old' },
        newState: { title: 'New' }
      });

      addPendingOperation({
        type: 'move',
        ticketId: 'ticket-2',
        previousState: { status: 'TODO', position: 0 },
        newState: { status: 'IN_PROGRESS', position: 0 }
      });

      const ticket1Ops = getPendingForTicket('ticket-1');

      expect(ticket1Ops).toHaveLength(2);
      expect(ticket1Ops.every(op => op.ticketId === 'ticket-1')).toBe(true);
    });

    it('should return empty array for ticket with no pending', async () => {
      const { getPendingForTicket } = await import('$lib/stores/optimistic');
      expect(getPendingForTicket('unknown-ticket')).toEqual([]);
    });
  });

  describe('clearPendingOperations', () => {
    it('should clear all pending operations', async () => {
      const { pendingOperations, addPendingOperation, clearPendingOperations } = await import('$lib/stores/optimistic');

      addPendingOperation({
        type: 'move',
        ticketId: 'ticket-1',
        previousState: { status: 'BACKLOG', position: 0 },
        newState: { status: 'TODO', position: 0 }
      });

      addPendingOperation({
        type: 'move',
        ticketId: 'ticket-2',
        previousState: { status: 'TODO', position: 0 },
        newState: { status: 'IN_PROGRESS', position: 0 }
      });

      clearPendingOperations();

      expect(get(pendingOperations)).toEqual([]);
    });
  });

  describe('operation types', () => {
    it('should support create operation type', async () => {
      const { addPendingOperation, pendingOperations } = await import('$lib/stores/optimistic');

      addPendingOperation({
        type: 'create',
        ticketId: 'new-ticket',
        previousState: null,
        newState: { status: 'BACKLOG', position: 0, title: 'New Ticket' }
      });

      const ops = get(pendingOperations);
      expect(ops[0].type).toBe('create');
      expect(ops[0].previousState).toBeNull();
    });

    it('should support delete operation type', async () => {
      const { addPendingOperation, pendingOperations } = await import('$lib/stores/optimistic');

      addPendingOperation({
        type: 'delete',
        ticketId: 'ticket-1',
        previousState: { status: 'BACKLOG', position: 0, title: 'Test' },
        newState: null
      });

      const ops = get(pendingOperations);
      expect(ops[0].type).toBe('delete');
      expect(ops[0].newState).toBeNull();
    });

    it('should support update operation type', async () => {
      const { addPendingOperation, pendingOperations } = await import('$lib/stores/optimistic');

      addPendingOperation({
        type: 'update',
        ticketId: 'ticket-1',
        previousState: { title: 'Old Title' },
        newState: { title: 'New Title' }
      });

      const ops = get(pendingOperations);
      expect(ops[0].type).toBe('update');
    });
  });
});
