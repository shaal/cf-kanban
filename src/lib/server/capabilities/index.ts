/**
 * GAP-8.4: Capabilities Data Module
 *
 * Centralized exports for all capabilities data including
 * agents, hooks, and workers.
 */

export * from './hooks-data';
export * from './workers-data';

// Re-export agent catalog functions from existing module
export { AGENT_CATALOG, getAgentsByCategory, getCategoryStats } from '../agents/agent-catalog-data';
