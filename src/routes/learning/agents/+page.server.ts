/**
 * Agent Catalog Page Server
 * GAP-3.3.1: Visual Agent Catalog
 */

import type { PageServerLoad } from './$types';
import { agentCatalogService, type AgentCatalogPageData } from '$lib/server/agents';

export const load: PageServerLoad = async (): Promise<AgentCatalogPageData> => {
	return await agentCatalogService.getPageData();
};
