/**
 * GAP-3.2.2: Agent Capabilities API
 *
 * GET /api/agents/capabilities
 * Lists all available agents and their capabilities.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AGENT_CATALOG, getCategoryStats, searchAgents } from '$lib/server/agents/agent-catalog-data';
import { agentCatalogService } from '$lib/server/agents/agent-catalog-service';
import { CATEGORY_CONFIG } from '$lib/types/agents';
import { AGENT_CAPABILITIES } from '$lib/server/assignment/agent-router';

/**
 * Agent capability summary
 */
interface AgentCapability {
	id: string;
	name: string;
	category: string;
	categoryLabel: string;
	description: string;
	complexity: string;
	capabilities: string[];
	routingCapabilities: string[];
	bestPairedWith: string[];
	useCases: string[];
	icon: string;
	keywords: string[];
	metrics?: {
		successRate: number;
		avgCompletionTime: number;
		usageCount: number;
	};
}

/**
 * Category summary
 */
interface CategorySummary {
	category: string;
	label: string;
	description: string;
	color: string;
	agentCount: number;
}

/**
 * Response structure for capabilities endpoint
 */
interface CapabilitiesResponse {
	/** Total number of available agents */
	totalAgents: number;
	/** Agent capabilities list */
	agents: AgentCapability[];
	/** Category breakdown */
	categories: CategorySummary[];
	/** Capability keywords for search */
	allCapabilities: string[];
	/** Common agent pairings with descriptions */
	commonPairings: {
		agents: string[];
		description: string;
		useCases: string[];
	}[];
	/** Topology recommendations */
	topologyGuide: {
		topology: string;
		agentCount: string;
		description: string;
		bestFor: string[];
	}[];
	/** Generated timestamp */
	generatedAt: string;
}

/**
 * GET /api/agents/capabilities
 * List all agents and their capabilities
 */
export const GET: RequestHandler = async ({ url }) => {
	const category = url.searchParams.get('category');
	const search = url.searchParams.get('search');
	const complexity = url.searchParams.get('complexity');
	const includeMetrics = url.searchParams.get('includeMetrics') !== 'false';

	try {
		// Get agents, optionally filtered
		let agents = AGENT_CATALOG;

		if (category) {
			agents = agents.filter((a) => a.category === category);
		}

		if (search) {
			agents = searchAgents(search);
		}

		if (complexity) {
			agents = agents.filter((a) => a.complexity === complexity);
		}

		// Get metrics if requested
		let metricsMap = new Map<
			string,
			{ successRate: number; avgCompletionTime: number; usageCount: number }
		>();

		if (includeMetrics) {
			try {
				const catalog = await agentCatalogService.getCatalog();
				for (const agent of catalog) {
					if (agent.metrics) {
						metricsMap.set(agent.id, {
							successRate: agent.metrics.successRate,
							avgCompletionTime: agent.metrics.avgCompletionTime,
							usageCount: agent.metrics.usageCount
						});
					}
				}
			} catch {
				// Metrics not available
			}
		}

		// Build agent capabilities list
		const agentCapabilities: AgentCapability[] = agents.map((agent) => {
			const categoryConfig = CATEGORY_CONFIG[agent.category];
			const routingCapabilities = AGENT_CAPABILITIES[agent.id as keyof typeof AGENT_CAPABILITIES] || [];

			const capability: AgentCapability = {
				id: agent.id,
				name: agent.name,
				category: agent.category,
				categoryLabel: categoryConfig?.label || agent.category,
				description: agent.description,
				complexity: agent.complexity,
				capabilities: agent.capabilities,
				routingCapabilities,
				bestPairedWith: agent.bestPairedWith,
				useCases: agent.useCases,
				icon: agent.icon,
				keywords: agent.keywords || []
			};

			if (includeMetrics) {
				const metrics = metricsMap.get(agent.id);
				if (metrics) {
					capability.metrics = metrics;
				}
			}

			return capability;
		});

		// Build category summaries
		const categoryStats = getCategoryStats();
		const categories: CategorySummary[] = Object.entries(CATEGORY_CONFIG).map(
			([cat, config]) => ({
				category: cat,
				label: config.label,
				description: config.description,
				color: config.color,
				agentCount: categoryStats[cat] || 0
			})
		);

		// Collect all unique capabilities
		const allCapabilities = [
			...new Set(
				AGENT_CATALOG.flatMap((a) => [
					...a.capabilities,
					...(AGENT_CAPABILITIES[a.id as keyof typeof AGENT_CAPABILITIES] || [])
				])
			)
		].sort();

		// Common agent pairings
		const commonPairings = [
			{
				agents: ['coder', 'tester', 'reviewer'],
				description: 'Standard development workflow',
				useCases: ['Feature implementation', 'Bug fixes', 'Code changes']
			},
			{
				agents: ['researcher', 'architect', 'coder'],
				description: 'Design-first development',
				useCases: ['New features', 'System design', 'Major refactoring']
			},
			{
				agents: ['security-architect', 'security-auditor', 'coder'],
				description: 'Security-focused development',
				useCases: ['Auth systems', 'Security features', 'Vulnerability fixes']
			},
			{
				agents: ['planner', 'coordinator', 'coder', 'tester'],
				description: 'Managed complex tasks',
				useCases: ['Large features', 'Multi-phase work', 'Team coordination']
			},
			{
				agents: ['performance-engineer', 'coder', 'perf-analyzer'],
				description: 'Performance optimization',
				useCases: ['Performance tuning', 'Bottleneck fixes', 'Optimization']
			}
		];

		// Topology guide
		const topologyGuide = [
			{
				topology: 'single',
				agentCount: '1',
				description: 'Single agent working independently',
				bestFor: ['Simple bug fixes', 'Documentation updates', 'Small refactors', 'Low complexity tasks (1-3)']
			},
			{
				topology: 'mesh',
				agentCount: '2-4',
				description: 'Peer-to-peer collaboration with equal agents',
				bestFor: ['Feature development', 'Code review cycles', 'Collaborative debugging', 'Medium complexity (4-6)']
			},
			{
				topology: 'hierarchical',
				agentCount: '4+',
				description: 'Coordinator-led team with task delegation',
				bestFor: ['Complex features', 'Multi-file changes', 'Cross-cutting concerns', 'High complexity (7-10)']
			},
			{
				topology: 'hierarchical-mesh',
				agentCount: '5+',
				description: 'Hybrid with coordinator and peer collaboration',
				bestFor: ['Large-scale refactoring', 'System redesign', 'Security-critical work']
			}
		];

		const response: CapabilitiesResponse = {
			totalAgents: agents.length,
			agents: agentCapabilities,
			categories,
			allCapabilities,
			commonPairings,
			topologyGuide,
			generatedAt: new Date().toISOString()
		};

		return json(response);
	} catch (err) {
		console.error('Error getting agent capabilities:', err);
		return json({ error: 'Failed to get agent capabilities' }, { status: 500 });
	}
};
