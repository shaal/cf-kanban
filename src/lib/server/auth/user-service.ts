/**
 * TASK-097: User Service
 *
 * Handles user management, project membership, and role operations.
 */

import { prisma } from '$lib/server/prisma';
import { Role, type RoleType } from './permissions';
import type { User, ProjectMember, UserRole } from '@prisma/client';

/**
 * User with project memberships
 */
export type UserWithMemberships = User & {
  projectMembers: (ProjectMember & {
    project: { id: string; name: string };
  })[];
};

/**
 * Find a user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email }
  });
}

/**
 * Find a user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id }
  });
}

/**
 * Find a user by external auth provider ID
 */
export async function findUserByExternalId(externalId: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { externalId }
  });
}

/**
 * Create or update a user from OAuth sign-in
 */
export async function findOrCreateUser(data: {
  email: string;
  name?: string;
  image?: string;
  externalId?: string;
}): Promise<User> {
  const { email, name, image, externalId } = data;

  // Try to find by external ID first
  if (externalId) {
    const existing = await findUserByExternalId(externalId);
    if (existing) {
      // Update user info
      return prisma.user.update({
        where: { id: existing.id },
        data: {
          name: name || existing.name,
          image: image || existing.image,
          avatarUrl: image || existing.avatarUrl
        }
      });
    }
  }

  // Try to find by email
  const existingByEmail = await findUserByEmail(email);
  if (existingByEmail) {
    // Update with external ID if provided
    return prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        externalId: externalId || existingByEmail.externalId,
        name: name || existingByEmail.name,
        image: image || existingByEmail.image,
        avatarUrl: image || existingByEmail.avatarUrl
      }
    });
  }

  // Create new user
  return prisma.user.create({
    data: {
      email,
      name,
      image,
      avatarUrl: image,
      externalId,
      emailVerified: new Date()
    }
  });
}

/**
 * Update user's last login time
 */
export async function updateLastLogin(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      lastLoginAt: new Date(),
      loginCount: { increment: 1 }
    }
  });
}

/**
 * Get user's role in a specific project
 */
export async function getUserProjectRole(
  userId: string,
  projectId: string
): Promise<RoleType | null> {
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId
      }
    },
    select: { role: true }
  });

  return membership?.role as RoleType | null;
}

/**
 * Add a user to a project with a specified role
 */
export async function addUserToProject(
  userId: string,
  projectId: string,
  role: RoleType = Role.MEMBER
): Promise<ProjectMember> {
  return prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId,
        userId
      }
    },
    create: {
      userId,
      projectId,
      role: role as UserRole
    },
    update: {
      // Don't update if already exists (prevents accidental role changes)
    }
  });
}

/**
 * Update a user's role in a project
 */
export async function updateUserProjectRole(
  userId: string,
  projectId: string,
  newRole: RoleType
): Promise<ProjectMember> {
  return prisma.projectMember.update({
    where: {
      projectId_userId: {
        projectId,
        userId
      }
    },
    data: {
      role: newRole as UserRole
    }
  });
}

/**
 * Remove a user from a project
 * Cannot remove the owner unless transferring ownership first
 */
export async function removeUserFromProject(
  userId: string,
  projectId: string
): Promise<void> {
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId
      }
    }
  });

  if (!membership) {
    throw new Error('User is not a member of this project');
  }

  if (membership.role === 'OWNER') {
    // Check if there are other owners
    const ownerCount = await prisma.projectMember.count({
      where: {
        projectId,
        role: 'OWNER'
      }
    });

    if (ownerCount <= 1) {
      throw new Error('Cannot remove the only owner. Transfer ownership first.');
    }
  }

  await prisma.projectMember.delete({
    where: {
      projectId_userId: {
        projectId,
        userId
      }
    }
  });
}

/**
 * Get all members of a project
 */
export async function getProjectMembers(projectId: string): Promise<
  (ProjectMember & {
    user: Pick<User, 'id' | 'email' | 'name' | 'image' | 'avatarUrl'>;
  })[]
> {
  return prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          avatarUrl: true
        }
      }
    },
    orderBy: [
      { role: 'asc' }, // Owner first, then Admin, Member, Viewer
      { joinedAt: 'asc' }
    ]
  });
}

/**
 * Get all projects a user is a member of
 */
export async function getUserProjects(userId: string): Promise<
  (ProjectMember & {
    project: { id: string; name: string; description: string | null };
  })[]
> {
  return prisma.projectMember.findMany({
    where: { userId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          description: true
        }
      }
    },
    orderBy: { joinedAt: 'desc' }
  });
}

/**
 * Check if a user is a member of a project
 */
export async function isProjectMember(userId: string, projectId: string): Promise<boolean> {
  const count = await prisma.projectMember.count({
    where: {
      userId,
      projectId
    }
  });
  return count > 0;
}

/**
 * Deactivate a user account
 */
export async function deactivateUser(userId: string): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: { isActive: false }
  });
}

/**
 * Reactivate a user account
 */
export async function reactivateUser(userId: string): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: { isActive: true }
  });
}

/**
 * Delete a user and all their data
 * This will cascade delete project memberships due to schema constraints
 */
export async function deleteUser(userId: string): Promise<void> {
  // First, handle projects where user is the only owner
  const ownedProjects = await prisma.projectMember.findMany({
    where: {
      userId,
      role: 'OWNER'
    },
    include: {
      project: {
        include: {
          members: true
        }
      }
    }
  });

  for (const membership of ownedProjects) {
    const otherOwners = membership.project.members.filter(
      (m) => m.role === 'OWNER' && m.userId !== userId
    );

    if (otherOwners.length === 0) {
      // User is sole owner - delete the project or transfer to another member
      const otherMembers = membership.project.members.filter(
        (m) => m.userId !== userId
      );

      if (otherMembers.length === 0) {
        // No other members, delete the project
        await prisma.project.delete({
          where: { id: membership.projectId }
        });
      } else {
        // Transfer ownership to first available member
        await prisma.projectMember.update({
          where: {
            projectId_userId: {
              projectId: membership.projectId,
              userId: otherMembers[0].userId
            }
          },
          data: { role: 'OWNER' }
        });
      }
    }
  }

  // Delete the user (cascade will handle remaining memberships)
  await prisma.user.delete({
    where: { id: userId }
  });
}
