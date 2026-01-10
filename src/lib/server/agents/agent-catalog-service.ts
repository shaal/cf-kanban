/**
 * Agent Catalog Service
 * GAP-3.3.1: Visual Agent Catalog
 *
 * Provides catalog data with optional runtime metrics from Claude Flow CLI.
 * Falls back to mock data when CLI is unavailable.
 */

import { claudeFlowCLI } from '$lib/server/claude-flow';
import {
	AGENT_CATALOG,
	getAgentById,
	getAgentsByCategory,
	searchAgents,
	getCategoryStats
} from './agent-catalog-data';
import type {
	AgentTypeDefinition,
	AgentMetrics,
	AgentCatalogEntry,
	AgentCategory,
	CategoryConfig
} from '$lib/types/agents';
import { CATEGORY_CONFIG, getCategoryList } from '$lib/types/agents';

/**
 * Page data returned by the service
 */
export interface AgentCatalogPageData {
	/** All agents with optional metrics */
	agents: AgentCatalogEntry[];
	/** Category breakdown with counts */
	categories: (CategoryConfig & { count: number })[];
	/** Total number of agents */
	totalAgents: number;
	/** Average success rate across all agents */
	avgSuccessRate: number;
	/** Top agents by success rate */
	topAgents: AgentCatalogEntry[];
	/** Recently used agents */
	recentlyUsed: AgentCatalogEntry[];
}

/**
 * Agent Catalog Service class
 */
export class AgentCatalogService {
	/**
	 * Get the full catalog with metrics
	 */
	async getCatalog(): Promise<AgentCatalogEntry[]> {
		const metrics = await this.getMetrics();
		const metricsMap = new Map(metrics.map(m => [m.agentTypeId, m]));

		return AGENT_CATALOG.map(agent => ({
			...agent,
			metrics: metricsMap.get(agent.id)
		}));
	}

	/**
	 * Get page data for the catalog view
	 */
	async getPageData(): Promise<AgentCatalogPageData> {
		const agents = await this.getCatalog();
		const categoryStats = getCategoryStats();

		// Build category list with counts
		const categories = getCategoryList().map(cat => ({
			...cat,
			count: categoryStats[cat.category] || 0
		}));

		// Calculate average success rate
		const agentsWithMetrics = agents.filter(a => a.metrics?.successRate !== undefined);
		const avgSuccessRate =
			agentsWithMetrics.length > 0
				? agentsWithMetrics.reduce((sum, a) => sum + (a.metrics?.successRate || 0), 0) /
					agentsWithMetrics.length
				: 85; // Default to 85% if no metrics

		// Get top agents by success rate
		const topAgents = [...agents]
			.filter(a => a.metrics?.successRate !== undefined)
			.sort((a, b) => (b.metrics?.successRate || 0) - (a.metrics?.successRate || 0))
			.slice(0, 5);

		// Get recently used agents
		const recentlyUsed = [...agents]
			.filter(a => a.metrics?.lastUsed !== undefined)
			.sort(
				(a, b) =>
					new Date(b.metrics?.lastUsed || 0).getTime() -
					new Date(a.metrics?.lastUsed || 0).getTime()
			)
			.slice(0, 5);

		return {
			agents,
			categories,
			totalAgents: agents.length,
			avgSuccessRate: Math.round(avgSuccessRate),
			topAgents: topAgents.length > 0 ? topAgents : agents.slice(0, 5),
			recentlyUsed: recentlyUsed.length > 0 ? recentlyUsed : agents.slice(0, 5)
		};
	}

	/**
	 * Get runtime metrics from Claude Flow CLI or mock data
	 */
	async getMetrics(): Promise<AgentMetrics[]> {
		try {
			// Try to get metrics from Claude Flow hooks
			const result = await claudeFlowCLI.executeJson<{ metrics: AgentMetrics[] }>('hooks', [
				'metrics',
				'--period',
				'30d'
			]);
			return result.metrics || [];
		} catch {
			// Fallback to mock metrics
			return this.getMockMetrics();
		}
	}

	/**
	 * Get a single agent by ID with metrics
	 */
	async getAgentById(id: string): Promise<AgentCatalogEntry | null> {
		const agent = getAgentById(id);
		if (!agent) return null;

		const metrics = await this.getMetrics();
		const agentMetrics = metrics.find(m => m.agentTypeId === id);

		return {
			...agent,
			metrics: agentMetrics
		};
	}

	/**
	 * Get agents by category with metrics
	 */
	async getAgentsByCategory(category: AgentCategory): Promise<AgentCatalogEntry[]> {
		const agents = getAgentsByCategory(category);
		const metrics = await this.getMetrics();
		const metricsMap = new Map(metrics.map(m => [m.agentTypeId, m]));

		return agents.map(agent => ({
			...agent,
			metrics: metricsMap.get(agent.id)
		}));
	}

	/**
	 * Search agents with metrics
	 */
	async searchAgents(query: string): Promise<AgentCatalogEntry[]> {
		const agents = searchAgents(query);
		const metrics = await this.getMetrics();
		const metricsMap = new Map(metrics.map(m => [m.agentTypeId, m]));

		return agents.map(agent => ({
			...agent,
			metrics: metricsMap.get(agent.id)
		}));
	}

	/**
	 * Get pairing suggestions for an agent
	 */
	async getPairingSuggestions(agentId: string): Promise<AgentCatalogEntry[]> {
		const agent = getAgentById(agentId);
		if (!agent) return [];

		const pairings = agent.bestPairedWith
			.map(id => getAgentById(id))
			.filter((a): a is AgentTypeDefinition => a !== undefined);

		const metrics = await this.getMetrics();
		const metricsMap = new Map(metrics.map(m => [m.agentTypeId, m]));

		return pairings.map(a => ({
			...a,
			metrics: metricsMap.get(a.id)
		}));
	}

	/**
	 * Generate mock metrics for development/demo
	 */
	private getMockMetrics(): AgentMetrics[] {
		// Generate realistic mock data for each agent
		return AGENT_CATALOG.map(agent => {
			// Vary success rate by complexity
			const baseSuccessRate =
				agent.complexity === 'basic' ? 92 : agent.complexity === 'intermediate' ? 87 : 82;

			// Add some randomness
			const variance = Math.random() * 10 - 5;
			const successRate = Math.max(60, Math.min(99, baseSuccessRate + variance));

			// Usage varies by category
			const categoryMultiplier =
				agent.category === 'core-development'
					? 5
					: agent.category === 'v3-specialized'
						? 2
						: 1;
			const usageCount = Math.floor(Math.random() * 100 * categoryMultiplier) + 10;

			// Completion time varies by complexity
			const baseTime =
				agent.complexity === 'basic' ? 30000 : agent.complexity === 'intermediate' ? 60000 : 120000;
			const avgCompletionTime = baseTime + Math.floor(Math.random() * baseTime * 0.5);

			// Recent usage for some agents
			const daysSinceLastUse = Math.floor(Math.random() * 14);
			const lastUsed = new Date(Date.now() - daysSinceLastUse * 24 * 60 * 60 * 1000);

			return {
				agentTypeId: agent.id,
				tasksCompleted: Math.floor(usageCount * (successRate / 100)),
				successRate: Math.round(successRate),
				avgCompletionTime,
				usageCount,
				lastUsed: daysSinceLastUse < 7 ? lastUsed : undefined
			};
		});
	}
}

/**
 * Singleton instance
 */
export const agentCatalogService = new AgentCatalogService();
