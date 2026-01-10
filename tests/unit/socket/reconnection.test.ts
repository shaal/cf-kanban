/**
 * Tests for Socket.IO Reconnection with Exponential Backoff
 *
 * TASK-033: Implement reconnection with exponential backoff
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';

// Mock socket
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  connected: false,
  id: undefined as string | undefined,
};

// Mock the socket module
vi.mock('$lib/socket', () => ({
  getSocket: () => mockSocket,
  isConnected: () => mockSocket.connected,
  initSocket: vi.fn(),
  connectSocket: vi.fn(),
}));

import {
  connectionStatus,
  reconnectionState,
  initReconnection,
  startReconnection,
  stopReconnection,
  handleConnect,
  handleDisconnect,
  getReconnectionDelay,
  resetReconnectionState,
} from '$lib/socket/reconnection';

describe('Reconnection with Exponential Backoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    resetReconnectionState();
  });

  afterEach(() => {
    vi.useRealTimers();
    stopReconnection();
  });

  describe('connectionStatus store', () => {
    it('should start with disconnected status', () => {
      const status = get(connectionStatus);
      expect(['disconnected', 'reconnecting']).toContain(status);
    });
  });

  describe('reconnectionState store', () => {
    it('should have correct initial state', () => {
      const state = get(reconnectionState);
      expect(state.attempts).toBe(0);
      expect(state.isReconnecting).toBe(false);
      expect(state.nextRetryIn).toBe(0);
    });
  });

  describe('getReconnectionDelay', () => {
    it('should return base delay for first attempt', () => {
      const delay = getReconnectionDelay(0);
      // With jitter, should be around 1000 +/- 10%
      expect(delay).toBeGreaterThanOrEqual(900);
      expect(delay).toBeLessThanOrEqual(1100);
    });

    it('should use exponential backoff', () => {
      const delay1 = getReconnectionDelay(1);
      expect(delay1).toBeGreaterThanOrEqual(1800);
      expect(delay1).toBeLessThanOrEqual(2200);

      const delay2 = getReconnectionDelay(2);
      expect(delay2).toBeGreaterThanOrEqual(3600);
      expect(delay2).toBeLessThanOrEqual(4400);
    });

    it('should cap at maximum delay', () => {
      const delay = getReconnectionDelay(10); // Would be 1024 seconds without cap
      expect(delay).toBeLessThanOrEqual(33000); // 30000 + 10% jitter max
    });
  });

  describe('handleConnect', () => {
    it('should set status to connected', () => {
      handleConnect();
      const status = get(connectionStatus);
      expect(status).toBe('connected');
    });

    it('should reset reconnection attempts', () => {
      // Simulate some attempts
      startReconnection();
      vi.advanceTimersByTime(1000);

      handleConnect();

      const state = get(reconnectionState);
      expect(state.attempts).toBe(0);
      expect(state.isReconnecting).toBe(false);
    });

    it('should call onReconnect callback if provided', () => {
      const onReconnect = vi.fn();
      initReconnection({ onReconnect });

      handleConnect();

      expect(onReconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should set status to disconnected', () => {
      handleDisconnect('transport close');
      const status = get(connectionStatus);
      expect(['disconnected', 'reconnecting']).toContain(status);
    });

    it('should start reconnection if not server-initiated', () => {
      handleDisconnect('transport close');

      const state = get(reconnectionState);
      expect(state.isReconnecting).toBe(true);
    });

    it('should not start reconnection for io server disconnect', () => {
      handleDisconnect('io server disconnect');

      const state = get(reconnectionState);
      expect(state.isReconnecting).toBe(false);
    });

    it('should call onDisconnect callback if provided', () => {
      const onDisconnect = vi.fn();
      initReconnection({ onDisconnect });

      handleDisconnect('transport close');

      expect(onDisconnect).toHaveBeenCalledWith('transport close');
    });
  });

  describe('startReconnection', () => {
    it('should set isReconnecting to true', () => {
      startReconnection();

      const state = get(reconnectionState);
      expect(state.isReconnecting).toBe(true);
    });

    it('should attempt to reconnect after delay', () => {
      const mockConnect = vi.fn();
      initReconnection({ onAttempt: mockConnect });

      startReconnection();
      vi.advanceTimersByTime(1100); // Base delay + some buffer

      expect(mockConnect).toHaveBeenCalled();
    });

    it('should increment attempt counter', () => {
      startReconnection();
      vi.advanceTimersByTime(1100);

      const state = get(reconnectionState);
      expect(state.attempts).toBe(1);
    });
  });

  describe('stopReconnection', () => {
    it('should stop reconnection attempts', () => {
      const onAttempt = vi.fn();
      initReconnection({ onAttempt });

      startReconnection();
      stopReconnection();
      vi.advanceTimersByTime(10000);

      expect(onAttempt).not.toHaveBeenCalled();
    });

    it('should set isReconnecting to false', () => {
      startReconnection();
      stopReconnection();

      const state = get(reconnectionState);
      expect(state.isReconnecting).toBe(false);
    });
  });

  describe('initReconnection', () => {
    it('should configure reconnection options', () => {
      initReconnection({
        maxAttempts: 5,
        baseDelay: 500,
        maxDelay: 10000,
      });

      // Check that options are applied by testing delay calculation
      const delay = getReconnectionDelay(0);
      expect(delay).toBeGreaterThanOrEqual(450); // 500 - 10%
      expect(delay).toBeLessThanOrEqual(550); // 500 + 10%
    });

    it('should set up project rejoin on reconnect', () => {
      const onReconnect = vi.fn();
      initReconnection({
        onReconnect,
        currentProjectId: 'project-1',
      });

      handleConnect();

      expect(onReconnect).toHaveBeenCalled();
    });
  });

  describe('countdown timer', () => {
    it('should update nextRetryIn after starting reconnection', () => {
      startReconnection();

      const state = get(reconnectionState);
      expect(state.nextRetryIn).toBeGreaterThan(0);
    });
  });
});
