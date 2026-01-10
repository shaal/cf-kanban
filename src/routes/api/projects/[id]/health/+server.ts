/**
 * GAP-3.1.4: Single Project Health API Endpoint
 *
 * Fetches detailed health status for a specific project,
 * including individual agent health information.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { agentService } from '$lib/server/claude-flow/agents';
import type {
  ProjectHealthDetails,
  AgentHealthDetail,
  HealthStatus
} from '$lib/types/dashboard';

/**
 * GET /api/projects/[id]/health
 *
 * Returns detailed health status for a specific project
 */
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tickets: {
          select: { updatedAt: true },
          orderBy: { updatedAt: 'desc' },
          take: 1
        }
      }
    });

    if (!project) {
      throw error(404, 'Project not found');
    }

    // Fetch agent information from Claude Flow
    const agentDetails: AgentHealthDetail[] = [];
    const issues: string[] = [];
    let activeAgentCount = 0;

    try {
      const agents = await agentService.list({});

      // Filter agents for this project
      const projectAgents = agents.filter(a => a.projectId === id);

      for (const agent of projectAgents) {
        // Get agent health
        const health = await agentService.checkHealth(agent.id);

        agentDetails.push({
          id: agent.id,
          type: agent.type,
          name: agent.name,
          status: agent.status,
          lastActivity: agent.createdAt, // Would use actual last activity if available
          health: health.score
        });

        // Count active agents
        if (agent.status === 'idle' || agent.status === 'working') {
          activeAgentCount++;
        }

        // Track issues
        if (agent.status === 'error') {
          issues.push(`Agent ${agent.name} is in error state`);
        } else if (agent.status === 'blocked') {
          issues.push(`Agent ${agent.name} is blocked`);
        }

        if (!health.healthy) {
          issues.push(...health.issues.map(i => `${agent.name}: ${i}`));
        }
      }
    } catch (err) {
      console.warn('Could not fetch agent data from Claude Flow:', err);
      issues.push('Unable to connect to Claude Flow for agent status');
    }

    // Determine overall health status
    let status: HealthStatus = 'unknown';
    const errorAgents = agentDetails.filter(a => a.status === 'error').length;
    const blockedAgents = agentDetails.filter(a => a.status === 'blocked').length;

    if (issues.includes('Unable to connect to Claude Flow for agent status')) {
      status = 'unknown';
    } else if (errorAgents > 0) {
      status = 'unhealthy';
    } else if (blockedAgents > 0) {
      status = 'degraded';
    } else if (activeAgentCount > 0 || agentDetails.length === 0) {
      // Healthy if agents are active, or if there are no agents configured
      const lastActivity = project.tickets[0]?.updatedAt || project.updatedAt;
      const hoursSinceActivity = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60);

      if (hoursSinceActivity < 24) {
        status = 'healthy';
      } else if (hoursSinceActivity < 168) {
        status = 'degraded';
        if (!issues.includes('No activity in over 24 hours')) {
          issues.push('No activity in over 24 hours');
        }
      } else {
        status = 'unknown';
      }
    } else {
      status = 'degraded';
    }

    const lastActivityAt = project.tickets[0]?.updatedAt || project.updatedAt;

    const response: ProjectHealthDetails = {
      projectId: id,
      status,
      activeAgents: activeAgentCount,
      agentDetails,
      lastActivityAt,
      issues,
      checkedAt: new Date().toISOString()
    };

    return json(response);
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error fetching project health:', err);
    return json(
      {
        error: 'Failed to fetch project health data',
        message: err instanceof Error ? err.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};
