/**
 * GAP-3.1.4: Project Health API Endpoint
 *
 * Fetches health status and statistics for all projects,
 * including active agent counts and last activity timestamps.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { agentService } from '$lib/server/claude-flow/agents';
import type {
  ProjectWithHealth,
  AggregateStats,
  ProjectHealthResponse,
  HealthStatus
} from '$lib/types/dashboard';

/**
 * GET /api/projects/health
 *
 * Returns health status and statistics for all projects
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    const includeArchived = url.searchParams.get('includeArchived') === 'true';
    const projectId = url.searchParams.get('projectId');

    // Build where clause
    const where: Record<string, unknown> = {};
    if (!includeArchived) {
      where.isArchived = false;
    }
    if (projectId) {
      where.id = projectId;
    }

    // Fetch projects with their statistics
    const projects = await prisma.project.findMany({
      where,
      include: {
        _count: {
          select: { tickets: true, members: true }
        },
        tickets: {
          select: {
            status: true,
            updatedAt: true
          },
          orderBy: { updatedAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Try to get agent information from Claude Flow
    let agentsByProject: Map<string, number> = new Map();
    let agentErrors: Map<string, string[]> = new Map();

    try {
      const agents = await agentService.list({});

      // Group agents by project
      for (const agent of agents) {
        if (agent.projectId) {
          const current = agentsByProject.get(agent.projectId) || 0;
          agentsByProject.set(agent.projectId, current + 1);

          // Track errors
          if (agent.status === 'error' || agent.status === 'blocked') {
            const errors = agentErrors.get(agent.projectId) || [];
            errors.push(`Agent ${agent.name} is ${agent.status}`);
            agentErrors.set(agent.projectId, errors);
          }
        }
      }
    } catch {
      // If Claude Flow is not available, continue with zero agents
      console.warn('Could not fetch agent data from Claude Flow');
    }

    // Build project health data
    const projectsWithHealth: ProjectWithHealth[] = projects.map((project) => {
      const activeAgents = agentsByProject.get(project.id) || 0;
      const errors = agentErrors.get(project.id) || [];
      const completedTickets = project.tickets.filter(t => t.status === 'DONE').length;

      // Determine last activity
      const lastTicketUpdate = project.tickets[0]?.updatedAt;
      const lastActivityAt = lastTicketUpdate || project.updatedAt;

      // Calculate health status
      let healthStatus: HealthStatus = 'unknown';
      let healthMessage: string | undefined;

      if (errors.length > 0) {
        healthStatus = 'unhealthy';
        healthMessage = errors.join('; ');
      } else if (activeAgents > 0) {
        healthStatus = 'healthy';
      } else {
        // Check if project has recent activity (last 24 hours)
        const hoursSinceActivity = lastActivityAt
          ? (Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60)
          : Infinity;

        if (hoursSinceActivity < 24) {
          healthStatus = 'healthy';
        } else if (hoursSinceActivity < 168) {
          // 7 days
          healthStatus = 'degraded';
          healthMessage = 'No activity in over 24 hours';
        } else {
          healthStatus = 'unknown';
          healthMessage = 'No recent activity';
        }
      }

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        ticketCount: project._count.tickets,
        completedTickets,
        memberCount: project._count.members,
        activeAgents,
        patternCount: 0, // Would be populated from Claude Flow memory
        isArchived: project.isArchived,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        lastActivityAt,
        healthStatus,
        healthMessage
      };
    });

    // Calculate aggregate statistics
    const aggregateStats: AggregateStats = {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => !p.isArchived).length,
      archivedProjects: projects.filter(p => p.isArchived).length,
      totalAgents: Array.from(agentsByProject.values()).reduce((a, b) => a + b, 0),
      totalTickets: projectsWithHealth.reduce((sum, p) => sum + p.ticketCount, 0),
      completedTickets: projectsWithHealth.reduce((sum, p) => sum + p.completedTickets, 0),
      healthyProjects: projectsWithHealth.filter(p => p.healthStatus === 'healthy').length,
      degradedProjects: projectsWithHealth.filter(p => p.healthStatus === 'degraded').length,
      unhealthyProjects: projectsWithHealth.filter(p => p.healthStatus === 'unhealthy').length,
      completionRate: 0
    };

    // Calculate completion rate
    if (aggregateStats.totalTickets > 0) {
      aggregateStats.completionRate = Math.round(
        (aggregateStats.completedTickets / aggregateStats.totalTickets) * 100
      );
    }

    const response: ProjectHealthResponse = {
      projects: projectsWithHealth,
      aggregateStats,
      timestamp: new Date().toISOString()
    };

    return json(response);
  } catch (error) {
    console.error('Error fetching project health:', error);
    return json(
      {
        error: 'Failed to fetch project health data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};
