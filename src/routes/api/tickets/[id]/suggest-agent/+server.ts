/**
 * GAP-3.2.2: Suggested Agent Assignment API
 *
 * POST /api/tickets/:id/suggest-agent
 * Analyzes a ticket and suggests optimal agent assignments.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { ticketAnalyzer } from '$lib/server/analysis/ticket-analyzer';
import { agentRouter, AGENT_CAPABILITIES } from '$lib/server/assignment/agent-router';
import { getAgentById } from '$lib/server/agents/agent-catalog-data';
import { agentCatalogService } from '$lib/server/agents/agent-catalog-service';
import { calculateComplexity } from '$lib/server/analysis/complexity';

/**
 * Request body for suggest-agent endpoint
 */
interface SuggestAgentRequest {
	/** Maximum number of agents to suggest */
	maxAgents?: number;
	/** Include pairing suggestions */
	includePairings?: boolean;
	/** Include capability matching details */
	includeCapabilities?: boolean;
	/** Override title/description for preview suggestions */
	previewTitle?: string;
	previewDescription?: string;
}

/**
 * Agent suggestion with metadata
 */
interface AgentSuggestion {
	agentId: string;
	agentName: string;
	role: 'coordinator' | 'worker';
	priority: number;
	matchScore: number;
	matchedCapabilities: string[];
	rationale: string;
	metrics?: {
		successRate: number;
		avgCompletionTime: number;
		usageCount: number;
	};
	pairings?: {
		agentId: string;
		agentName: string;
		synergy: string;
	}[];
}

/**
 * Response structure for suggest-agent endpoint
 */
interface SuggestAgentResponse {
	ticketId: string;
	ticketType: string;
	suggestedTopology: string;
	complexity: number;
	confidence: number;
	agents: AgentSuggestion[];
	reasoning: string[];
	fromPattern: boolean;
	alternativeTopologies?: {
		topology: string;
		description: string;
		recommendedFor: string;
	}[];
	suggestedAt: string;
}

/**
 * POST /api/tickets/:id/suggest-agent
 * Get agent recommendations for a ticket
 */
export const POST: RequestHandler = async ({ params, request }) => {
	const { id } = params;

	try {
		// Get the ticket
		const ticket = await prisma.ticket.findUnique({
			where: { id }
		});

		if (!ticket) {
			throw error(404, 'Ticket not found');
		}

		// Parse request body
		let body: SuggestAgentRequest = {};
		try {
			body = await request.json();
		} catch {
			// Empty body is acceptable
		}

		const {
			maxAgents = 5,
			includePairings = true,
			includeCapabilities = true,
			previewTitle,
			previewDescription
		} = body;

		// Use preview values if provided
		const title = previewTitle || ticket.title;
		const description = previewDescription || ticket.description;

		// Analyze the ticket
		const analysis = ticketAnalyzer.analyze({
			title,
			description,
			priority: ticket.priority,
			labels: ticket.labels || []
		});

		// Get agent assignment
		const assignment = await agentRouter.assignAgents(analysis);

		// Get complexity score
		const complexityResult = await calculateComplexity(
			title,
			description,
			ticket.labels || [],
			ticket.projectId
		);

		// Fetch agent metrics
		const metricsMap = new Map<string, { successRate: number; avgCompletionTime: number; usageCount: number }>();
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

		// Build agent suggestions
		const agents: AgentSuggestion[] = assignment.agents.slice(0, maxAgents).map((agentConfig) => {
			const agentDef = getAgentById(agentConfig.type);
			const capabilities = AGENT_CAPABILITIES[agentConfig.type] || [];
			const matchedCapabilities = includeCapabilities
				? capabilities.filter((cap) =>
						analysis.keywords.some((kw) => cap.includes(kw) || kw.includes(cap))
					)
				: [];

			const suggestion: AgentSuggestion = {
				agentId: agentConfig.type,
				agentName: agentDef?.name || agentConfig.type,
				role: agentConfig.role,
				priority: agentConfig.priority,
				matchScore: agentRouter.scoreAgentMatch(agentConfig.type, analysis.keywords),
				matchedCapabilities,
				rationale: generateRationale(agentConfig.type, analysis.ticketType, matchedCapabilities)
			};

			// Add metrics if available
			const metrics = metricsMap.get(agentConfig.type);
			if (metrics) {
				suggestion.metrics = metrics;
			}

			// Add pairings if requested
			if (includePairings && agentDef?.bestPairedWith) {
				suggestion.pairings = agentDef.bestPairedWith.slice(0, 3).map((pairedId) => {
					const pairedDef = getAgentById(pairedId);
					return {
						agentId: pairedId,
						agentName: pairedDef?.name || pairedId,
						synergy: describeSynergy(agentConfig.type, pairedId)
					};
				});
			}

			return suggestion;
		});

		// Build response
		const response: SuggestAgentResponse = {
			ticketId: id,
			ticketType: analysis.ticketType,
			suggestedTopology: assignment.topology,
			complexity: complexityResult.score,
			confidence: assignment.confidence,
			agents,
			reasoning: assignment.reasoning,
			fromPattern: assignment.fromPattern,
			alternativeTopologies: [
				{
					topology: 'single',
					description: 'Single agent working independently',
					recommendedFor: 'Simple tasks with low complexity (1-3)'
				},
				{
					topology: 'mesh',
					description: 'Peer-to-peer collaboration between agents',
					recommendedFor: 'Collaborative work with 2-4 agents'
				},
				{
					topology: 'hierarchical',
					description: 'Coordinator-led multi-agent team',
					recommendedFor: 'Complex tasks with 4+ agents'
				}
			],
			suggestedAt: new Date().toISOString()
		};

		return json(response);
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error suggesting agents:', err);
		return json({ error: 'Failed to suggest agents' }, { status: 500 });
	}
};

