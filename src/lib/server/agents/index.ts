/**
 * Agent Catalog Server Module
 * GAP-3.3.1: Visual Agent Catalog
 */

// Service
export { AgentCatalogService, agentCatalogService, type AgentCatalogPageData } from './agent-catalog-service';

// Data
export {
	AGENT_CATALOG,
	getAgentById,
	getAgentsByCategory,
	searchAgents,
	getCategoryStats
} from './agent-catalog-data';
