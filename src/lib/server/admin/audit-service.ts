/**
 * TASK-104: Audit Logging Service
 *
 * Handles logging of admin actions and sensitive operations.
 * Provides audit log retrieval and export functionality.
 */

import { prisma } from '$lib/server/prisma';
import type { AuditAction } from '@prisma/client';
import type {
  AuditLogEntry,
  AuditLogFilters,
  PaginationParams,
  PaginatedResponse
} from '$lib/types/admin';

export interface AuditLogRequest {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  isSensitive?: boolean;
}

export class AuditService {
  /**
   * Log an action to the audit log
   */
  async log(request: AuditLogRequest): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: request.userId,
          action: request.action,
          entityType: request.entityType,
          entityId: request.entityId || null,
          description: request.description,
          metadata: request.metadata || {},
          ipAddress: request.ipAddress || null,
          userAgent: request.userAgent || null,
          isSensitive: request.isSensitive || false
        }
      });
    } catch (error) {
      // Log errors to console but don't throw - audit logging shouldn't break operations
      console.error('Failed to write audit log:', error);
    }
  }

  /**
   * Get paginated audit logs with filtering
   */
  async listLogs(
    params: PaginationParams,
    filters?: AuditLogFilters
  ): Promise<PaginatedResponse<AuditLogEntry>> {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (filters?.userId) {
      where.userId = filters.userId;
    }
    if (filters?.action) {
      where.action = filters.action;
    }
    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }
    if (filters?.entityId) {
      where.entityId = filters.entityId;
    }
    if (filters?.isSensitive !== undefined) {
      where.isSensitive = filters.isSensitive;
    }
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        (where.createdAt as Record<string, Date>).gte = filters.startDate;
      }
      if (filters.endDate) {
        (where.createdAt as Record<string, Date>).lte = filters.endDate;
      }
    }

    // Get total count
    const total = await prisma.auditLog.count({ where });

    // Get logs with user info
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    const data: AuditLogEntry[] = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userName: log.user?.name || null,
      userEmail: log.user?.email || 'Unknown',
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      description: log.description,
      metadata: log.metadata as Record<string, unknown>,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      isSensitive: log.isSensitive,
      createdAt: log.createdAt
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
   * Get audit logs for a specific entity
   */
  async getEntityLogs(
    entityType: string,
    entityId: string,
    limit: number = 50
  ): Promise<AuditLogEntry[]> {
    const logs = await prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    return logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userName: log.user?.name || null,
      userEmail: log.user?.email || 'Unknown',
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      description: log.description,
      metadata: log.metadata as Record<string, unknown>,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      isSensitive: log.isSensitive,
      createdAt: log.createdAt
    }));
  }

  /**
   * Export audit logs to CSV format
   */
  async exportToCSV(filters?: AuditLogFilters): Promise<string> {
    const where: Record<string, unknown> = {};
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.action) where.action = filters.action;
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        (where.createdAt as Record<string, Date>).gte = filters.startDate;
      }
      if (filters.endDate) {
        (where.createdAt as Record<string, Date>).lte = filters.endDate;
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    const headers = [
      'Timestamp',
      'User Email',
      'User Name',
      'Action',
      'Entity Type',
      'Entity ID',
      'Description',
      'IP Address',
      'Sensitive',
      'Metadata'
    ];

    const rows = logs.map((log) => [
      log.createdAt.toISOString(),
      log.user?.email || 'Unknown',
      log.user?.name || '',
      log.action,
      log.entityType,
      log.entityId || '',
      log.description,
      log.ipAddress || '',
      log.isSensitive ? 'Yes' : 'No',
      JSON.stringify(log.metadata)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    return csvContent;
  }

  /**
   * Export audit logs to JSON format
   */
  async exportToJSON(filters?: AuditLogFilters): Promise<string> {
    const where: Record<string, unknown> = {};
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.action) where.action = filters.action;
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        (where.createdAt as Record<string, Date>).gte = filters.startDate;
      }
      if (filters.endDate) {
        (where.createdAt as Record<string, Date>).lte = filters.endDate;
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    const exportData = logs.map((log) => ({
      id: log.id,
      timestamp: log.createdAt.toISOString(),
      user: {
        id: log.userId,
        email: log.user?.email || 'Unknown',
        name: log.user?.name || null
      },
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      description: log.description,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      isSensitive: log.isSensitive,
      metadata: log.metadata
    }));

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Get recent sensitive operations count
   */
  async getSensitiveOperationsCount(hours: number = 24): Promise<number> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return prisma.auditLog.count({
      where: {
        isSensitive: true,
        createdAt: { gte: since }
      }
    });
  }

  /**
   * Get recent audit log count
   */
  async getRecentLogCount(hours: number = 24): Promise<number> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return prisma.auditLog.count({
      where: {
        createdAt: { gte: since }
      }
    });
  }
}

export const auditService = new AuditService();
