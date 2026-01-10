/**
 * TASK-034: Socket Store Tests (TDD - RED Phase)
 *
 * Tests for the WebSocket connection store for real-time Kanban updates.
 *
 * Note: These tests verify the store interface and behavior without
 * requiring actual socket.io-client since it has ESM issues in test environment.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

describe('Socket Store', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('connectionStatus store', () => {
    it('should have initial status as disconnected', async () => {
      const { connectionStatus } = await import('$lib/stores/socket');
      const status = get(connectionStatus);
      expect(status).toBe('disconnected');
    });

    it('should update to connecting when connect is called', async () => {
      const { connectionStatus, connect } = await import('$lib/stores/socket');
      connect('http://localhost:3000');
      const status = get(connectionStatus);
      expect(status).toBe('connecting');
    });
  });

  describe('connect function', () => {
    it('should not create multiple connections', async () => {
      const { connect, connectionStatus } = await import('$lib/stores/socket');

      // First connect should set to connecting
      connect('http://localhost:3000');
      expect(get(connectionStatus)).toBe('connecting');

      // Second connect should not change state (since we're already connecting)
      connect('http://localhost:3000');
      expect(get(connectionStatus)).toBe('connecting');
    });
  });

  describe('disconnect function', () => {
    it('should set status to disconnected when socket is null', async () => {
      const { disconnect, connectionStatus } = await import('$lib/stores/socket');

      // Disconnect without connecting first - should handle gracefully
      disconnect();

      // Status should remain disconnected
      expect(get(connectionStatus)).toBe('disconnected');
    });

    it('should clear currentProjectId on disconnect', async () => {
      const { joinProject, disconnect, currentProjectId } = await import('$lib/stores/socket');

      // Set a project ID
      joinProject('project-123');
      expect(get(currentProjectId)).toBe('project-123');

      // Disconnect should clear it
      disconnect();
      expect(get(currentProjectId)).toBeNull();
    });
  });

  describe('currentProjectId store', () => {
    it('should track current project ID after join', async () => {
      const { connect, joinProject, currentProjectId } = await import('$lib/stores/socket');

      connect('http://localhost:3000');
      joinProject('project-123');

      expect(get(currentProjectId)).toBe('project-123');
    });

    it('should clear project ID after leave', async () => {
      const { connect, joinProject, leaveProject, currentProjectId } = await import('$lib/stores/socket');

      connect('http://localhost:3000');
      joinProject('project-123');
      leaveProject('project-123');

      expect(get(currentProjectId)).toBeNull();
    });
  });
});

describe('Socket Events', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should export onTicketCreated subscription function', async () => {
    const { onTicketCreated } = await import('$lib/stores/socket');
    expect(typeof onTicketCreated).toBe('function');
  });

  it('should export onTicketUpdated subscription function', async () => {
    const { onTicketUpdated } = await import('$lib/stores/socket');
    expect(typeof onTicketUpdated).toBe('function');
  });

  it('should export onTicketDeleted subscription function', async () => {
    const { onTicketDeleted } = await import('$lib/stores/socket');
    expect(typeof onTicketDeleted).toBe('function');
  });

  it('should export onTicketMoved subscription function', async () => {
    const { onTicketMoved } = await import('$lib/stores/socket');
    expect(typeof onTicketMoved).toBe('function');
  });

  it('should allow subscribing and unsubscribing to events', async () => {
    const { onTicketCreated } = await import('$lib/stores/socket');

    const callback = vi.fn();
    const unsubscribe = onTicketCreated(callback);

    expect(typeof unsubscribe).toBe('function');

    // Should be able to unsubscribe without error
    unsubscribe();
  });
});
