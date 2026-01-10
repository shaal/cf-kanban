/**
 * TASK-102: Project Overview Page Server
 *
 * Server-side data loading for project overview.
 */

import type { PageServerLoad } from './$types';
import { projectService } from '$lib/server/admin/project-service';
import type { PaginatedResponse, ProjectWithStats } from '$lib/types/admin';

export interface ProjectOverviewData {
  projects: PaginatedResponse<ProjectWithStats>;
  stats: {
    totalProjects: number;
    activeProjects: number;
    archivedProjects: number;
    totalTickets: number;
    completedTickets: number;
    completionRate: number;
  };
}

export const load: PageServerLoad = async ({
  url
}): Promise<ProjectOverviewData> => {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '12');
  const search = url.searchParams.get('search') || undefined;
  const showArchived = url.searchParams.get('archived') === 'true';

  const [projects, stats] = await Promise.all([
    projectService.listProjects(
      { page, limit, sortBy: 'updatedAt', sortOrder: 'desc' },
      {
        isArchived: showArchived ? undefined : false,
        search
      }
    ),
    projectService.getProjectStats()
  ]);

  return {
    projects,
    stats
  };
};
