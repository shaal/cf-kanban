/**
 * Agent Catalog Page Server
 * GAP-3.3.1: Visual Agent Catalog
 * GAP-3.3.4: Agent Success Metrics
 */

import type { PageServerLoad } from './$types';
import { agentCatalogService, type AgentCatalogPageData } from '$lib/server/agents';
import { initializeMockMetrics } from '$lib/stores/agent-metrics';

export const load: PageServerLoad = async (): Promise<AgentCatalogPageData> => {
	// Initialize mock metrics data for SSR (GAP-3.3.4)
	initializeMockMetrics();

	return await agentCatalogService.getPageData();
};
