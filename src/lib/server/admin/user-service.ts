/**
 * TASK-101: User Management Service
 *
 * Handles user CRUD operations, role management, and invitations.
 */

import { prisma } from '$lib/server/prisma';
import type { UserRole } from '@prisma/client';
import type {
  UserWithActivity,
  InviteUserRequest,
  UpdateUserRequest,
  PaginationParams,
  PaginatedResponse
} from '$lib/types/admin';
import { auditService } from './audit-service';

export class UserService {
  /**
   * Get paginated list of users with activity data
   */
  async listUsers(
    params: PaginationParams,
    filters?: { role?: UserRole; isActive?: boolean; search?: string }
  ): Promise<PaginatedResponse<UserWithActivity>> {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (filters?.role) {
      where.role = filters.role;
    }
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters?.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users with project count
    const users = await prisma.user.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      include: {
        _count: {
          select: { projectMembers: true }
        }
      }
    });

    const data: UserWithActivity[] = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      loginCount: user.loginCount,
      invitedBy: user.invitedBy,
      invitedAt: user.invitedAt,
      acceptedAt: user.acceptedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      projectCount: user._count.projectMembers
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
   * Get a single user by ID
   */
  async getUser(id: string): Promise<UserWithActivity | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: { projectMembers: true }
        }
      }
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      loginCount: user.loginCount,
      invitedBy: user.invitedBy,
      invitedAt: user.invitedAt,
      acceptedAt: user.acceptedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      projectCount: user._count.projectMembers
    };
  }

  /**
   * Invite a new user
   */
  async inviteUser(
    request: InviteUserRequest,
    inviterId: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<UserWithActivity> {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: request.email }
    });

    if (existing) {
      throw new Error('User with this email already exists');
    }

    // Create user with invitation details
    const user = await prisma.user.create({
      data: {
        email: request.email,
        name: request.name || null,
        role: request.role || 'MEMBER',
        isActive: false, // Inactive until they accept invitation
        invitedBy: inviterId,
        invitedAt: new Date()
      },
      include: {
        _count: {
          select: { projectMembers: true }
        }
      }
    });

    // Add to projects if specified
    if (request.projectIds && request.projectIds.length > 0) {
      await prisma.projectMember.createMany({
        data: request.projectIds.map((projectId) => ({
          projectId,
          userId: user.id,
          role: request.role || 'MEMBER'
        }))
      });
    }

    // Log the invitation
    await auditService.log({
      userId: inviterId,
      action: 'USER_INVITED',
      entityType: 'User',
      entityId: user.id,
      description: `Invited user ${user.email} with role ${user.role}`,
      metadata: {
        invitedEmail: user.email,
        assignedRole: user.role,
        projectIds: request.projectIds || []
      },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      loginCount: user.loginCount,
      invitedBy: user.invitedBy,
      invitedAt: user.invitedAt,
      acceptedAt: user.acceptedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      projectCount: user._count.projectMembers
    };
  }

  /**
   * Update user details
   */
  async updateUser(
    id: string,
    request: UpdateUserRequest,
    updaterId: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<UserWithActivity> {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('User not found');
    }

    const oldRole = existing.role;
    const user = await prisma.user.update({
      where: { id },
      data: {
        name: request.name,
        role: request.role,
        isActive: request.isActive
      },
      include: {
        _count: {
          select: { projectMembers: true }
        }
      }
    });

    // Log role change specifically
    if (request.role && request.role !== oldRole) {
      await auditService.log({
        userId: updaterId,
        action: 'USER_ROLE_CHANGED',
        entityType: 'User',
        entityId: user.id,
        description: `Changed role from ${oldRole} to ${request.role} for ${user.email}`,
        metadata: {
          oldRole,
          newRole: request.role,
          targetEmail: user.email
        },
        ipAddress: requestInfo?.ipAddress,
        userAgent: requestInfo?.userAgent,
        isSensitive: true
      });
    } else {
      await auditService.log({
        userId: updaterId,
        action: 'USER_UPDATED',
        entityType: 'User',
        entityId: user.id,
        description: `Updated user ${user.email}`,
        metadata: {
          changes: request,
          targetEmail: user.email
        },
        ipAddress: requestInfo?.ipAddress,
        userAgent: requestInfo?.userAgent
      });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      loginCount: user.loginCount,
      invitedBy: user.invitedBy,
      invitedAt: user.invitedAt,
      acceptedAt: user.acceptedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      projectCount: user._count.projectMembers
    };
  }

  /**
   * Delete a user
   */
  async deleteUser(
    id: string,
    deleterId: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }

    // Cannot delete yourself
    if (id === deleterId) {
      throw new Error('Cannot delete your own account');
    }

    // Cannot delete owner (unless you're the owner)
    if (user.role === 'OWNER') {
      throw new Error('Cannot delete owner account');
    }

    await prisma.user.delete({ where: { id } });

    await auditService.log({
      userId: deleterId,
      action: 'USER_DELETED',
      entityType: 'User',
      entityId: id,
      description: `Deleted user ${user.email}`,
      metadata: {
        deletedEmail: user.email,
        deletedRole: user.role
      },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
      isSensitive: true
    });
  }

  /**
   * Get user activity logs
   */
  async getUserActivityLogs(userId: string, limit: number = 50) {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Record user login
   */
  async recordLogin(
    userId: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 }
      }
    });

    await auditService.log({
      userId,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: userId,
      description: 'User logged in',
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent
    });
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true,
        acceptedAt: new Date()
      }
    });
  }
}

export const userService = new UserService();
