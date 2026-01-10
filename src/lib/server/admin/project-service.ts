/**
 * TASK-102: Project Overview Service
 *
 * Handles project management for admin panel including
 * stats, members, and archive/delete operations.
 */

import { prisma } from '$lib/server/prisma';
import type {
  ProjectWithStats,
  PaginationParams,
  PaginatedResponse
} from '$lib/types/admin';
import { auditService } from './audit-service';

export class ProjectService {
  /**
   * Get paginated list of projects with stats
   */
  async listProjects(
    params: PaginationParams,
    filters?: { isArchived?: boolean; search?: string }
  ): Promise<PaginatedResponse<ProjectWithStats>> {
    const { page, limit, sortBy = 'updatedAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (filters?.isArchived !== undefined) {
      where.isArchived = filters.isArchived;
    }
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    // Get total count
    const total = await prisma.project.count({ where });

    // Get projects with counts
    const projects = await prisma.project.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      include: {
        _count: {
          select: { tickets: true, members: true }
        },
        tickets: {
          select: { status: true }
        }
      }
    });

    const data: ProjectWithStats[] = projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      isArchived: project.isArchived,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      ticketCount: project._count.tickets,
      memberCount: project._count.members,
      completedTickets: project.tickets.filter((t) => t.status === 'DONE')
        .length,
      activeAgents: 0, // Would be populated from Claude Flow
      patternCount: 0 // Would be populated from Claude Flow
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages
    };
  }

  /**
   * Get a single project with full stats
   */
  async getProject(id: string): Promise<ProjectWithStats | null> {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: { tickets: true, members: true }
        },
        tickets: {
          select: { status: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, email: true, name: true, role: true }
            }
          }
        }
      }
    });

    if (!project) return null;

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      isArchived: project.isArchived,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      ticketCount: project._count.tickets,
      memberCount: project._count.members,
      completedTickets: project.tickets.filter((t) => t.status === 'DONE')
        .length,
      activeAgents: 0,
      patternCount: 0
    };
  }

  /**
   * Get project members
   */
  async getProjectMembers(projectId: string) {
    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            role: true,
            lastLoginAt: true
          }
        }
      },
      orderBy: { joinedAt: 'asc' }
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      email: m.user.email,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
      globalRole: m.user.role,
      projectRole: m.role,
      lastLoginAt: m.user.lastLoginAt,
      joinedAt: m.joinedAt
    }));
  }

  /**
   * Add member to project
   */
  async addMember(
    projectId: string,
    userId: string,
    role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER',
    addedById: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new Error('Project not found');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    await prisma.projectMember.create({
      data: {
        projectId,
        userId,
        role
      }
    });

    await auditService.log({
      userId: addedById,
      action: 'PROJECT_MEMBER_ADDED',
      entityType: 'Project',
      entityId: projectId,
      description: `Added ${user.email} to project ${project.name}`,
      metadata: {
        addedUserId: userId,
        addedUserEmail: user.email,
        assignedRole: role,
        projectName: project.name
      },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent
    });
  }

  /**
   * Remove member from project
   */
  async removeMember(
    projectId: string,
    userId: string,
    removedById: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      include: {
        project: { select: { name: true } },
        user: { select: { email: true } }
      }
    });

    if (!member) {
      throw new Error('Member not found in project');
    }

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } }
    });

    await auditService.log({
      userId: removedById,
      action: 'PROJECT_MEMBER_REMOVED',
      entityType: 'Project',
      entityId: projectId,
      description: `Removed ${member.user.email} from project ${member.project.name}`,
      metadata: {
        removedUserId: userId,
        removedUserEmail: member.user.email,
        projectName: member.project.name
      },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent
    });
  }

  /**
   * Archive a project
   */
  async archiveProject(
    id: string,
    archivedById: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new Error('Project not found');
    }

    if (project.isArchived) {
      throw new Error('Project is already archived');
    }

    await prisma.project.update({
      where: { id },
      data: { isArchived: true }
    });

    await auditService.log({
      userId: archivedById,
      action: 'PROJECT_ARCHIVED',
      entityType: 'Project',
      entityId: id,
      description: `Archived project ${project.name}`,
      metadata: {
        projectName: project.name
      },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
      isSensitive: true
    });
  }

  /**
   * Unarchive a project
   */
  async unarchiveProject(
    id: string,
    unarchivedById: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new Error('Project not found');
    }

    if (!project.isArchived) {
      throw new Error('Project is not archived');
    }

    await prisma.project.update({
      where: { id },
      data: { isArchived: false }
    });

    await auditService.log({
      userId: unarchivedById,
      action: 'PROJECT_UPDATED',
      entityType: 'Project',
      entityId: id,
      description: `Unarchived project ${project.name}`,
      metadata: {
        projectName: project.name,
        action: 'unarchive'
      },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent
    });
  }

  /**
   * Delete a project
   */
  async deleteProject(
    id: string,
    deletedById: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: { select: { tickets: true, members: true } }
      }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    await prisma.project.delete({ where: { id } });

    await auditService.log({
      userId: deletedById,
      action: 'PROJECT_DELETED',
      entityType: 'Project',
      entityId: id,
      description: `Deleted project ${project.name}`,
      metadata: {
        projectName: project.name,
        ticketCount: project._count.tickets,
        memberCount: project._count.members
      },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
      isSensitive: true
    });
  }

  /**
   * Get project statistics for dashboard
   */
  async getProjectStats() {
    const [total, archived, ticketStats] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { isArchived: true } }),
      prisma.ticket.groupBy({
        by: ['status'],
        _count: true
      })
    ]);

    const totalTickets = ticketStats.reduce((sum, s) => sum + s._count, 0);
    const completedTickets =
      ticketStats.find((s) => s.status === 'DONE')?._count || 0;

    return {
      totalProjects: total,
      archivedProjects: archived,
      activeProjects: total - archived,
      totalTickets,
      completedTickets,
      completionRate:
        totalTickets > 0 ? (completedTickets / totalTickets) * 100 : 0
    };
  }
}

export const projectService = new ProjectService();