/**
 * Generate rationale for agent assignment
 */
function generateRationale(
	agentType: string,
	ticketType: string,
	matchedCapabilities: string[]
): string {
	const baseRationales: Record<string, Record<string, string>> = {
		coder: {
			feature: 'Coder agent excels at implementing new features',
			bug: 'Coder agent can efficiently fix bugs and issues',
			refactor: 'Coder agent handles code refactoring tasks',
			default: 'Coder agent provides general implementation support'
		},
		tester: {
			feature: 'Tester agent ensures new features work correctly',
			bug: 'Tester agent verifies bug fixes with regression tests',
			test: 'Tester agent specializes in test creation and coverage',
			default: 'Tester agent validates code quality'
		},
		reviewer: {
			feature: 'Reviewer agent ensures code quality for new features',
			bug: 'Reviewer agent checks bug fix implementations',
			refactor: 'Reviewer agent validates refactoring quality',
			default: 'Reviewer agent provides code quality oversight'
		},
		architect: {
			feature: 'Architect agent designs scalable feature architecture',
			refactor: 'Architect agent guides structural improvements',
			default: 'Architect agent provides design guidance'
		},
		'security-auditor': {
			feature: 'Security auditor ensures secure implementation',
			bug: 'Security auditor checks for security regressions',
			default: 'Security auditor validates security posture'
		}
	};

	const agentRationales = baseRationales[agentType] || {};
	let rationale = agentRationales[ticketType] || agentRationales['default'] ||
		`${agentType} agent assigned based on ticket requirements`;

	if (matchedCapabilities.length > 0) {
		rationale += `. Matched capabilities: ${matchedCapabilities.join(', ')}`;
	}

	return rationale;
}

/**
 * Describe synergy between two agents
 */
function describeSynergy(agentType: string, pairedType: string): string {
	const synergies: Record<string, Record<string, string>> = {
		coder: {
			tester: 'Coder implements while tester validates',
			reviewer: 'Coder implements while reviewer ensures quality',
			architect: 'Architect designs, coder implements'
		},
		tester: {
			coder: 'Tests guide implementation through TDD',
			reviewer: 'Tester and reviewer ensure comprehensive quality'
		},
		reviewer: {
			coder: 'Review feedback improves code quality',
			'security-auditor': 'Combined security and quality review'
		},
		architect: {
			coder: 'Architecture guides implementation',
			'security-architect': 'Comprehensive security and system design'
		}
	};

	return (
		synergies[agentType]?.[pairedType] ||
		synergies[pairedType]?.[agentType] ||
		'Complementary skills for comprehensive coverage'
	);
}
