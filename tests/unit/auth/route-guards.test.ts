/**
 * TASK-098: Route Guards Tests (TDD)
 *
 * Tests for API route protection utilities.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  requireAuth,
  requireRole,
  requireProjectMember,
  requireProjectPermission,
  getOptionalSession
} from '$lib/server/auth/route-guards';
import { Role, Permission } from '$lib/server/auth/permissions';

// Mock the user service
vi.mock('$lib/server/auth/user-service', () => ({
  getUserProjectRole: vi.fn()
}));

import { getUserProjectRole } from '$lib/server/auth/user-service';

// Mock request event
function createMockEvent(session: any = null, pathname = '/api/test') {
  return {
    locals: {
      auth: vi.fn().mockResolvedValue(session)
    },
    url: {
      pathname,
      search: ''
    }
  } as any;
}

// Mock session
function createMockSession(overrides: any = {}) {
  return {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'MEMBER',
      isActive: true,
      ...overrides
    }
  };
}

describe('Route Guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should return session for authenticated user', async () => {
      const session = createMockSession();
      const event = createMockEvent(session);

      const result = await requireAuth(event);

      expect(result).toEqual(session);
    });

    it('should throw 401 for unauthenticated API request', async () => {
      const event = createMockEvent(null, '/api/projects');

      await expect(requireAuth(event)).rejects.toMatchObject({
        status: 401
      });
    });

    it('should throw 403 for deactivated user on API route', async () => {
      const session = createMockSession({ isActive: false });
      const event = createMockEvent(session, '/api/projects');

      await expect(requireAuth(event)).rejects.toMatchObject({
        status: 403
      });
    });
  });

  describe('requireRole', () => {
    it('should allow user with sufficient role', async () => {
      const session = createMockSession({ role: 'ADMIN' });
      const event = createMockEvent(session);

      const result = await requireRole(event, Role.MEMBER);

      expect(result).toEqual(session);
    });

    it('should throw 403 for insufficient role', async () => {
      const session = createMockSession({ role: 'VIEWER' });
      const event = createMockEvent(session);

      await expect(requireRole(event, Role.ADMIN)).rejects.toMatchObject({
        status: 403
      });
    });
  });

  describe('requireProjectMember', () => {
    it('should return session and role for project member', async () => {
      const session = createMockSession();
      const event = createMockEvent(session);
      (getUserProjectRole as any).mockResolvedValue(Role.MEMBER);

      const result = await requireProjectMember(event, 'project-123');

      expect(result.session).toEqual(session);
      expect(result.role).toBe(Role.MEMBER);
    });

    it('should throw 403 for non-member', async () => {
      const session = createMockSession();
      const event = createMockEvent(session);
      (getUserProjectRole as any).mockResolvedValue(null);

      await expect(requireProjectMember(event, 'project-123')).rejects.toMatchObject({
        status: 403
      });
    });

    it('should enforce minimum role', async () => {
      const session = createMockSession();
      const event = createMockEvent(session);
      (getUserProjectRole as any).mockResolvedValue(Role.VIEWER);

      await expect(
        requireProjectMember(event, 'project-123', Role.ADMIN)
      ).rejects.toMatchObject({
        status: 403
      });
    });
  });

  describe('requireProjectPermission', () => {
    it('should allow user with permission', async () => {
      const session = createMockSession();
      const event = createMockEvent(session);
      (getUserProjectRole as any).mockResolvedValue(Role.MEMBER);

      const result = await requireProjectPermission(
        event,
        'project-123',
        Permission.TICKET_CREATE
      );

      expect(result.role).toBe(Role.MEMBER);
    });

    it('should throw 403 for missing permission', async () => {
      const session = createMockSession();
      const event = createMockEvent(session);
      (getUserProjectRole as any).mockResolvedValue(Role.VIEWER);

      await expect(
        requireProjectPermission(event, 'project-123', Permission.TICKET_CREATE)
      ).rejects.toMatchObject({
        status: 403
      });
    });
  });

  describe('getOptionalSession', () => {
    it('should return session for authenticated user', async () => {
      const session = createMockSession();
      const event = createMockEvent(session);

      const result = await getOptionalSession(event);

      expect(result).toEqual(session);
    });

    it('should return null for unauthenticated user', async () => {
      const event = createMockEvent(null);

      const result = await getOptionalSession(event);

      expect(result).toBeNull();
    });

    it('should return null for deactivated user', async () => {
      const session = createMockSession({ isActive: false });
      const event = createMockEvent(session);

      const result = await getOptionalSession(event);

      expect(result).toBeNull();
    });
  });
});
