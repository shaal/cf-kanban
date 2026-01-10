/**
 * GAP-8.5: Contextual Suggestions API
 *
 * POST /api/tickets/suggestions
 * Provides contextual suggestions when creating tickets:
 * - Suggested agents based on ticket content
 * - Topology recommendation
 * - Similar past tickets with success rates
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ticketAnalyzer } from '$lib/server/analysis/ticket-analyzer';
import { agentRouter, AGENT_CAPABILITIES } from '$lib/server/assignment/agent-router';
import { topologySelector, TOPOLOGY_INFO } from '$lib/server/assignment/topology-selector';
import { patternMatcher } from '$lib/server/assignment/pattern-matcher';
import { getAgentById } from '$lib/server/agents/agent-catalog-data';
import { prisma } from '$lib/server/prisma';

/**
 * Request body for suggestions endpoint
 */
interface SuggestionsRequest {
	title: string;
	description?: string;
	priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
	labels?: string[];
	projectId?: string;
}

/**
 * Agent suggestion with metadata
 */
interface AgentSuggestion {
	id: string;
	name: string;
	role: 'coordinator' | 'worker';
	matchScore: number;
	capabilities: string[];
	icon: string;
	description: string;
}

/**
 * Topology recommendation
 */
interface TopologyRecommendation {
	topology: string;
	name: string;
	description: string;
	bestFor: string[];
	icon: string;
	confidence: number;
	reasoning: string[];
	alternatives: {
		topology: string;
		name: string;
		description: string;
	}[];
}

/**
 * Similar past ticket with success info
 */
interface SimilarTicket {
	id: string;
	title: string;
	status: string;
	ticketType: string;
	similarity: number;
	successRate: number;
	completedAt?: string;
	agentsUsed: string[];
	topology?: string;
}

/**
 * Pattern match from learning system
 */
interface PatternMatch {
	id: string;
	keywords: string[];
	agents: string[];
	successRate: number;
	usageCount: number;
	topology?: string;
}

/**
 * Full suggestions response
 */
interface SuggestionsResponse {
	agents: AgentSuggestion[];
	topology: TopologyRecommendation;
	similarTickets: SimilarTicket[];
	patterns: PatternMatch[];
	ticketType: string;
	keywords: string[];
	confidence: number;
	suggestedLabels: string[];
}

/**
 * Agent icons mapping
 */
const AGENT_ICONS: Record<string, string> = {
	coder: 'code',
	tester: 'test-tube',
	reviewer: 'eye',
	researcher: 'search',
	architect: 'building',
	'security-auditor': 'shield',
	planner: 'calendar',
	coordinator: 'users',
	'api-docs': 'book'
};

/**
 * POST /api/tickets/suggestions
 * Get contextual suggestions for ticket creation
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body: SuggestionsRequest = await request.json();

		const { title, description, priority, labels = [], projectId } = body;

		// Require at least a title
		if (!title || title.trim().length < 3) {
			return json({
				agents: [],
				topology: null,
				similarTickets: [],
				patterns: [],
				ticketType: 'feature',
				keywords: [],
				confidence: 0,
				suggestedLabels: []
			});
		}

		// Analyze the ticket content
		const analysis = ticketAnalyzer.analyze({
			title,
			description: description || null,
			priority: priority || 'MEDIUM',
			labels
		});

		// Get agent assignment
		const assignment = await agentRouter.assignAgents(analysis);

		// Build agent suggestions
		const agents: AgentSuggestion[] = assignment.agents.slice(0, 5).map((agentConfig) => {
			const agentDef = getAgentById(agentConfig.type);
			const capabilities = AGENT_CAPABILITIES[agentConfig.type] || [];

			return {
				id: agentConfig.type,
				name: agentDef?.name || formatAgentName(agentConfig.type),
				role: agentConfig.role,
				matchScore: agentRouter.scoreAgentMatch(agentConfig.type, analysis.keywords),
				capabilities: capabilities.slice(0, 4),
				icon: AGENT_ICONS[agentConfig.type] || 'bot',
				description: agentDef?.description || `${agentConfig.type} agent for this task`
			};
		});

		// Get topology recommendation
		const topologyDecision = topologySelector.selectTopology({
			complexity: Math.min(analysis.suggestedAgents.length * 2, 10),
			agentCount: agents.length,
			hasDependencies: false,
			isSecurityRelated: analysis.keywords.some((k) =>
				['security', 'auth', 'authentication'].includes(k)
			),
			requiresConsensus: agents.length > 2,
			expectedDuration: analysis.suggestedAgents.length,
			keywords: analysis.keywords
		});

		const topologyInfo = TOPOLOGY_INFO[topologyDecision.topology] || TOPOLOGY_INFO['mesh'];
		const topologyRecommendation: TopologyRecommendation = {
			topology: topologyDecision.topology,
			name: topologyInfo.name,
			description: topologyInfo.description,
			bestFor: topologyInfo.bestFor,
			icon: topologyInfo.icon,
			confidence: topologyDecision.confidence,
			reasoning: topologyDecision.reasoning,
			alternatives: Object.entries(TOPOLOGY_INFO)
				.filter(([key]) => key !== topologyDecision.topology)
				.slice(0, 2)
				.map(([key, info]) => ({
					topology: key,
					name: info.name,
					description: info.description
				}))
		};

		// Get similar past tickets
		const similarTickets = await findSimilarTickets(
			analysis.keywords,
			analysis.ticketType,
			projectId
		);

		// Get pattern matches from learning system
		const patternResult = await patternMatcher.findMatchingPatterns(
			analysis.keywords,
			analysis.ticketType,
			{ minSimilarity: 0.4, minSuccessRate: 0.5, limit: 3 }
		);

		const patterns: PatternMatch[] = patternResult.patterns.map((p) => ({
			id: p.id,
			keywords: p.keywords.slice(0, 5),
			agents: p.agentConfig.slice(0, 4),
			successRate: p.successRate,
			usageCount: p.usageCount,
			topology: p.topology
		}));

		const response: SuggestionsResponse = {
			agents,
			topology: topologyRecommendation,
			similarTickets,
			patterns,
			ticketType: analysis.ticketType,
			keywords: analysis.keywords,
			confidence: assignment.confidence,
			suggestedLabels: analysis.suggestedLabels.slice(0, 5)
		};

		return json(response);
	} catch (err) {
		console.error('Error getting suggestions:', err);
		return json(
			{
				agents: [],
				topology: null,
				similarTickets: [],
				patterns: [],
				ticketType: 'feature',
				keywords: [],
				confidence: 0,
				suggestedLabels: []
			},
			{ status: 200 }
		); // Return empty but valid response
	}
};

/**
 * Find similar past tickets based on keywords and type
 */
