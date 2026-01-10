/**
 * TASK-050: Agent Assignment Service
 *
 * Routes tasks to optimal agents based on ticket analysis.
 * Queries learned patterns from Claude Flow memory for improved routing.
 * Supports manual override and stores successful patterns.
 */

import { claudeFlowCLI } from '../claude-flow/cli';
import type { AnalysisResult, AgentType, Topology } from '../analysis/ticket-analyzer';

/**
 * Configuration for a single agent in an assignment
 */
export interface AgentConfig {
	/** The type of agent to spawn */
	type: AgentType;
	/** Role in the swarm topology */
	role: 'coordinator' | 'worker';
	/** Priority for task execution (higher = more important) */
	priority: number;
	/** Optional custom prompt for this agent */
	prompt?: string;
}

/**
 * Result of agent assignment for a ticket
 */
export interface AgentAssignment {
	/** List of agents to spawn */
	agents: AgentConfig[];
	/** Swarm topology to use */
	topology: Topology;
	/** Confidence score (0-1) of the assignment */
	confidence: number;
	/** Reasoning for the assignment decisions */
	reasoning: string[];
	/** Whether this came from a learned pattern */
	fromPattern: boolean;
}

/**
 * Pattern stored in memory for learning
 */
export interface StoredPattern {
	ticketType: string;
	keywords: string[];
	agents: string[];
	topology: string;
	successRate: number;
	timestamp: string;
}

/**
 * Agent capabilities by type - maps agent types to their strengths
 */
export const AGENT_CAPABILITIES: Record<AgentType, string[]> = {
	coder: ['implementation', 'coding', 'feature', 'bug-fix', 'logic'],
	tester: ['testing', 'test', 'coverage', 'qa', 'validation'],
	reviewer: ['review', 'quality', 'security', 'best-practices'],
	researcher: ['research', 'analysis', 'documentation', 'investigation'],
	architect: ['architecture', 'design', 'refactor', 'structure', 'patterns'],
	'security-auditor': ['security-audit', 'vulnerability', 'auth', 'encryption'],
	planner: ['planning', 'breakdown', 'estimation', 'task-management'],
	coordinator: ['coordination', 'complex', 'multi-agent', 'orchestration'],
	'api-docs': ['documentation', 'api', 'openapi', 'swagger', 'reference']
};

/**
 * Agent Router class - assigns agents to tickets based on analysis
 */
export class AgentRouter {
	private readonly memoryNamespace = 'agent-assignments';

	/**
	 * Assign agents to a ticket based on its analysis
	 *
	 * @param analysis - The result of ticket analysis
	 * @param manualOverride - Optional manual agent configuration
	 * @returns Assignment containing agents, topology, and reasoning
	 */
	async assignAgents(
		analysis: AnalysisResult,
		manualOverride?: Partial<AgentAssignment>
	): Promise<AgentAssignment> {
		const reasoning: string[] = [];

		// Handle manual override
		if (manualOverride?.agents && manualOverride.agents.length > 0) {
			reasoning.push('Using manual agent override');
			return {
				agents: manualOverride.agents,
				topology: manualOverride.topology ?? analysis.suggestedTopology,
				confidence: 1.0,
				reasoning,
				fromPattern: false
			};
		}

		// Try to get learned pattern first
		const learnedAssignment = await this.queryLearnedPatterns(analysis);
		if (learnedAssignment) {
			reasoning.push(
				`Using learned pattern with ${Math.round(learnedAssignment.confidence * 100)}% success rate`
			);
			return {
				...learnedAssignment,
				reasoning: [...learnedAssignment.reasoning, ...reasoning],
				fromPattern: true
			};
		}

		// Fall back to analysis-based assignment
		return this.assignFromAnalysis(analysis, reasoning);
	}

	/**
	 * Query Claude Flow memory for learned patterns
	 */
	async queryLearnedPatterns(
		analysis: AnalysisResult
	): Promise<Omit<AgentAssignment, 'fromPattern'> | null> {
		try {
			const searchQuery = `${analysis.ticketType} ${analysis.keywords.join(' ')} success`;

			const result = await claudeFlowCLI.execute('memory', [
				'search',
				'--query',
				searchQuery,
				'--namespace',
				this.memoryNamespace,
				'--limit',
				'1'
			]);

			if (result.exitCode !== 0 || !result.stdout) {
				return null;
			}

			return this.parsePatternFromMemory(result.stdout, analysis);
		} catch {
			// Pattern search failed, return null to use default assignment
			return null;
		}
	}

