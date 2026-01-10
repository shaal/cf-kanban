/**
 * TASK-104: Audit Log Export API
 *
 * GET /api/admin/audit/export?format=csv|json
 */

import type { RequestHandler } from './$types';
import { auditService } from '$lib/server/admin/audit-service';
import type { AuditAction } from '@prisma/client';

export const GET: RequestHandler = async ({ url }) => {
  const format = url.searchParams.get('format') || 'csv';
  const action = url.searchParams.get('action') as AuditAction | null;
  const entityType = url.searchParams.get('entityType') || undefined;
  const startDateStr = url.searchParams.get('startDate');
  const endDateStr = url.searchParams.get('endDate');

  const filters = {
    action: action || undefined,
    entityType,
    startDate: startDateStr ? new Date(startDateStr) : undefined,
    endDate: endDateStr ? new Date(endDateStr) : undefined
  };

  if (format === 'json') {
    const content = await auditService.exportToJSON(filters);
    return new Response(content, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="audit-log.json"`
      }
    });
  } else {
    const content = await auditService.exportToCSV(filters);
    return new Response(content, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-log.csv"`
      }
    });
  }
};
