/**
 * TASK-100-104: Admin Panel Types
 *
 * Type definitions for the admin panel functionality including
 * users, roles, audit logs, and system settings.
 */

import type { UserRole, AuditAction } from '@prisma/client';

export type { UserRole, AuditAction };

/**
 * User with related data for display
 */
export interface UserWithActivity {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  loginCount: number;
  invitedBy: string | null;
  invitedAt: Date | null;
  acceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  projectCount?: number;
}

/**
 * Invitation request payload
 */
export interface InviteUserRequest {
  email: string;
  name?: string;
  role?: UserRole;
  projectIds?: string[];
}

/**
 * User update payload
 */
export interface UpdateUserRequest {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Project with stats for admin overview
 */
export interface ProjectWithStats {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  ticketCount: number;
  memberCount: number;
  completedTickets: number;
  activeAgents: number;
  patternCount: number;
}

/**
 * Audit log entry with user info
 */
export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  description: string;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  isSensitive: boolean;
  createdAt: Date;
}

/**
 * Audit log filter options
 */
export interface AuditLogFilters {
  userId?: string;
  action?: AuditAction;
  entityType?: string;
  entityId?: string;
  isSensitive?: boolean;
  startDate?: Date;
  endDate?: Date;
}

/**
 * System setting with metadata
 */
export interface SystemSetting {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  category: string;
  isSensitive: boolean;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * System setting update payload
 */
export interface UpdateSettingRequest {
  key: string;
  value: unknown;
  description?: string;
  category?: string;
  isSensitive?: boolean;
}

/**
 * Admin dashboard stats
 */
export interface AdminDashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  archivedProjects: number;
  totalTickets: number;
  completedTickets: number;
  pendingInvitations: number;
  recentAuditLogs: number;
}

/**
 * Settings categories
 */
export const SETTINGS_CATEGORIES = [
  'general',
  'defaults',
  'claude-flow',
  'integrations',
  'security',
  'notifications'
] as const;

export type SettingsCategory = (typeof SETTINGS_CATEGORIES)[number];

/**
 * Default project settings schema
 */
export interface DefaultProjectSettings {
  defaultPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  enableAutoAssignment: boolean;
  maxConcurrentAgents: number;
  defaultLabels: string[];
  autoArchiveAfterDays: number | null;
}

/**
 * Claude Flow integration settings
 */
export interface ClaudeFlowSettings {
  enabled: boolean;
  apiEndpoint: string | null;
  maxAgents: number;
  topology: 'mesh' | 'hierarchical' | 'hierarchical-mesh';
  enableNeuralLearning: boolean;
  enableHNSW: boolean;
  memoryBackend: 'hybrid' | 'sqlite' | 'redis';
}

/**
 * Check if user has admin privileges
 */
export function isAdminRole(role: UserRole): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

/**
 * Check if user can manage other users
 */
export function canManageUsers(role: UserRole): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

/**
 * Check if user can manage settings
 */
export function canManageSettings(role: UserRole): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

/**
 * Check if user can archive projects
 */
export function canArchiveProjects(role: UserRole): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

/**
 * Check if user can delete projects
 */
export function canDeleteProjects(role: UserRole): boolean {
  return role === 'OWNER';
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    OWNER: 'Owner',
    ADMIN: 'Administrator',
    MEMBER: 'Member',
    VIEWER: 'Viewer'
  };
  return names[role];
}

/**
 * Get role badge variant
 */
export function getRoleBadgeVariant(
  role: UserRole
): 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' {
  const variants: Record<
    UserRole,
    'default' | 'secondary' | 'destructive' | 'outline' | 'warning'
  > = {
    OWNER: 'destructive',
    ADMIN: 'warning',
    MEMBER: 'default',
    VIEWER: 'secondary'
  };
  return variants[role];
}

/**
 * Get action display name
 */
export function getActionDisplayName(action: AuditAction): string {
  const names: Record<AuditAction, string> = {
    USER_CREATED: 'User Created',
    USER_UPDATED: 'User Updated',
    USER_DELETED: 'User Deleted',
    USER_INVITED: 'User Invited',
    USER_ROLE_CHANGED: 'User Role Changed',
    USER_LOGIN: 'User Login',
    USER_LOGOUT: 'User Logout',
    PROJECT_CREATED: 'Project Created',
    PROJECT_UPDATED: 'Project Updated',
    PROJECT_DELETED: 'Project Deleted',
    PROJECT_ARCHIVED: 'Project Archived',
    PROJECT_MEMBER_ADDED: 'Member Added to Project',
    PROJECT_MEMBER_REMOVED: 'Member Removed from Project',
    TICKET_CREATED: 'Ticket Created',
    TICKET_UPDATED: 'Ticket Updated',
    TICKET_DELETED: 'Ticket Deleted',
    TICKET_STATUS_CHANGED: 'Ticket Status Changed',
    SETTINGS_UPDATED: 'Settings Updated',
    INTEGRATION_CONFIGURED: 'Integration Configured',
    PERMISSION_DENIED: 'Permission Denied',
    SENSITIVE_DATA_ACCESSED: 'Sensitive Data Accessed'
  };
  return names[action];
}
