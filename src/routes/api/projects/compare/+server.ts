/**
 * GAP-UX.3: Project Comparison API Endpoint
 *
 * Fetches comparison data for multiple projects including:
 * - Extended project metrics (velocity, cycle time)
 * - Pattern similarities between projects
 * - Activity timeline data
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { agentService } from '$lib/server/claude-flow/agents';
import type {
  ProjectComparisonData,
  PatternDomainCount,
  ActivityPoint,
  ProjectTrends,
  TrendDirection,
  PatternSimilarityResult,
  TimelineComparisonData,
  ProjectComparisonResponse
} from '$lib/types/project-comparison';
import { getProjectColor, calculateTrend } from '$lib/types/project-comparison';
import type { HealthStatus } from '$lib/types/dashboard';
import type { PatternDomain } from '$lib/types/patterns';

/**
 * GET /api/projects/compare
 *
 * Query params:
 * - ids: Comma-separated list of project IDs to compare
 * - days: Number of days for activity timeline (default: 14)
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    const idsParam = url.searchParams.get('ids');
    const daysParam = url.searchParams.get('days');

    if (!idsParam) {
      return json({ error: 'Missing ids parameter' }, { status: 400 });
    }

    const projectIds = idsParam.split(',').filter(Boolean);
    const days = Math.min(parseInt(daysParam || '14', 10), 90);

    if (projectIds.length === 0) {
      return json({ error: 'No valid project IDs provided' }, { status: 400 });
    }

    if (projectIds.length > 8) {
      return json({ error: 'Maximum 8 projects can be compared at once' }, { status: 400 });
    }

    // Fetch projects with their statistics
    const projects = await prisma.project.findMany({
      where: {
        id: { in: projectIds }
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
      }
    });

    // Calculate date range for activity timeline
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

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

    // Process projects into comparison data
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

      // Calculate average cycle time (mock - would need actual start/end tracking)
      const avgCycleTime = calculateAverageCycleTime(tickets);

      // Calculate trends (comparing current week to previous week)
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

      // Generate pattern domains (mock data - would come from Claude Flow memory)
      const patternDomains = generateMockPatternDomains(project.id);

      // Generate recent activity
      const recentActivity = generateActivityTimeline(tickets, startDate, endDate);

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
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        lastActivityAt,
        healthStatus,
        velocity,
        avgCycleTime,
        patternDomains,
        recentActivity,
        trends
      };
    });

    // Calculate pattern similarities between projects
    const patternSimilarities = calculatePatternSimilarities(comparisonProjects);

    // Build timeline comparison data
    const timeline: TimelineComparisonData = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      projects: comparisonProjects.map((project, i) => ({
        projectId: project.id,
        projectName: project.name,
        color: getProjectColor(i),
        dataPoints: project.recentActivity
      }))
    };

    const response: ProjectComparisonResponse = {
      projects: comparisonProjects,
      comparisons: [],
      patternSimilarities,
      timeline,
      timestamp: new Date().toISOString()
    };

    return json(response);
  } catch (error) {
    console.error('Error fetching project comparison data:', error);
    return json(
      {
        error: 'Failed to fetch project comparison data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};

/**
 * Calculate average cycle time from tickets
 */
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

/**
 * Generate mock pattern domains (in production, this would come from Claude Flow memory)
 */
function generateMockPatternDomains(projectId: string): PatternDomainCount[] {
  // Generate consistent domains based on project ID hash
  const hash = projectId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const domains: PatternDomain[] = ['api', 'testing', 'database', 'ui', 'security', 'devops'];

  return domains
    .filter((_, i) => (hash + i) % 3 !== 0)
    .map(domain => ({
      domain,
      count: ((hash + domain.charCodeAt(0)) % 10) + 1
    }));
}

/**
 * Generate activity timeline data
 */
function generateActivityTimeline(
  tickets: { id: string; status: string; createdAt: Date; updatedAt: Date }[],
  startDate: Date,
  endDate: Date
): ActivityPoint[] {
  const points: ActivityPoint[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayStart = new Date(current);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(current);
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
      date: current.toISOString().split('T')[0],
      ticketsCreated,
      ticketsCompleted,
      activeAgents: Math.floor(Math.random() * 3) // Mock - would come from agent history
    });

    current.setDate(current.getDate() + 1);
  }

  return points;
}

/**
 * Determine project health status
 */
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

/**
 * Calculate pattern similarities between all project pairs
 */
function calculatePatternSimilarities(
  projects: ProjectComparisonData[]
): PatternSimilarityResult[] {
  const results: PatternSimilarityResult[] = [];

  for (let i = 0; i < projects.length; i++) {
    for (let j = i + 1; j < projects.length; j++) {
      const projectA = projects[i];
      const projectB = projects[j];

      const domainsA = new Set(projectA.patternDomains.map(d => d.domain));
      const domainsB = new Set(projectB.patternDomains.map(d => d.domain));

      const shared: PatternDomain[] = [];
      const uniqueToA: PatternDomain[] = [];
      const uniqueToB: PatternDomain[] = [];

      domainsA.forEach(d => {
        if (domainsB.has(d)) {
          shared.push(d);
        } else {
          uniqueToA.push(d);
        }
      });

      domainsB.forEach(d => {
        if (!domainsA.has(d)) {
          uniqueToB.push(d);
        }
      });

      const totalDomains = domainsA.size + domainsB.size - shared.length;
      const similarity = totalDomains > 0
        ? Math.round((shared.length / totalDomains) * 100)
        : 0;

      results.push({
        projectAId: projectA.id,
        projectBId: projectB.id,
        similarity,
        sharedDomains: shared,
        uniqueToA,
        uniqueToB
      });
    }
  }

  return results;
}
