/**
 * TASK-098: RBAC Permission Checking Utilities
 *
 * Defines roles, permissions, and helper functions for authorization.
 */

/**
 * User roles within a project
 * Ordered from highest to lowest privilege
 */
export const Role = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER'
} as const;

export type RoleType = (typeof Role)[keyof typeof Role];

/**
 * Role hierarchy for comparison (higher number = more privileges)
 */
const ROLE_HIERARCHY: Record<RoleType, number> = {
  [Role.OWNER]: 4,
  [Role.ADMIN]: 3,
  [Role.MEMBER]: 2,
  [Role.VIEWER]: 1
};

/**
 * Available permissions in the system
 */
export const Permission = {
  // Project permissions
  PROJECT_VIEW: 'project:view',
  PROJECT_EDIT: 'project:edit',
  PROJECT_DELETE: 'project:delete',
  PROJECT_SETTINGS: 'project:settings',

  // Ticket permissions
  TICKET_VIEW: 'ticket:view',
  TICKET_CREATE: 'ticket:create',
  TICKET_EDIT: 'ticket:edit',
  TICKET_DELETE: 'ticket:delete',
  TICKET_TRANSITION: 'ticket:transition',

  // Member permissions
  MEMBER_VIEW: 'member:view',
  MEMBER_INVITE: 'member:invite',
  MEMBER_REMOVE: 'member:remove',
  MEMBER_ROLE_CHANGE: 'member:role_change'
} as const;

export type PermissionType = (typeof Permission)[keyof typeof Permission];

/**
 * Permissions granted to each role
 */
const ROLE_PERMISSIONS: Record<RoleType, PermissionType[]> = {
  [Role.OWNER]: [
    // All project permissions
    Permission.PROJECT_VIEW,
    Permission.PROJECT_EDIT,
    Permission.PROJECT_DELETE,
    Permission.PROJECT_SETTINGS,
    // All ticket permissions
    Permission.TICKET_VIEW,
    Permission.TICKET_CREATE,
    Permission.TICKET_EDIT,
    Permission.TICKET_DELETE,
    Permission.TICKET_TRANSITION,
    // All member permissions
    Permission.MEMBER_VIEW,
    Permission.MEMBER_INVITE,
    Permission.MEMBER_REMOVE,
    Permission.MEMBER_ROLE_CHANGE
  ],
  [Role.ADMIN]: [
    // Project permissions (no delete)
    Permission.PROJECT_VIEW,
    Permission.PROJECT_EDIT,
    Permission.PROJECT_SETTINGS,
    // All ticket permissions
    Permission.TICKET_VIEW,
    Permission.TICKET_CREATE,
    Permission.TICKET_EDIT,
    Permission.TICKET_DELETE,
    Permission.TICKET_TRANSITION,
    // Member permissions (no role change)
    Permission.MEMBER_VIEW,
    Permission.MEMBER_INVITE,
    Permission.MEMBER_REMOVE
  ],
  [Role.MEMBER]: [
    // View project only
    Permission.PROJECT_VIEW,
    // Ticket permissions (no delete)
    Permission.TICKET_VIEW,
    Permission.TICKET_CREATE,
    Permission.TICKET_EDIT,
    Permission.TICKET_TRANSITION,
    // View members only
    Permission.MEMBER_VIEW
  ],
  [Role.VIEWER]: [
    // View only
    Permission.PROJECT_VIEW,
    Permission.TICKET_VIEW,
    Permission.MEMBER_VIEW
  ]
};

/**
 * Get all permissions for a given role
 */
export function getRolePermissions(role: RoleType): PermissionType[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: RoleType, permission: PermissionType): boolean {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
}

/**
 * Check if a role has at least one of the given permissions
 */
export function hasAnyPermission(role: RoleType, permissions: PermissionType[]): boolean {
  const rolePermissions = getRolePermissions(role);
  return permissions.some((p) => rolePermissions.includes(p));
}

/**
 * Check if a role has all of the given permissions
 */
export function hasAllPermissions(role: RoleType, permissions: PermissionType[]): boolean {
  const rolePermissions = getRolePermissions(role);
  return permissions.every((p) => rolePermissions.includes(p));
}

/**
 * Check if a role is at least as privileged as another role
 */
export function isAtLeastRole(userRole: RoleType, requiredRole: RoleType): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Convenience function: Can access project (any role)
 */
export function canAccessProject(role: RoleType): boolean {
  return hasPermission(role, Permission.PROJECT_VIEW);
}

/**
 * Convenience function: Can create/edit tickets
 */
export function canModifyTicket(role: RoleType): boolean {
  return hasAnyPermission(role, [Permission.TICKET_CREATE, Permission.TICKET_EDIT]);
}

/**
 * Convenience function: Can manage project members
 */
export function canManageMembers(role: RoleType): boolean {
  return hasAnyPermission(role, [Permission.MEMBER_INVITE, Permission.MEMBER_REMOVE]);
}

/**
 * Convenience function: Can delete project
 */
export function canDeleteProject(role: RoleType): boolean {
  return hasPermission(role, Permission.PROJECT_DELETE);
}

/**
 * Authorization error class
 */
export class AuthorizationError extends Error {
  constructor(
    message: string,
    public readonly requiredPermission?: PermissionType,
    public readonly userRole?: RoleType
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Assert that a role has a permission, throw if not
 */
export function assertPermission(
  role: RoleType | null | undefined,
  permission: PermissionType,
  message?: string
): void {
  if (!role) {
    throw new AuthorizationError(message || 'Authentication required');
  }

  if (!hasPermission(role, permission)) {
    throw new AuthorizationError(
      message || `Permission denied: ${permission}`,
      permission,
      role
    );
  }
}

/**
 * Assert that a role is at least as privileged as required
 */
export function assertRole(
  role: RoleType | null | undefined,
  requiredRole: RoleType,
  message?: string
): void {
  if (!role) {
    throw new AuthorizationError(message || 'Authentication required');
  }

  if (!isAtLeastRole(role, requiredRole)) {
    throw new AuthorizationError(
      message || `Role ${requiredRole} or higher required`,
      undefined,
      role
    );
  }
}
