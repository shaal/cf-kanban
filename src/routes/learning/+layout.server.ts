/**
 * GAP-8.4: Learning Layout Server
 *
 * Provides capability counts for the sidebar tree including
 * agents by category, hooks by category, and workers by priority.
 */

import type { LayoutServerLoad } from './$types';
import { AGENT_CATALOG, getCategoryStats } from '$lib/server/agents/agent-catalog-data';
import { HOOKS_CATALOG, getHookCategoryCounts } from '$lib/server/capabilities/hooks-data';
import { WORKERS_CATALOG, getWorkerPriorityCounts } from '$lib/server/capabilities/workers-data';

export const load: LayoutServerLoad = async () => {
	// Get agent counts by category
	const agentCounts = getCategoryStats();

	// Get hook counts by category
	const hookCounts = getHookCategoryCounts();

	// Get worker counts by priority
	const workerCounts = getWorkerPriorityCounts();

	return {
		// Agent data
		agentCounts,
		totalAgents: AGENT_CATALOG.length,

		// Hook data
		hookCounts,
		totalHooks: HOOKS_CATALOG.length,

		// Worker data
		workerCounts,
		totalWorkers: WORKERS_CATALOG.length
	};
};
