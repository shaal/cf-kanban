/**
 * TASK-025: WebSocket Authentication Tests (TDD - RED Phase)
 *
 * Tests for Socket.IO authentication middleware.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticateSocket, extractUserFromToken, generateAnonymousUser } from '$lib/server/socket/auth';
import type { SocketData } from '$lib/types/socket-events';

// Mock socket for testing
interface MockSocket {
  id: string;
  data: SocketData;
  handshake: {
    auth: Record<string, unknown>;
    headers: Record<string, string>;
    query: Record<string, string>;
  };
}

function createMockSocket(overrides: Partial<MockSocket> = {}): MockSocket {
  return {
    id: 'test-socket-id',
    data: {},
    handshake: {
      auth: {},
      headers: {},
      query: {}
    },
    ...overrides
  };
}

describe('Socket Authentication', () => {
  describe('generateAnonymousUser', () => {
    it('should generate a unique user ID for anonymous users', () => {
      const user1 = generateAnonymousUser();
      const user2 = generateAnonymousUser();

      expect(user1.userId).toBeDefined();
      expect(user2.userId).toBeDefined();
      expect(user1.userId).not.toBe(user2.userId);
    });

    it('should mark user as anonymous', () => {
      const user = generateAnonymousUser();
      expect(user.isAuthenticated).toBe(false);
    });

    it('should generate a default userName', () => {
      const user = generateAnonymousUser();
      expect(user.userName).toMatch(/^Anonymous/);
    });
  });

  describe('extractUserFromToken', () => {
    it('should return null for missing token', () => {
      const result = extractUserFromToken(undefined);
      expect(result).toBeNull();
    });

    it('should return null for empty token', () => {
      const result = extractUserFromToken('');
      expect(result).toBeNull();
    });

    it('should return null for invalid token format', () => {
      const result = extractUserFromToken('not-a-valid-token');
      expect(result).toBeNull();
    });

    it('should extract user info from valid mock token', () => {
      // For Phase 1, we use a simple mock token format: "mock-token:userId:userName"
      const token = 'mock-token:user-123:TestUser';
      const result = extractUserFromToken(token);

      expect(result).not.toBeNull();
      expect(result?.userId).toBe('user-123');
      expect(result?.userName).toBe('TestUser');
      expect(result?.isAuthenticated).toBe(true);
    });

    it('should handle token with only userId', () => {
      const token = 'mock-token:user-456:';
      const result = extractUserFromToken(token);

      expect(result).not.toBeNull();
      expect(result?.userId).toBe('user-456');
      expect(result?.userName).toBe('');
    });
  });

  describe('authenticateSocket', () => {
    it('should attach user info from auth token', () => {
      const mockSocket = createMockSocket({
        handshake: {
          auth: { token: 'mock-token:user-123:Alice' },
          headers: {},
          query: {}
        }
      });
      const next = vi.fn();

      authenticateSocket(mockSocket as any, next);

      expect(mockSocket.data.userId).toBe('user-123');
      expect(mockSocket.data.userName).toBe('Alice');
      expect(mockSocket.data.isAuthenticated).toBe(true);
      expect(next).toHaveBeenCalledWith();
    });

    it('should fall back to query param token', () => {
      const mockSocket = createMockSocket({
        handshake: {
          auth: {},
          headers: {},
          query: { token: 'mock-token:user-456:Bob' }
        }
      });
      const next = vi.fn();

      authenticateSocket(mockSocket as any, next);

      expect(mockSocket.data.userId).toBe('user-456');
      expect(mockSocket.data.userName).toBe('Bob');
      expect(next).toHaveBeenCalledWith();
    });

    it('should create anonymous user when no token provided', () => {
      const mockSocket = createMockSocket();
      const next = vi.fn();

      authenticateSocket(mockSocket as any, next);

      expect(mockSocket.data.userId).toBeDefined();
      expect(mockSocket.data.userName).toMatch(/^Anonymous/);
      expect(mockSocket.data.isAuthenticated).toBe(false);
      expect(next).toHaveBeenCalledWith();
    });

    it('should create anonymous user for invalid token', () => {
      const mockSocket = createMockSocket({
        handshake: {
          auth: { token: 'invalid-token' },
          headers: {},
          query: {}
        }
      });
      const next = vi.fn();

      authenticateSocket(mockSocket as any, next);

      expect(mockSocket.data.isAuthenticated).toBe(false);
      expect(mockSocket.data.userName).toMatch(/^Anonymous/);
      expect(next).toHaveBeenCalledWith();
    });

    it('should always call next() to allow connection', () => {
      // In Phase 1, we allow all connections (even anonymous)
      const mockSocket = createMockSocket();
      const next = vi.fn();

      authenticateSocket(mockSocket as any, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(); // Called without error
    });

    it('should prefer auth token over query param', () => {
      const mockSocket = createMockSocket({
        handshake: {
          auth: { token: 'mock-token:auth-user:AuthUser' },
          headers: {},
          query: { token: 'mock-token:query-user:QueryUser' }
        }
      });
      const next = vi.fn();

      authenticateSocket(mockSocket as any, next);

      expect(mockSocket.data.userId).toBe('auth-user');
      expect(mockSocket.data.userName).toBe('AuthUser');
    });
  });
});
