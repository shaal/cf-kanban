/**
 * GAP-UX.3: Project Comparison Page Server
 *
 * Server-side data loading for the project comparison view.
 * Fetches all projects and prepares initial comparison data.
 */

import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/prisma';
import { agentService } from '$lib/server/claude-flow/agents';
import type { ProjectComparisonData, ProjectTrends, TrendDirection } from '$lib/types/project-comparison';
import { calculateTrend } from '$lib/types/project-comparison';
import type { HealthStatus } from '$lib/types/dashboard';
import type { PatternDomain } from '$lib/types/patterns';

export const load: PageServerLoad = async ({ url }) => {
  // Get pre-selected project IDs from query params
  const selectedIds = url.searchParams.get('ids')?.split(',').filter(Boolean) || [];

  // Fetch all active projects
  const projects = await prisma.project.findMany({
    where: {
      isArchived: false
    },
    include: {
      _count: {
        select: { tickets: true, members: true }
      },
      tickets: {
        select: {
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  // Get agent information from Claude Flow
  let agentsByProject: Map<string, number> = new Map();
  try {
    const agents = await agentService.list({});
    for (const agent of agents) {
      if (agent.projectId) {
        const current = agentsByProject.get(agent.projectId) || 0;
        agentsByProject.set(agent.projectId, current + 1);
      }
    }
  } catch {
    console.warn('Could not fetch agent data from Claude Flow');
  }

  // Process projects into comparison data format
  const comparisonProjects: ProjectComparisonData[] = projects.map((project) => {
    const tickets = project.tickets;
    const totalTickets = project._count.tickets;
    const completedTickets = tickets.filter(t => t.status === 'DONE').length;
    const inProgressTickets = tickets.filter(t => t.status === 'IN_PROGRESS').length;
    const blockedTickets = tickets.filter(t => t.status === 'NEEDS_FEEDBACK').length;
    const activeAgents = agentsByProject.get(project.id) || 0;

    // Calculate velocity (tickets completed in last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const completedThisWeek = tickets.filter(
      t => t.status === 'DONE' && new Date(t.updatedAt) >= oneWeekAgo
    ).length;
    const velocity = completedThisWeek;

    // Calculate average cycle time
    const avgCycleTime = calculateAverageCycleTime(tickets);

    // Calculate trends
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const completedLastWeek = tickets.filter(
      t =>
        t.status === 'DONE' &&
        new Date(t.updatedAt) >= twoWeeksAgo &&
        new Date(t.updatedAt) < oneWeekAgo
    ).length;

    const trends: ProjectTrends = {
      velocityTrend: calculateTrend(completedThisWeek, completedLastWeek),
      completionTrend: calculateTrend(completedTickets, totalTickets - completedTickets),
      healthTrend: 'stable' as TrendDirection
    };

    // Generate pattern domains (mock)
    const patternDomains = generatePatternDomains(project.id);

    // Generate recent activity
    const recentActivity = generateRecentActivity(tickets);

    // Determine health status
    const healthStatus = determineHealthStatus(activeAgents, blockedTickets, project.updatedAt);

    // Get last activity
    const lastActivityAt = tickets.length > 0
      ? tickets.reduce((latest, t) =>
          new Date(t.updatedAt) > new Date(latest.updatedAt) ? t : latest
        ).updatedAt
      : project.updatedAt;

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      workspacePath: project.workspacePath,
      ticketCount: totalTickets,
      completedTickets,
      inProgressTickets,
      blockedTickets,
      memberCount: project._count.members,
      activeAgents,
      patternCount: patternDomains.reduce((sum, d) => sum + d.count, 0),
      isArchived: project.isArchived,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      lastActivityAt: lastActivityAt ? new Date(lastActivityAt).toISOString() : null,
      healthStatus,
      velocity,
      avgCycleTime,
      patternDomains,
      recentActivity,
      trends
    };
  });

  return {
    projects: comparisonProjects,
    selectedIds,
    totalProjects: projects.length
  };
};

function calculateAverageCycleTime(
  tickets: { id: string; status: string; createdAt: Date; updatedAt: Date }[]
): number {
  const completedTickets = tickets.filter(t => t.status === 'DONE');
  if (completedTickets.length === 0) return 0;

  const totalHours = completedTickets.reduce((sum, t) => {
    const created = new Date(t.createdAt).getTime();
    const updated = new Date(t.updatedAt).getTime();
    return sum + (updated - created) / (1000 * 60 * 60);
  }, 0);

  return totalHours / completedTickets.length;
}

function generatePatternDomains(projectId: string) {
  const hash = projectId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const domains: PatternDomain[] = ['api', 'testing', 'database', 'ui', 'security', 'devops'];

  return domains
    .filter((_, i) => (hash + i) % 3 !== 0)
    .map(domain => ({
      domain,
      count: ((hash + domain.charCodeAt(0)) % 10) + 1
    }));
}

function generateRecentActivity(
  tickets: { id: string; status: string; createdAt: Date; updatedAt: Date }[]
) {
  const points = [];
  const today = new Date();

  for (let i = 13; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const ticketsCreated = tickets.filter(t => {
      const created = new Date(t.createdAt);
      return created >= dayStart && created <= dayEnd;
    }).length;

    const ticketsCompleted = tickets.filter(t => {
      const updated = new Date(t.updatedAt);
      return t.status === 'DONE' && updated >= dayStart && updated <= dayEnd;
    }).length;

    points.push({
      date: date.toISOString().split('T')[0],
      ticketsCreated,
      ticketsCompleted,
      activeAgents: Math.floor(Math.random() * 3)
    });
  }

  return points;
}

function determineHealthStatus(
  activeAgents: number,
  blockedTickets: number,
  lastUpdate: Date
): HealthStatus {
  if (blockedTickets > 2) return 'unhealthy';
  if (blockedTickets > 0) return 'degraded';

  const hoursSinceUpdate = (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60);
  if (hoursSinceUpdate > 168) return 'unknown';
  if (hoursSinceUpdate > 24 && activeAgents === 0) return 'degraded';

  return 'healthy';
}
