/**
 * TASK-104: Audit Log Viewer Page Server
 *
 * Server-side data loading for audit logs.
 */

import type { PageServerLoad } from './$types';
import { auditService } from '$lib/server/admin/audit-service';
import type { PaginatedResponse, AuditLogEntry } from '$lib/types/admin';
import type { AuditAction } from '@prisma/client';

export interface AuditLogPageData {
  logs: PaginatedResponse<AuditLogEntry>;
}

export const load: PageServerLoad = async ({
  url
}): Promise<AuditLogPageData> => {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const action = url.searchParams.get('action') as AuditAction | null;
  const entityType = url.searchParams.get('entityType') || undefined;
  const isSensitive = url.searchParams.get('sensitive') === 'true';
  const startDateStr = url.searchParams.get('startDate');
  const endDateStr = url.searchParams.get('endDate');

  const logs = await auditService.listLogs(
    { page, limit, sortBy: 'createdAt', sortOrder: 'desc' },
    {
      action: action || undefined,
      entityType,
      isSensitive: isSensitive || undefined,
      startDate: startDateStr ? new Date(startDateStr) : undefined,
      endDate: endDateStr ? new Date(endDateStr) : undefined
    }
  );

  return {
    logs
  };
};
