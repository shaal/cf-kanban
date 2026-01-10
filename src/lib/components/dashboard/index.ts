/**
 * GAP-3.1.4: Dashboard Components
 *
 * Multi-project dashboard statistics and health visualization components.
 */

export { default as ProjectHealthIndicator } from './ProjectHealthIndicator.svelte';
export { default as ProjectStatsCard } from './ProjectStatsCard.svelte';
export { default as MultiProjectDashboard } from './MultiProjectDashboard.svelte';

// Re-export types from the types file
export type {
  HealthStatus,
  ProjectWithHealth,
  AggregateStats,
  ProjectHealthResponse,
  ProjectHealthDetails,
  AgentHealthDetail
} from '$lib/types/dashboard';
