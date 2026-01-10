/**
 * TASK-022: Socket.IO Event Handlers Tests (TDD - RED Phase)
 *
 * Tests for ticket and project event handlers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTicketHandlers, createProjectHandlers } from '$lib/server/socket/handlers';
import type { SocketData } from '$lib/types/socket-events';
import { RoomManager } from '$lib/server/socket/rooms';

// Mock socket for testing
interface MockSocket {
  id: string;
  data: SocketData;
  rooms: Set<string>;
  join: ReturnType<typeof vi.fn>;
  leave: ReturnType<typeof vi.fn>;
  to: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
}

function createMockSocket(overrides: Partial<MockSocket> = {}): MockSocket {
  const emitFn = vi.fn();
  const toFn = vi.fn().mockReturnValue({ emit: emitFn });

  return {
    id: 'test-socket-id',
    data: {
      userId: 'user-123',
      userName: 'Test User',
      isAuthenticated: true
    },
    rooms: new Set(['test-socket-id']),
    join: vi.fn().mockResolvedValue(undefined),
    leave: vi.fn().mockResolvedValue(undefined),
    to: toFn,
    emit: emitFn,
    ...overrides
  };
}

describe('Socket Event Handlers', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  describe('createTicketHandlers', () => {
    it('should return handlers for ticket events', () => {
      const mockSocket = createMockSocket();
      const handlers = createTicketHandlers(mockSocket as any, roomManager);

      expect(handlers['ticket:move']).toBeDefined();
      expect(handlers['ticket:create']).toBeDefined();
      expect(handlers['ticket:update']).toBeDefined();
      expect(handlers['ticket:delete']).toBeDefined();
    });

    describe('ticket:move handler', () => {
      it('should broadcast ticket move to room', async () => {
        const mockSocket = createMockSocket();
        mockSocket.data.currentProject = 'project-123';
        roomManager.joinRoom('project-123', mockSocket.id, {
          userId: mockSocket.data.userId
        });

        const handlers = createTicketHandlers(mockSocket as any, roomManager);
        const callback = vi.fn();

        await handlers['ticket:move'](
          {
            ticketId: 'ticket-1',
            projectId: 'project-123',
            fromStatus: 'TODO',
            toStatus: 'IN_PROGRESS',
            newPosition: 0,
            triggeredBy: 'user'
          },
          callback
        );

        expect(mockSocket.to).toHaveBeenCalledWith('project-123');
        expect(callback).toHaveBeenCalledWith({ success: true });
      });

      it('should call callback with error if no current project', async () => {
        const mockSocket = createMockSocket();
        const handlers = createTicketHandlers(mockSocket as any, roomManager);
        const callback = vi.fn();

        await handlers['ticket:move'](
          {
            ticketId: 'ticket-1',
            projectId: 'project-123',
            fromStatus: 'TODO',
            toStatus: 'IN_PROGRESS',
            newPosition: 0,
            triggeredBy: 'user'
          },
          callback
        );

        expect(callback).toHaveBeenCalledWith({
          success: false,
          error: expect.objectContaining({
            code: 'NOT_IN_PROJECT'
          })
        });
      });
    });

    describe('ticket:create handler', () => {
      it('should broadcast ticket creation to room', async () => {
        const mockSocket = createMockSocket();
        mockSocket.data.currentProject = 'project-123';
        roomManager.joinRoom('project-123', mockSocket.id, {
          userId: mockSocket.data.userId
        });

        const handlers = createTicketHandlers(mockSocket as any, roomManager);
        const callback = vi.fn();

        await handlers['ticket:create'](
          {
            projectId: 'project-123',
            ticket: {
              title: 'New Ticket',
              status: 'BACKLOG',
              priority: 'MEDIUM',
              labels: [],
              position: 0,
              projectId: 'project-123'
            }
          },
          callback
        );

        expect(mockSocket.to).toHaveBeenCalledWith('project-123');
        expect(callback).toHaveBeenCalled();
      });
    });

    describe('ticket:update handler', () => {
      it('should broadcast ticket update to room', async () => {
        const mockSocket = createMockSocket();
        mockSocket.data.currentProject = 'project-123';
        roomManager.joinRoom('project-123', mockSocket.id, {
          userId: mockSocket.data.userId
        });

        const handlers = createTicketHandlers(mockSocket as any, roomManager);
        const callback = vi.fn();

        await handlers['ticket:update'](
          {
            ticketId: 'ticket-1',
            projectId: 'project-123',
            updates: {
              title: 'Updated Title'
            }
          },
          callback
        );

        expect(mockSocket.to).toHaveBeenCalledWith('project-123');
        expect(callback).toHaveBeenCalledWith({ success: true });
      });
    });

    describe('ticket:delete handler', () => {
      it('should broadcast ticket deletion to room', async () => {
        const mockSocket = createMockSocket();
        mockSocket.data.currentProject = 'project-123';
        roomManager.joinRoom('project-123', mockSocket.id, {
          userId: mockSocket.data.userId
        });

        const handlers = createTicketHandlers(mockSocket as any, roomManager);
        const callback = vi.fn();

        await handlers['ticket:delete']({ ticketId: 'ticket-1', projectId: 'project-123' }, callback);

        expect(mockSocket.to).toHaveBeenCalledWith('project-123');
        expect(callback).toHaveBeenCalledWith({ success: true });
      });
    });
  });

  describe('createProjectHandlers', () => {
    it('should return handlers for project events', () => {
      const mockSocket = createMockSocket();
      const handlers = createProjectHandlers(mockSocket as any, roomManager);

      expect(handlers['project:join']).toBeDefined();
      expect(handlers['project:leave']).toBeDefined();
    });

    describe('project:join handler', () => {
      it('should join socket to project room', async () => {
        const mockSocket = createMockSocket();
        const handlers = createProjectHandlers(mockSocket as any, roomManager);
        const callback = vi.fn();

        await handlers['project:join']({ projectId: 'project-123' }, callback);

        expect(mockSocket.join).toHaveBeenCalledWith('project-123');
        expect(mockSocket.data.currentProject).toBe('project-123');
        expect(callback).toHaveBeenCalledWith({
          success: true,
          users: expect.any(Array)
        });
      });

      it('should broadcast user joined to room', async () => {
        const mockSocket = createMockSocket();
        const handlers = createProjectHandlers(mockSocket as any, roomManager);

        await handlers['project:join']({ projectId: 'project-123' }, vi.fn());

        expect(mockSocket.to).toHaveBeenCalledWith('project-123');
      });

      it('should add socket to room manager', async () => {
        const mockSocket = createMockSocket();
        const handlers = createProjectHandlers(mockSocket as any, roomManager);

        await handlers['project:join']({ projectId: 'project-123' }, vi.fn());

        expect(roomManager.isInRoom('project-123', mockSocket.id)).toBe(true);
      });
    });

    describe('project:leave handler', () => {
      it('should leave socket from project room', async () => {
        const mockSocket = createMockSocket();
        mockSocket.data.currentProject = 'project-123';
        roomManager.joinRoom('project-123', mockSocket.id, {
          userId: mockSocket.data.userId
        });

        const handlers = createProjectHandlers(mockSocket as any, roomManager);

        await handlers['project:leave']({ projectId: 'project-123' });

        expect(mockSocket.leave).toHaveBeenCalledWith('project-123');
        expect(mockSocket.data.currentProject).toBeUndefined();
      });

      it('should broadcast user left to room', async () => {
        const mockSocket = createMockSocket();
        mockSocket.data.currentProject = 'project-123';
        roomManager.joinRoom('project-123', mockSocket.id, {
          userId: mockSocket.data.userId
        });

        const handlers = createProjectHandlers(mockSocket as any, roomManager);

        await handlers['project:leave']({ projectId: 'project-123' });

        expect(mockSocket.to).toHaveBeenCalledWith('project-123');
      });

      it('should remove socket from room manager', async () => {
        const mockSocket = createMockSocket();
        roomManager.joinRoom('project-123', mockSocket.id, {
          userId: mockSocket.data.userId
        });

        const handlers = createProjectHandlers(mockSocket as any, roomManager);

        await handlers['project:leave']({ projectId: 'project-123' });

        expect(roomManager.isInRoom('project-123', mockSocket.id)).toBe(false);
      });
    });
  });
});
