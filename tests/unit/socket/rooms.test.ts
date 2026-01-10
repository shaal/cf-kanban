/**
 * TASK-024: Room Management Tests (TDD - RED Phase)
 *
 * Tests for project room management in WebSocket connections.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '$lib/server/socket/rooms';

describe('RoomManager', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  describe('joinRoom', () => {
    it('should add a user to a room', () => {
      roomManager.joinRoom('project-123', 'socket-abc', { userId: 'user-1', userName: 'Alice' });
      const users = roomManager.getUsersInRoom('project-123');

      expect(users).toHaveLength(1);
      expect(users[0]).toEqual({ socketId: 'socket-abc', userId: 'user-1', userName: 'Alice' });
    });

    it('should add multiple users to the same room', () => {
      roomManager.joinRoom('project-123', 'socket-abc', { userId: 'user-1', userName: 'Alice' });
      roomManager.joinRoom('project-123', 'socket-def', { userId: 'user-2', userName: 'Bob' });

      const users = roomManager.getUsersInRoom('project-123');
      expect(users).toHaveLength(2);
    });

    it('should allow same user to join multiple rooms', () => {
      roomManager.joinRoom('project-123', 'socket-abc', { userId: 'user-1' });
      roomManager.joinRoom('project-456', 'socket-abc', { userId: 'user-1' });

      expect(roomManager.getUsersInRoom('project-123')).toHaveLength(1);
      expect(roomManager.getUsersInRoom('project-456')).toHaveLength(1);
    });

    it('should not add duplicate socket to same room', () => {
      roomManager.joinRoom('project-123', 'socket-abc', { userId: 'user-1' });
      roomManager.joinRoom('project-123', 'socket-abc', { userId: 'user-1' });

      const users = roomManager.getUsersInRoom('project-123');
      expect(users).toHaveLength(1);
    });

    it('should handle anonymous users', () => {
      roomManager.joinRoom('project-123', 'socket-abc', {});

      const users = roomManager.getUsersInRoom('project-123');
      expect(users).toHaveLength(1);
      expect(users[0].userId).toBeUndefined();
    });
  });

  describe('leaveRoom', () => {
    it('should remove a user from a room', () => {
      roomManager.joinRoom('project-123', 'socket-abc', { userId: 'user-1' });
      roomManager.leaveRoom('project-123', 'socket-abc');

      const users = roomManager.getUsersInRoom('project-123');
      expect(users).toHaveLength(0);
    });

    it('should only remove specified user', () => {
      roomManager.joinRoom('project-123', 'socket-abc', { userId: 'user-1' });
      roomManager.joinRoom('project-123', 'socket-def', { userId: 'user-2' });
      roomManager.leaveRoom('project-123', 'socket-abc');

      const users = roomManager.getUsersInRoom('project-123');
      expect(users).toHaveLength(1);
      expect(users[0].userId).toBe('user-2');
    });

    it('should do nothing if socket not in room', () => {
      roomManager.joinRoom('project-123', 'socket-abc', { userId: 'user-1' });
      roomManager.leaveRoom('project-123', 'socket-xyz');

      const users = roomManager.getUsersInRoom('project-123');
      expect(users).toHaveLength(1);
    });

    it('should do nothing if room does not exist', () => {
      expect(() => roomManager.leaveRoom('nonexistent', 'socket-abc')).not.toThrow();
    });
  });

  describe('leaveAllRooms', () => {
    it('should remove socket from all rooms on disconnect', () => {
      roomManager.joinRoom('project-123', 'socket-abc', { userId: 'user-1' });
      roomManager.joinRoom('project-456', 'socket-abc', { userId: 'user-1' });

      const leftRooms = roomManager.leaveAllRooms('socket-abc');

      expect(leftRooms).toContain('project-123');
      expect(leftRooms).toContain('project-456');
      expect(roomManager.getUsersInRoom('project-123')).toHaveLength(0);
      expect(roomManager.getUsersInRoom('project-456')).toHaveLength(0);
    });

    it('should return empty array if socket not in any rooms', () => {
      const leftRooms = roomManager.leaveAllRooms('socket-abc');
      expect(leftRooms).toEqual([]);
    });
  });

  describe('getUsersInRoom', () => {
    it('should return empty array for non-existent room', () => {
      const users = roomManager.getUsersInRoom('nonexistent');
      expect(users).toEqual([]);
    });

    it('should return all users in room', () => {
      roomManager.joinRoom('project-123', 'socket-abc', { userId: 'user-1', userName: 'Alice' });
      roomManager.joinRoom('project-123', 'socket-def', { userId: 'user-2', userName: 'Bob' });

      const users = roomManager.getUsersInRoom('project-123');
      expect(users).toHaveLength(2);
    });
  });

  describe('getUserCount', () => {
    it('should return 0 for empty room', () => {
      expect(roomManager.getUserCount('project-123')).toBe(0);
    });

    it('should return correct count', () => {
      roomManager.joinRoom('project-123', 'socket-abc', { userId: 'user-1' });
      roomManager.joinRoom('project-123', 'socket-def', { userId: 'user-2' });

      expect(roomManager.getUserCount('project-123')).toBe(2);
    });
  });

  describe('getRoomForSocket', () => {
    it('should return rooms a socket is in', () => {
      roomManager.joinRoom('project-123', 'socket-abc', { userId: 'user-1' });
      roomManager.joinRoom('project-456', 'socket-abc', { userId: 'user-1' });

      const rooms = roomManager.getRoomsForSocket('socket-abc');
      expect(rooms).toContain('project-123');
      expect(rooms).toContain('project-456');
    });

    it('should return empty array for socket not in any room', () => {
      const rooms = roomManager.getRoomsForSocket('socket-abc');
      expect(rooms).toEqual([]);
    });
  });

  describe('isInRoom', () => {
    it('should return true if socket is in room', () => {
      roomManager.joinRoom('project-123', 'socket-abc', { userId: 'user-1' });
      expect(roomManager.isInRoom('project-123', 'socket-abc')).toBe(true);
    });

    it('should return false if socket is not in room', () => {
      expect(roomManager.isInRoom('project-123', 'socket-abc')).toBe(false);
    });
  });

  describe('getSocketUser', () => {
    it('should return user info for a socket in a room', () => {
      roomManager.joinRoom('project-123', 'socket-abc', { userId: 'user-1', userName: 'Alice' });

      const user = roomManager.getSocketUser('project-123', 'socket-abc');
      expect(user).toEqual({ socketId: 'socket-abc', userId: 'user-1', userName: 'Alice' });
    });

    it('should return undefined if socket not in room', () => {
      const user = roomManager.getSocketUser('project-123', 'socket-abc');
      expect(user).toBeUndefined();
    });
  });
});
