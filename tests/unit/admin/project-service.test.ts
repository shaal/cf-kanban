/**
 * TASK-102: Project Overview Service Tests
 *
 * Tests for project management, members, and archive/delete operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UserRole } from '@prisma/client';

// Mock Prisma - define mock functions inline in vi.mock
vi.mock('$lib/server/prisma', () => ({
  prisma: {
    project: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    projectMember: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn()
    },
    ticket: {
      groupBy: vi.fn()
    },
    user: {
      findUnique: vi.fn()
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
import { ProjectService } from '$lib/server/admin/project-service';
import { prisma } from '$lib/server/prisma';

// Get references to mocked functions
const mockPrisma = prisma as unknown as {
  project: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  projectMember: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  ticket: {
    groupBy: ReturnType<typeof vi.fn>;
  };
  user: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

describe('ProjectService', () => {
  let service: ProjectService;

  beforeEach(() => {
    service = new ProjectService();
    vi.clearAllMocks();
  });

  describe('listProjects', () => {
    it('should return paginated list of projects with stats', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Project One',
          description: 'First project',
          isArchived: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { tickets: 10, members: 3 },
          tickets: [
            { status: 'DONE' },
            { status: 'DONE' },
            { status: 'IN_PROGRESS' }
          ]
        },
        {
          id: 'project-2',
          name: 'Project Two',
          description: null,
          isArchived: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { tickets: 5, members: 2 },
          tickets: [{ status: 'DONE' }]
        }
      ];

      mockPrisma.project.count.mockResolvedValue(2);
      mockPrisma.project.findMany.mockResolvedValue(mockProjects);

      const result = await service.listProjects({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].ticketCount).toBe(10);
      expect(result.data[0].memberCount).toBe(3);
      expect(result.data[0].completedTickets).toBe(2);
      expect(result.data[1].isArchived).toBe(true);
    });

    it('should filter by archived status', async () => {
      mockPrisma.project.count.mockResolvedValue(1);
      mockPrisma.project.findMany.mockResolvedValue([
        {
          id: 'project-1',
          name: 'Archived Project',
          description: null,
          isArchived: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { tickets: 0, members: 0 },
          tickets: []
        }
      ]);

      const result = await service.listProjects(
        { page: 1, limit: 10 },
        { isArchived: true }
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].isArchived).toBe(true);
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isArchived: true }
        })
      );
    });

    it('should filter by search query', async () => {
      mockPrisma.project.count.mockResolvedValue(0);
      mockPrisma.project.findMany.mockResolvedValue([]);

      await service.listProjects(
        { page: 1, limit: 10 },
        { search: 'test project' }
      );

      expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'test project', mode: 'insensitive' } },
              { description: { contains: 'test project', mode: 'insensitive' } }
            ]
          })
        })
      );
    });
  });

  describe('getProject', () => {
    it('should return project with full stats', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        name: 'Test Project',
        description: 'A test project',
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { tickets: 15, members: 5 },
        tickets: [
          { status: 'DONE' },
          { status: 'DONE' },
          { status: 'IN_PROGRESS' }
        ],
        members: [
          {
            user: { id: 'u1', email: 'a@test.com', name: 'A', role: 'ADMIN' }
          }
        ]
      });

      const result = await service.getProject('project-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('project-1');
      expect(result?.ticketCount).toBe(15);
      expect(result?.memberCount).toBe(5);
      expect(result?.completedTickets).toBe(2);
    });

    it('should return null for non-existent project', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const result = await service.getProject('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getProjectMembers', () => {
    it('should return project members with user details', async () => {
      mockPrisma.projectMember.findMany.mockResolvedValue([
        {
          id: 'pm-1',
          role: 'ADMIN' as UserRole,
          joinedAt: new Date(),
          user: {
            id: 'user-1',
            email: 'admin@test.com',
            name: 'Admin User',
            avatarUrl: null,
            role: 'ADMIN' as UserRole,
            lastLoginAt: new Date()
          }
        },
        {
          id: 'pm-2',
          role: 'MEMBER' as UserRole,
          joinedAt: new Date(),
          user: {
            id: 'user-2',
            email: 'member@test.com',
            name: 'Member User',
            avatarUrl: 'https://avatar.url',
            role: 'MEMBER' as UserRole,
            lastLoginAt: null
          }
        }
      ]);

      const result = await service.getProjectMembers('project-1');

      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('admin@test.com');
      expect(result[0].projectRole).toBe('ADMIN');
      expect(result[1].avatarUrl).toBe('https://avatar.url');
    });
  });

  describe('addMember', () => {
    it('should add member to project', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        name: 'Test Project'
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'new@test.com'
      });
      mockPrisma.projectMember.create.mockResolvedValue({
        id: 'pm-1',
        projectId: 'project-1',
        userId: 'user-1'
      });

      await service.addMember('project-1', 'user-1', 'MEMBER', 'admin-1');

      expect(mockPrisma.projectMember.create).toHaveBeenCalledWith({
        data: {
          projectId: 'project-1',
          userId: 'user-1',
          role: 'MEMBER'
        }
      });
    });

    it('should throw error for non-existent project', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      await expect(
        service.addMember('non-existent', 'user-1', 'MEMBER', 'admin-1')
      ).rejects.toThrow('Project not found');
    });

    it('should throw error for non-existent user', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        name: 'Test'
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.addMember('project-1', 'non-existent', 'MEMBER', 'admin-1')
      ).rejects.toThrow('User not found');
    });
  });

  describe('removeMember', () => {
    it('should remove member from project', async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValue({
        id: 'pm-1',
        project: { name: 'Test Project' },
        user: { email: 'member@test.com' }
      });
      mockPrisma.projectMember.delete.mockResolvedValue({ id: 'pm-1' });

      await service.removeMember('project-1', 'user-1', 'admin-1');

      expect(mockPrisma.projectMember.delete).toHaveBeenCalledWith({
        where: { projectId_userId: { projectId: 'project-1', userId: 'user-1' } }
      });
    });

    it('should throw error if member not in project', async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValue(null);

      await expect(
        service.removeMember('project-1', 'user-1', 'admin-1')
      ).rejects.toThrow('Member not found in project');
    });
  });

  describe('archiveProject', () => {
    it('should archive project', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        name: 'Test Project',
        isArchived: false
      });
      mockPrisma.project.update.mockResolvedValue({
        id: 'project-1',
        isArchived: true
      });

      await service.archiveProject('project-1', 'admin-1');

      expect(mockPrisma.project.update).toHaveBeenCalledWith({
        where: { id: 'project-1' },
        data: { isArchived: true }
      });
    });

    it('should throw error if project not found', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      await expect(
        service.archiveProject('non-existent', 'admin-1')
      ).rejects.toThrow('Project not found');
    });

    it('should throw error if already archived', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        name: 'Test',
        isArchived: true
      });

      await expect(
        service.archiveProject('project-1', 'admin-1')
      ).rejects.toThrow('Project is already archived');
    });
  });

  describe('unarchiveProject', () => {
    it('should unarchive project', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        name: 'Test Project',
        isArchived: true
      });
      mockPrisma.project.update.mockResolvedValue({
        id: 'project-1',
        isArchived: false
      });

      await service.unarchiveProject('project-1', 'admin-1');

      expect(mockPrisma.project.update).toHaveBeenCalledWith({
        where: { id: 'project-1' },
        data: { isArchived: false }
      });
    });

    it('should throw error if not archived', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        name: 'Test',
        isArchived: false
      });

      await expect(
        service.unarchiveProject('project-1', 'admin-1')
      ).rejects.toThrow('Project is not archived');
    });
  });

  describe('deleteProject', () => {
    it('should delete project', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        name: 'Test Project',
        _count: { tickets: 5, members: 2 }
      });
      mockPrisma.project.delete.mockResolvedValue({ id: 'project-1' });

      await service.deleteProject('project-1', 'admin-1');

      expect(mockPrisma.project.delete).toHaveBeenCalledWith({
        where: { id: 'project-1' }
      });
    });

    it('should throw error if project not found', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteProject('non-existent', 'admin-1')
      ).rejects.toThrow('Project not found');
    });
  });

  describe('getProjectStats', () => {
    it('should return project statistics', async () => {
      mockPrisma.project.count.mockResolvedValueOnce(10); // total
      mockPrisma.project.count.mockResolvedValueOnce(2);  // archived
      mockPrisma.ticket.groupBy.mockResolvedValue([
        { status: 'DONE', _count: 50 },
        { status: 'IN_PROGRESS', _count: 20 },
        { status: 'BACKLOG', _count: 30 }
      ]);

      const stats = await service.getProjectStats();

      expect(stats.totalProjects).toBe(10);
      expect(stats.archivedProjects).toBe(2);
      expect(stats.activeProjects).toBe(8);
      expect(stats.totalTickets).toBe(100);
      expect(stats.completedTickets).toBe(50);
      expect(stats.completionRate).toBe(50);
    });

    it('should handle empty data', async () => {
      mockPrisma.project.count.mockResolvedValue(0);
      mockPrisma.ticket.groupBy.mockResolvedValue([]);

      const stats = await service.getProjectStats();

      expect(stats.totalProjects).toBe(0);
      expect(stats.totalTickets).toBe(0);
      expect(stats.completionRate).toBe(0);
    });
  });
});
