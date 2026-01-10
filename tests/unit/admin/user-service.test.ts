/**
 * TASK-101: User Management Service Tests
 *
 * Tests for user CRUD operations, role management, and invitations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UserRole } from '@prisma/client';
import type { UserWithActivity, InviteUserRequest } from '$lib/types/admin';

// Mock Prisma - define mock functions inline in vi.mock
vi.mock('$lib/server/prisma', () => ({
  prisma: {
    user: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    projectMember: {
      createMany: vi.fn()
    },
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn()
    }
  }
}));

// Mock audit service
vi.mock('$lib/server/admin/audit-service', () => ({
  auditService: {
    log: vi.fn()
  }
}));

// Import after mocks
import { UserService } from '$lib/server/admin/user-service';
import { prisma } from '$lib/server/prisma';

// Get references to mocked functions
const mockPrisma = prisma as unknown as {
  user: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  projectMember: {
    createMany: ReturnType<typeof vi.fn>;
  };
  auditLog: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
    vi.clearAllMocks();
  });

  describe('listUsers', () => {
    it('should return paginated list of users', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'admin@test.com',
          name: 'Admin User',
          avatarUrl: null,
          role: 'ADMIN' as UserRole,
          isActive: true,
          lastLoginAt: new Date(),
          loginCount: 5,
          invitedBy: null,
          invitedAt: null,
          acceptedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { projectMembers: 3 }
        },
        {
          id: 'user-2',
          email: 'member@test.com',
          name: 'Member User',
          avatarUrl: null,
          role: 'MEMBER' as UserRole,
          isActive: true,
          lastLoginAt: null,
          loginCount: 0,
          invitedBy: 'user-1',
          invitedAt: new Date(),
          acceptedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { projectMembers: 1 }
        }
      ];

      mockPrisma.user.count.mockResolvedValue(2);
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.listUsers({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('should filter users by role', async () => {
      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'user-1',
          email: 'admin@test.com',
          name: 'Admin User',
          avatarUrl: null,
          role: 'ADMIN' as UserRole,
          isActive: true,
          lastLoginAt: new Date(),
          loginCount: 5,
          invitedBy: null,
          invitedAt: null,
          acceptedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { projectMembers: 3 }
        }
      ]);

      const result = await service.listUsers(
        { page: 1, limit: 10 },
        { role: 'ADMIN' as UserRole }
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].role).toBe('ADMIN');
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: 'ADMIN' }
        })
      );
    });

    it('should filter users by search query', async () => {
      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.listUsers(
        { page: 1, limit: 10 },
        { search: 'admin' }
      );

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { email: { contains: 'admin', mode: 'insensitive' } },
              { name: { contains: 'admin', mode: 'insensitive' } }
            ]
          })
        })
      );
    });

    it('should calculate pagination correctly', async () => {
      mockPrisma.user.count.mockResolvedValue(25);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.listUsers({ page: 2, limit: 10 });

      expect(result.totalPages).toBe(3);
      expect(result.hasMore).toBe(true);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10
        })
      );
    });
  });

  describe('getUser', () => {
    it('should return user with activity data', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test User',
        avatarUrl: 'https://avatar.url',
        role: 'MEMBER' as UserRole,
        isActive: true,
        lastLoginAt: new Date(),
        loginCount: 10,
        invitedBy: null,
        invitedAt: null,
        acceptedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { projectMembers: 5 }
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUser('user-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('user-1');
      expect(result?.email).toBe('test@test.com');
      expect(result?.projectCount).toBe(5);
    });

    it('should return null for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.getUser('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('inviteUser', () => {
    it('should create new user with invitation details', async () => {
      const request: InviteUserRequest = {
        email: 'new@test.com',
        name: 'New User',
        role: 'MEMBER'
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: request.email,
        name: request.name,
        avatarUrl: null,
        role: 'MEMBER',
        isActive: false,
        lastLoginAt: null,
        loginCount: 0,
        invitedBy: 'inviter-id',
        invitedAt: new Date(),
        acceptedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { projectMembers: 0 }
      });

      const result = await service.inviteUser(request, 'inviter-id');

      expect(result.email).toBe('new@test.com');
      expect(result.isActive).toBe(false);
      expect(result.invitedBy).toBe('inviter-id');
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('should throw error if user already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'existing@test.com'
      });

      await expect(
        service.inviteUser({ email: 'existing@test.com' }, 'inviter-id')
      ).rejects.toThrow('User with this email already exists');
    });

    it('should add user to projects if specified', async () => {
      const request: InviteUserRequest = {
        email: 'new@test.com',
        projectIds: ['project-1', 'project-2']
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: request.email,
        name: null,
        avatarUrl: null,
        role: 'MEMBER',
        isActive: false,
        lastLoginAt: null,
        loginCount: 0,
        invitedBy: 'inviter-id',
        invitedAt: new Date(),
        acceptedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { projectMembers: 0 }
      });

      await service.inviteUser(request, 'inviter-id');

      expect(mockPrisma.projectMember.createMany).toHaveBeenCalledWith({
        data: [
          { projectId: 'project-1', userId: 'new-user-id', role: 'MEMBER' },
          { projectId: 'project-2', userId: 'new-user-id', role: 'MEMBER' }
        ]
      });
    });
  });

  describe('updateUser', () => {
    it('should update user details', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        role: 'MEMBER'
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Updated Name',
        avatarUrl: null,
        role: 'ADMIN',
        isActive: true,
        lastLoginAt: null,
        loginCount: 0,
        invitedBy: null,
        invitedAt: null,
        acceptedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { projectMembers: 0 }
      });

      const result = await service.updateUser(
        'user-1',
        { name: 'Updated Name', role: 'ADMIN' },
        'updater-id'
      );

      expect(result.name).toBe('Updated Name');
      expect(result.role).toBe('ADMIN');
    });

    it('should throw error for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUser('non-existent', { name: 'Test' }, 'updater-id')
      ).rejects.toThrow('User not found');
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        role: 'MEMBER'
      });
      mockPrisma.user.delete.mockResolvedValue({ id: 'user-1' });

      await service.deleteUser('user-1', 'deleter-id');

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' }
      });
    });

    it('should throw error when deleting self', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        role: 'MEMBER'
      });

      await expect(
        service.deleteUser('user-1', 'user-1')
      ).rejects.toThrow('Cannot delete your own account');
    });

    it('should throw error when deleting owner', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'owner-1',
        email: 'owner@test.com',
        role: 'OWNER'
      });

      await expect(
        service.deleteUser('owner-1', 'admin-1')
      ).rejects.toThrow('Cannot delete owner account');
    });
  });

  describe('recordLogin', () => {
    it('should update login timestamp and count', async () => {
      mockPrisma.user.update.mockResolvedValue({});

      await service.recordLogin('user-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          lastLoginAt: expect.any(Date),
          loginCount: { increment: 1 }
        }
      });
    });
  });

  describe('acceptInvitation', () => {
    it('should activate user and set accepted timestamp', async () => {
      mockPrisma.user.update.mockResolvedValue({});

      await service.acceptInvitation('user-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          isActive: true,
          acceptedAt: expect.any(Date)
        }
      });
    });
  });
});

describe('UserWithActivity type', () => {
  it('should include all required fields', () => {
    const user: UserWithActivity = {
      id: 'user-1',
      email: 'test@test.com',
      name: 'Test User',
      avatarUrl: null,
      role: 'MEMBER',
      isActive: true,
      lastLoginAt: new Date(),
      loginCount: 5,
      invitedBy: null,
      invitedAt: null,
      acceptedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      projectCount: 3
    };

    expect(user.id).toBeDefined();
    expect(user.email).toBeDefined();
    expect(user.role).toBeDefined();
    expect(user.projectCount).toBeDefined();
  });
});