	/**
	 * Parse a pattern from memory search output
	 */
	private parsePatternFromMemory(
		output: string,
		analysis: AnalysisResult
	): Omit<AgentAssignment, 'fromPattern'> | null {
		try {
			// Try to parse JSON from output
			const jsonMatch = output.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				const pattern = JSON.parse(jsonMatch[0]) as StoredPattern;

				// Only use pattern if success rate is high enough
				if (pattern.successRate >= 0.7) {
					const agents: AgentConfig[] = pattern.agents.map((type, index) => ({
						type: type as AgentType,
						role: index === 0 ? 'coordinator' : 'worker',
						priority: pattern.agents.length - index
					}));

					return {
						agents,
						topology: pattern.topology as Topology,
						confidence: pattern.successRate,
						reasoning: [`Matched pattern for ${pattern.ticketType} tickets`]
					};
				}
			}

			// Try alternative text-based parsing
			const agentMatch = output.match(/agents:\s*\[(.*?)\]/i);
			const topologyMatch = output.match(/topology:\s*(\w+)/i);
			const successMatch = output.match(/success(?:Rate)?:\s*([\d.]+)/i);

			if (agentMatch && topologyMatch) {
				const agentTypes = agentMatch[1].split(',').map((s) => s.trim().replace(/['"]/g, ''));
				const successRate = successMatch ? parseFloat(successMatch[1]) : 0.5;

				if (successRate >= 0.7) {
					const agents: AgentConfig[] = agentTypes.map((type, index) => ({
						type: type as AgentType,
						role: index === 0 ? 'coordinator' : 'worker',
						priority: agentTypes.length - index
					}));

					return {
						agents,
						topology: topologyMatch[1] as Topology,
						confidence: successRate,
						reasoning: [`Matched pattern with ${agentTypes.length} agents`]
					};
				}
			}
		} catch {
			// Parsing failed
		}

		return null;
	}

	/**
	 * Create assignment from analysis when no pattern is found
	 */
	private assignFromAnalysis(analysis: AnalysisResult, reasoning: string[]): AgentAssignment {
		const agents: AgentConfig[] = [];

		reasoning.push(`Ticket type: ${analysis.ticketType}, confidence: ${analysis.confidence}`);

		// Build agent list from suggested agents
		for (let i = 0; i < analysis.suggestedAgents.length; i++) {
			const agentType = analysis.suggestedAgents[i];
			const isCoordinator = i === 0 && this.needsCoordinator(analysis);

			agents.push({
				type: agentType,
				role: isCoordinator ? 'coordinator' : 'worker',
				priority: analysis.suggestedAgents.length - i
			});

			reasoning.push(`Added ${agentType} agent as ${isCoordinator ? 'coordinator' : 'worker'}`);
		}

		// Ensure coordinator if needed but not present
		let topology = analysis.suggestedTopology;
		if (topology === 'hierarchical' && !agents.find((a) => a.role === 'coordinator')) {
			agents.unshift({
				type: 'coordinator',
				role: 'coordinator',
				priority: 100
			});
			reasoning.push('Added coordinator for hierarchical topology');
		}

		// Upgrade to hierarchical if many agents
		if (agents.length > 4 && topology !== 'hierarchical') {
			topology = 'hierarchical';
			reasoning.push('Upgraded to hierarchical topology for 4+ agents');
		}

		return {
			agents,
			topology,
			confidence: analysis.confidence * 0.8, // Slightly lower confidence without pattern
			reasoning,
			fromPattern: false
		};
	}

	/**
	 * Determine if a coordinator is needed based on analysis
	 */
	private needsCoordinator(analysis: AnalysisResult): boolean {
		// Complex tickets need coordination
		if (analysis.suggestedTopology === 'hierarchical') return true;

		// Multiple agents may benefit from coordination
		if (analysis.suggestedAgents.length >= 4) return true;

		// Security-related work benefits from oversight
		if (analysis.keywords.some((k) => ['security', 'auth', 'authentication'].includes(k))) {
			return true;
		}

		return false;
	}

	/**
	 * Store a successful assignment pattern for future learning
	 *
	 * @param analysis - The original analysis
	 * @param assignment - The assignment that was used
	 * @param successRate - How successful the assignment was (0-1)
	 */
	async storeSuccessfulAssignment(
		analysis: AnalysisResult,
		assignment: AgentAssignment,
		successRate: number
	): Promise<boolean> {
		try {
			const pattern: StoredPattern = {
				ticketType: analysis.ticketType,
				keywords: analysis.keywords,
				agents: assignment.agents.map((a) => a.type),
				topology: assignment.topology,
				successRate,
				timestamp: new Date().toISOString()
			};

			const key = `pattern-${analysis.ticketType}-${Date.now()}`;

			const result = await claudeFlowCLI.execute('memory', [
				'store',
				'--key',
				key,
				'--value',
				JSON.stringify(pattern),
				'--namespace',
				this.memoryNamespace
			]);

			return result.exitCode === 0;
		} catch {
			return false;
		}
	}

	/**
	 * Get agent capabilities for a given agent type
	 */
	getAgentCapabilities(agentType: AgentType): string[] {
		return AGENT_CAPABILITIES[agentType] || [];
	}

	/**
	 * Score how well an agent matches required capabilities
	 */
	scoreAgentMatch(agentType: AgentType, requiredCapabilities: string[]): number {
		const capabilities = this.getAgentCapabilities(agentType);
		if (capabilities.length === 0) return 0;

		const matches = requiredCapabilities.filter((cap) =>
			capabilities.some((c) => c.includes(cap) || cap.includes(c))
		);

		return matches.length / requiredCapabilities.length;
	}
}

// Singleton instance
export const agentRouter = new AgentRouter();

/**
 * Convenience function to assign agents without instantiating class
 */
export async function assignAgents(
	analysis: AnalysisResult,
	manualOverride?: Partial<AgentAssignment>
): Promise<AgentAssignment> {
	return agentRouter.assignAgents(analysis, manualOverride);
}

/**
 * Convenience function to store successful assignment without instantiating class
 */
export async function storeSuccessfulAssignment(
	analysis: AnalysisResult,
	assignment: AgentAssignment,
	successRate: number
): Promise<boolean> {
	return agentRouter.storeSuccessfulAssignment(analysis, assignment, successRate);
}
