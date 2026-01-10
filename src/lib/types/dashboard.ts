/**
 * GAP-3.1.4: Dashboard Types
 *
 * Type definitions for multi-project dashboard statistics
 * and health visualization.
 */

/**
 * Health status for a project's Claude Code instances
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/**
 * Project with health and statistics data
 */
export interface ProjectWithHealth {
  id: string;
  name: string;
  description: string | null;
  ticketCount: number;
  completedTickets: number;
  memberCount: number;
  activeAgents: number;
  patternCount: number;
  isArchived: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  lastActivityAt: Date | string | null;
  healthStatus: HealthStatus;
  healthMessage?: string;
}

/**
 * Aggregate statistics across all projects
 */
export interface AggregateStats {
  totalProjects: number;
  activeProjects: number;
  archivedProjects: number;
  totalAgents: number;
  totalTickets: number;
  completedTickets: number;
  healthyProjects: number;
  degradedProjects: number;
  unhealthyProjects: number;
  completionRate: number;
}

/**
 * Response from project health API
 */
export interface ProjectHealthResponse {
  projects: ProjectWithHealth[];
  aggregateStats: AggregateStats;
  timestamp: string;
}

/**
 * Health check details for a single project
 */
export interface ProjectHealthDetails {
  projectId: string;
  status: HealthStatus;
  activeAgents: number;
  agentDetails: AgentHealthDetail[];
  lastActivityAt: Date | string | null;
  issues: string[];
  checkedAt: string;
}

/**
 * Possible agent statuses (matches AgentStatus from claude-flow/agents.ts)
 */
export type AgentStatusType = 'idle' | 'working' | 'blocked' | 'stopped' | 'error' | 'initializing';

/**
 * Health details for an individual agent
 */
export interface AgentHealthDetail {
  id: string;
  type: string;
  name: string;
  status: AgentStatusType;
  lastActivity: Date | string | null;
  health: number; // 0-1 score
}

/**
 * Determine health status based on agent states
 */
export function calculateHealthStatus(
  activeAgents: number,
  errorAgents: number,
  blockedAgents: number
): HealthStatus {
  if (activeAgents === 0 && errorAgents === 0) {
    return 'unknown';
  }
  if (errorAgents > 0) {
    return 'unhealthy';
  }
  if (blockedAgents > 0) {
    return 'degraded';
  }
  return 'healthy';
}

/**
 * Get health status color class
 */
export function getHealthStatusColor(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'text-green-600';
    case 'degraded':
      return 'text-yellow-600';
    case 'unhealthy':
      return 'text-red-600';
    default:
      return 'text-gray-400';
  }
}

/**
 * Get health status background class
 */
export function getHealthStatusBgColor(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'bg-green-100';
    case 'degraded':
      return 'bg-yellow-100';
    case 'unhealthy':
      return 'bg-red-100';
    default:
      return 'bg-gray-100';
  }
}
