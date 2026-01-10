/**
 * TASK-100: Admin Dashboard Server
 *
 * Server-side data loading for the admin dashboard.
 */

import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/prisma';
import { auditService } from '$lib/server/admin/audit-service';
import { settingsService } from '$lib/server/admin/settings-service';
import type { AdminDashboardStats, AuditLogEntry } from '$lib/types/admin';

export interface AdminDashboardData {
  stats: AdminDashboardStats;
  recentLogs: AuditLogEntry[];
  claudeFlowEnabled: boolean;
}

export const load: PageServerLoad = async (): Promise<AdminDashboardData> => {
  // Get user stats
  const [totalUsers, activeUsers] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } })
  ]);

  // Get pending invitations
  const pendingInvitations = await prisma.user.count({
    where: { isActive: false, invitedAt: { not: null } }
  });

  // Get project stats
  const [totalProjects, archivedProjects] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { isArchived: true } })
  ]);

  // Get ticket stats
  const ticketStats = await prisma.ticket.groupBy({
    by: ['status'],
    _count: true
  });

  const totalTickets = ticketStats.reduce((sum, s) => sum + s._count, 0);
  const completedTickets =
    ticketStats.find((s) => s.status === 'DONE')?._count || 0;

  // Get recent audit log count
  const recentAuditLogs = await auditService.getRecentLogCount(24);

  // Get recent audit logs for activity feed
  const recentLogsResult = await auditService.listLogs(
    { page: 1, limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }
  );

  // Get Claude Flow settings
  const claudeFlowSettings = await settingsService.getClaudeFlowSettings();

  const stats: AdminDashboardStats = {
    totalUsers,
    activeUsers,
    totalProjects,
    archivedProjects,
    totalTickets,
    completedTickets,
    pendingInvitations,
    recentAuditLogs
  };

  return {
    stats,
    recentLogs: recentLogsResult.data,
    claudeFlowEnabled: claudeFlowSettings.enabled
  };
};
