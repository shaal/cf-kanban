/**
 * TASK-036: Position Store Tests (TDD - RED Phase)
 *
 * Tests for real-time ticket position synchronization with conflict resolution.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

describe('Position Store', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('positionVersions store', () => {
    it('should have empty initial state', async () => {
      const { positionVersions } = await import('$lib/stores/position');
      expect(get(positionVersions)).toEqual({});
    });
  });

  describe('getPositionVersion', () => {
    it('should return 0 for unknown ticket', async () => {
      const { getPositionVersion } = await import('$lib/stores/position');
      expect(getPositionVersion('unknown-id')).toBe(0);
    });

    it('should return stored version for known ticket', async () => {
      const { setPositionVersion, getPositionVersion } = await import('$lib/stores/position');
      setPositionVersion('ticket-1', 5);
      expect(getPositionVersion('ticket-1')).toBe(5);
    });
  });

  describe('setPositionVersion', () => {
    it('should update version for a ticket', async () => {
      const { positionVersions, setPositionVersion } = await import('$lib/stores/position');
      setPositionVersion('ticket-1', 3);
      expect(get(positionVersions)['ticket-1']).toBe(3);
    });

    it('should increment version when setting higher value', async () => {
      const { setPositionVersion, getPositionVersion } = await import('$lib/stores/position');
      setPositionVersion('ticket-1', 1);
      setPositionVersion('ticket-1', 5);
      expect(getPositionVersion('ticket-1')).toBe(5);
    });
  });

  describe('resolvePositionConflict', () => {
    it('should accept update when server version is higher', async () => {
      const { resolvePositionConflict, setPositionVersion } = await import('$lib/stores/position');
      setPositionVersion('ticket-1', 3);

      const result = resolvePositionConflict('ticket-1', 5, 10);

      expect(result.accepted).toBe(true);
      expect(result.finalPosition).toBe(10);
    });

    it('should reject update when local version is higher or equal', async () => {
      const { resolvePositionConflict, setPositionVersion } = await import('$lib/stores/position');
      setPositionVersion('ticket-1', 5);

      const result = resolvePositionConflict('ticket-1', 3, 10);

      expect(result.accepted).toBe(false);
    });

    it('should accept update for new ticket (no local version)', async () => {
      const { resolvePositionConflict } = await import('$lib/stores/position');

      const result = resolvePositionConflict('new-ticket', 1, 5);

      expect(result.accepted).toBe(true);
      expect(result.finalPosition).toBe(5);
    });
  });

  describe('updatePositionsForColumn', () => {
    it('should update positions for all tickets in a column', async () => {
      const { updatePositionsForColumn, getPositionVersion } = await import('$lib/stores/position');

      const positions = [
        { ticketId: 't1', position: 0, version: 1 },
        { ticketId: 't2', position: 1, version: 1 },
        { ticketId: 't3', position: 2, version: 1 }
      ];

      updatePositionsForColumn(positions);

      expect(getPositionVersion('t1')).toBe(1);
      expect(getPositionVersion('t2')).toBe(1);
      expect(getPositionVersion('t3')).toBe(1);
    });
  });

  describe('clearPositions', () => {
    it('should clear all position versions', async () => {
      const { positionVersions, setPositionVersion, clearPositions } = await import('$lib/stores/position');

      setPositionVersion('t1', 1);
      setPositionVersion('t2', 2);
      clearPositions();

      expect(get(positionVersions)).toEqual({});
    });
  });

  describe('getNextPosition', () => {
    it('should return 0 for empty column', async () => {
      const { getNextPosition } = await import('$lib/stores/position');
      expect(getNextPosition([])).toBe(0);
    });

    it('should return max position + 1', async () => {
      const { getNextPosition } = await import('$lib/stores/position');
      const tickets = [
        { id: '1', position: 0 },
        { id: '2', position: 2 },
        { id: '3', position: 1 }
      ];
      expect(getNextPosition(tickets)).toBe(3);
    });
  });

  describe('reorderPositions', () => {
    it('should reorder positions after move', async () => {
      const { reorderPositions } = await import('$lib/stores/position');

      const result = reorderPositions(['t1', 't2', 't3'], 1);

      expect(result).toEqual([
        { ticketId: 't1', position: 0 },
        { ticketId: 't2', position: 1 },
        { ticketId: 't3', position: 2 }
      ]);
    });

    it('should increment version for each position', async () => {
      const { reorderPositions, setPositionVersion, getPositionVersion } = await import('$lib/stores/position');

      setPositionVersion('t1', 5);
      reorderPositions(['t1', 't2'], 6);

      expect(getPositionVersion('t1')).toBe(6);
    });
  });
});