async function findSimilarTickets(
	keywords: string[],
	ticketType: string,
	projectId?: string
): Promise<SimilarTicket[]> {
	try {
		// Build search conditions - look for completed tickets
		const whereConditions: Record<string, unknown> = {
			status: {
				in: ['DONE', 'REVIEW', 'CANCELLED']
			}
		};

		if (projectId) {
			whereConditions.projectId = projectId;
		}

		// Get completed tickets that might be similar
		const completedTickets = await prisma.ticket.findMany({
			where: whereConditions,
			orderBy: { updatedAt: 'desc' },
			take: 50,
			select: {
				id: true,
				title: true,
				description: true,
				status: true,
				labels: true,
				updatedAt: true,
				complexity: true
			}
		});

		// Score and filter similar tickets
		const scored = completedTickets
			.map((ticket) => {
				const ticketText = `${ticket.title} ${ticket.description || ''}`.toLowerCase();
				const ticketLabels = ticket.labels || [];

				// Calculate similarity based on keyword overlap
				let matchCount = 0;
				for (const keyword of keywords) {
					if (ticketText.includes(keyword.toLowerCase())) {
						matchCount++;
					}
				}

				// Also check labels
				for (const label of ticketLabels) {
					if (keywords.some((k) => k.toLowerCase() === label.toLowerCase())) {
						matchCount += 0.5;
					}
				}

				const similarity = keywords.length > 0 ? matchCount / keywords.length : 0;

				// Determine ticket type from labels
				const inferredType = ticketLabels.includes('bug')
					? 'bug'
					: ticketLabels.includes('feature')
						? 'feature'
						: ticketLabels.includes('refactor')
							? 'refactor'
							: ticketLabels.includes('docs')
								? 'docs'
								: 'feature';

				// Infer success based on status (DONE = success, CANCELLED = failure)
				const successRate = ticket.status === 'DONE' ? 0.85 : 0.4;

				// Infer topology from complexity
				const complexity = ticket.complexity || 3;
				const topology =
					complexity <= 2 ? 'single' : complexity <= 5 ? 'mesh' : 'hierarchical';

				// Infer agents from labels and type
				const agentsUsed = inferAgentsFromLabels(ticketLabels, inferredType);

				// Boost similarity if types match
				const typeBoost = inferredType === ticketType ? 0.2 : 0;

				return {
					id: ticket.id,
					title: ticket.title,
					status: ticket.status,
					ticketType: inferredType,
					similarity: Math.min(similarity + typeBoost, 1),
					successRate,
					completedAt: ticket.updatedAt.toISOString(),
					agentsUsed,
					topology
				};
			})
			.filter((t) => t.similarity > 0.3) // Only include tickets with some similarity
			.sort((a, b) => b.similarity - a.similarity)
			.slice(0, 5);

		return scored;
	} catch {
		return [];
	}
}

/**
 * Infer agents that would be used based on labels and type
 */
function inferAgentsFromLabels(labels: string[], ticketType: string): string[] {
	const agents: string[] = [];

	// Base agents by type
	if (ticketType === 'bug') {
		agents.push('researcher', 'coder', 'tester');
	} else if (ticketType === 'feature') {
		agents.push('planner', 'coder', 'tester', 'reviewer');
	} else if (ticketType === 'refactor') {
		agents.push('architect', 'coder', 'reviewer');
	} else if (ticketType === 'docs') {
		agents.push('researcher', 'api-docs');
	}

	// Add security agent if security labels present
	const securityLabels = ['security', 'auth', 'authentication'];
	if (labels.some((l) => securityLabels.includes(l.toLowerCase()))) {
		agents.push('security-auditor');
	}

	return [...new Set(agents)]; // Remove duplicates
}

/**
 * Format agent type to display name
 */
function formatAgentName(type: string): string {
	return type
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}
