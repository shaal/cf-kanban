/**
 * TASK-098: Route Guard Utilities
 *
 * Server-side utilities for protecting API routes and pages.
 */

import { error, redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getUserProjectRole } from './user-service';
import {
  hasPermission,
  isAtLeastRole,
  type RoleType,
  type PermissionType,
  Role,
  Permission
} from './permissions';

/**
 * Session with user info
 */
export interface AuthSession {
  user: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role?: string;
    isActive?: boolean;
  };
}

/**
 * Require authentication for a route
 * Returns the session or throws a redirect/error
 */
export async function requireAuth(event: RequestEvent): Promise<AuthSession> {
  const session = await event.locals.auth();

  if (!session?.user) {
    if (event.url.pathname.startsWith('/api/')) {
      throw error(401, 'Authentication required');
    }

    const callbackUrl = encodeURIComponent(event.url.pathname + event.url.search);
    throw redirect(303, `/auth/signin?callbackUrl=${callbackUrl}`);
  }

  if (session.user.isActive === false) {
    if (event.url.pathname.startsWith('/api/')) {
      throw error(403, 'Account is deactivated');
    }
    throw redirect(303, '/auth/deactivated');
  }

  return session;
}

/**
 * Require a specific global role
 */
export async function requireRole(
  event: RequestEvent,
  requiredRole: RoleType
): Promise<AuthSession> {
  const session = await requireAuth(event);

  const userRole = (session.user.role as RoleType) || Role.VIEWER;

  if (!isAtLeastRole(userRole, requiredRole)) {
    throw error(403, `Role ${requiredRole} or higher required`);
  }

  return session;
}

/**
 * Require project membership with optional minimum role
 */
export async function requireProjectMember(
  event: RequestEvent,
  projectId: string,
  minRole?: RoleType
): Promise<{ session: AuthSession; role: RoleType }> {
  const session = await requireAuth(event);

  const role = await getUserProjectRole(session.user.id, projectId);

  if (!role) {
    throw error(403, 'You are not a member of this project');
  }

  if (minRole && !isAtLeastRole(role, minRole)) {
    throw error(403, `Role ${minRole} or higher required for this action`);
  }

  return { session, role };
}

/**
 * Require a specific permission for a project
 */
export async function requireProjectPermission(
  event: RequestEvent,
  projectId: string,
  permission: PermissionType
): Promise<{ session: AuthSession; role: RoleType }> {
  const session = await requireAuth(event);

  const role = await getUserProjectRole(session.user.id, projectId);

  if (!role) {
    throw error(403, 'You are not a member of this project');
  }

  if (!hasPermission(role, permission)) {
    throw error(403, `Permission denied: ${permission}`);
  }

  return { session, role };
}

/**
 * Check if user can modify a ticket
 */
export async function requireTicketModifyPermission(
  event: RequestEvent,
  projectId: string
): Promise<{ session: AuthSession; role: RoleType }> {
  return requireProjectPermission(event, projectId, Permission.TICKET_EDIT);
}

/**
 * Check if user can create tickets
 */
export async function requireTicketCreatePermission(
  event: RequestEvent,
  projectId: string
): Promise<{ session: AuthSession; role: RoleType }> {
  return requireProjectPermission(event, projectId, Permission.TICKET_CREATE);
}

/**
 * Check if user can manage project settings
 */
export async function requireProjectSettingsPermission(
  event: RequestEvent,
  projectId: string
): Promise<{ session: AuthSession; role: RoleType }> {
  return requireProjectPermission(event, projectId, Permission.PROJECT_SETTINGS);
}

/**
 * Check if user can manage project members
 */
export async function requireMemberManagePermission(
  event: RequestEvent,
  projectId: string
): Promise<{ session: AuthSession; role: RoleType }> {
  return requireProjectPermission(event, projectId, Permission.MEMBER_INVITE);
}

/**
 * Get optional session (doesn't throw)
 */
export async function getOptionalSession(event: RequestEvent): Promise<AuthSession | null> {
  const session = await event.locals.auth();

  if (!session?.user || session.user.isActive === false) {
    return null;
  }

  return session;
}

/**
 * Get user's role in a project (doesn't throw)
 */
export async function getOptionalProjectRole(
  event: RequestEvent,
  projectId: string
): Promise<{ session: AuthSession; role: RoleType } | null> {
  const session = await getOptionalSession(event);

  if (!session) {
    return null;
  }

  const role = await getUserProjectRole(session.user.id, projectId);

  if (!role) {
    return null;
  }

  return { session, role };
}
