/**
 * TASK-052: Topology Selection Algorithm
 *
 * Decision tree for selecting optimal swarm topology based on task characteristics.
 * Factors in agent count, complexity, dependencies, and task requirements.
 * Supports dynamic topology switching during execution.
 */

/**
 * Available swarm topologies
 */
export type Topology = 'single' | 'mesh' | 'hierarchical' | 'hybrid';

/**
 * Factors that influence topology selection
 */
export interface TopologyFactors {
	/** Ticket complexity score (1-10) */
	complexity: number;
	/** Number of agents to spawn */
	agentCount: number;
	/** Whether ticket has dependencies on other tickets */
	hasDependencies: boolean;
	/** Whether the ticket is security-related */
	isSecurityRelated: boolean;
	/** Whether consensus is required among agents */
	requiresConsensus: boolean;
	/** Expected duration in hours */
	expectedDuration: number;
	/** Keywords from ticket analysis */
	keywords?: string[];
}

/**
 * Result of topology selection with reasoning
 */
export interface TopologyDecision {
	/** Selected topology */
	topology: Topology;
	/** Maximum agents recommended for this topology */
	maxAgents: number;
	/** Whether a coordinator agent is required */
	coordinatorRequired: boolean;
	/** Reasoning for the decision */
	reasoning: string[];
	/** Confidence in this decision (0-1) */
	confidence: number;
}

/**
 * Information about a topology for UI display
 */
export interface TopologyInfo {
	/** Display name */
	name: string;
	/** Description of the topology */
	description: string;
	/** What the topology is best suited for */
	bestFor: string[];
	/** Maximum number of agents */
	agentLimit: number;
	/** Visual icon name (for UI) */
	icon: string;
}

/**
 * Topology characteristics for UI display and documentation
 */
export const TOPOLOGY_INFO: Record<Topology, TopologyInfo> = {
	single: {
		name: 'Single Agent',
		description: 'One agent works independently on the task',
		bestFor: ['Simple tasks', 'Quick fixes', 'Documentation updates', 'Minor bug fixes'],
		agentLimit: 1,
		icon: 'user'
	},
	mesh: {
		name: 'Mesh Network',
		description: 'All agents communicate directly with each other as peers',
		bestFor: ['Collaborative work', 'Code review', 'Brainstorming', 'Parallel independent tasks'],
		agentLimit: 5,
		icon: 'network'
	},
	hierarchical: {
		name: 'Hierarchical',
		description: 'A coordinator agent leads and delegates to worker agents',
		bestFor: [
			'Complex features',
			'Multi-step tasks',
			'Tasks with dependencies',
			'Large refactoring'
		],
		agentLimit: 10,
		icon: 'git-branch'
	},
	hybrid: {
		name: 'Hierarchical Mesh',
		description: 'Coordinator with peer-to-peer worker communication',
		bestFor: [
			'Security-sensitive work',
			'Long-running tasks',
			'Quality-critical features',
			'Cross-team coordination'
		],
		agentLimit: 8,
		icon: 'share-2'
	}
};

/**
 * Topology Selector class - determines optimal topology for a task
 */
export class TopologySelector {
	/**
	 * Select the optimal topology based on task factors
	 *
	 * Uses a decision tree approach to determine the best topology.
	 *
	 * @param factors - Factors influencing the decision
	 * @returns Topology decision with reasoning
	 */
	selectTopology(factors: TopologyFactors): TopologyDecision {
		const reasoning: string[] = [];
		let confidence = 0.7; // Base confidence

		// Rule 1: Single agent for simple tasks
		if (factors.complexity <= 2 && factors.agentCount === 1) {
			reasoning.push('Simple task with single agent');
			return {
				topology: 'single',
				maxAgents: 1,
				coordinatorRequired: false,
				reasoning,
				confidence: 0.95
			};
		}

		// Rule 2: Hierarchical for complex tasks
		if (factors.complexity >= 7 || factors.agentCount > 5) {
			reasoning.push('High complexity or many agents requires hierarchical coordination');

			if (factors.complexity >= 7) {
				reasoning.push(`Complexity score ${factors.complexity} indicates complex task`);
				confidence += 0.1;
			}

			if (factors.agentCount > 5) {
				reasoning.push(`${factors.agentCount} agents need central coordination`);
				confidence += 0.1;
			}

			return {
				topology: 'hierarchical',
				maxAgents: 10,
				coordinatorRequired: true,
				reasoning,
				confidence: Math.min(confidence, 0.95)
			};
		}

		// Rule 3: Hierarchical for tasks with dependencies
		if (factors.hasDependencies) {
			reasoning.push('Dependencies require ordered execution');
			reasoning.push('Coordinator needed to manage task sequence');

			return {
				topology: 'hierarchical',
				maxAgents: 10,
				coordinatorRequired: true,
				reasoning,
				confidence: 0.85
			};
		}

		// Rule 4: Hybrid for security-related tasks
		if (factors.isSecurityRelated) {
			reasoning.push('Security-sensitive task benefits from hybrid topology');
			reasoning.push('Combines coordination oversight with peer review');

			return {
				topology: 'hybrid',
				maxAgents: 8,
				coordinatorRequired: true,
				reasoning,
				confidence: 0.85
			};
		}

		// Rule 5: Hybrid for long-running tasks
		if (factors.expectedDuration > 4) {
			reasoning.push(`Long-running task (${factors.expectedDuration}h) benefits from hybrid topology`);
			reasoning.push('Provides resilience and coordination for extended work');

			return {
				topology: 'hybrid',
				maxAgents: 8,
				coordinatorRequired: true,
				reasoning,
				confidence: 0.8
			};
		}

		// Rule 6: Hierarchical for medium complexity with multiple agents
		if (factors.complexity >= 5 && factors.agentCount > 3) {
			reasoning.push('Medium-high complexity with multiple agents');
			reasoning.push('Hierarchical structure improves coordination');

			return {
				topology: 'hierarchical',
				maxAgents: 10,
				coordinatorRequired: true,
				reasoning,
				confidence: 0.8
			};
		}

		// Rule 7: Mesh for consensus-requiring tasks
		if (factors.requiresConsensus && factors.agentCount <= 5) {
			reasoning.push('Consensus required among agents');
			reasoning.push('Mesh topology allows direct peer communication');

			return {
				topology: 'mesh',
				maxAgents: 5,
				coordinatorRequired: false,
				reasoning,
				confidence: 0.85
			};
		}

		// Rule 8: Mesh for collaborative work with moderate complexity
		if (factors.complexity <= 4 && factors.agentCount <= 3 && !factors.hasDependencies) {
			reasoning.push('Collaborative task suited for mesh topology');
			reasoning.push('All agents can communicate directly');

			return {
				topology: 'mesh',
				maxAgents: 5,
				coordinatorRequired: false,
				reasoning,
				confidence: 0.8
			};
		}

		// Default: Choose based on agent count
		if (factors.agentCount <= 3) {
			reasoning.push('Default to mesh for moderate task with few agents');
			return {
				topology: 'mesh',
				maxAgents: 5,
				coordinatorRequired: false,
				reasoning,
				confidence: 0.7
			};
		}

		reasoning.push('Default to hierarchical for larger agent teams');
		return {
			topology: 'hierarchical',
			maxAgents: 10,
			coordinatorRequired: true,
			reasoning,
			confidence: 0.7
		};
	}

	/**
	 * Check if topology can be dynamically switched to another
	 *
	 * @param from - Current topology
	 * @param to - Target topology
	 * @returns Whether switch is allowed and any warnings
	 */
	canSwitchTopology(
		from: Topology,
		to: Topology
	): { allowed: boolean; warning?: string } {
		// Same topology is always allowed
		if (from === to) {
			return { allowed: true };
		}

		// Can always upgrade to more structured topology
		const upgradeOrder: Topology[] = ['single', 'mesh', 'hierarchical', 'hybrid'];
		const fromIndex = upgradeOrder.indexOf(from);
		const toIndex = upgradeOrder.indexOf(to);

		if (toIndex > fromIndex) {
			return { allowed: true };
		}

		// Downgrade requires caution
		if (from === 'hierarchical' && to === 'mesh') {
			return {
				allowed: true,
				warning: 'Downgrading from hierarchical to mesh may lose coordination benefits'
			};
		}

		if (from === 'hybrid' && to === 'mesh') {
			return {
				allowed: true,
				warning: 'Downgrading from hybrid to mesh reduces oversight capabilities'
			};
		}

		if (to === 'single') {
			return {
				allowed: false,
				warning: 'Cannot switch to single agent topology with multiple agents active'
			};
		}

		return { allowed: true };
	}

	/**
	 * Get topology information for UI display
	 *
	 * @param topology - Topology to get info for
	 * @returns Topology information
	 */
	getTopologyInfo(topology: Topology): TopologyInfo {
		return TOPOLOGY_INFO[topology];
	}

	/**
	 * Get all topologies with their information
	 *
	 * @returns Map of all topologies and their info
	 */
	getAllTopologies(): Record<Topology, TopologyInfo> {
		return { ...TOPOLOGY_INFO };
	}

	/**
	 * Recommend topology based on task keywords
	 *
	 * @param keywords - Keywords from ticket analysis
	 * @returns Recommended topology or null if no clear recommendation
	 */
	recommendFromKeywords(keywords: string[]): Topology | null {
		const lowerKeywords = keywords.map((k) => k.toLowerCase());

		// Security keywords suggest hybrid
		const securityKeywords = ['security', 'auth', 'authentication', 'encryption', 'vulnerability'];
		if (lowerKeywords.some((k) => securityKeywords.includes(k))) {
			return 'hybrid';
		}

		// Architecture keywords suggest hierarchical
		const architectureKeywords = ['architecture', 'refactor', 'migration', 'infrastructure'];
		if (lowerKeywords.some((k) => architectureKeywords.includes(k))) {
			return 'hierarchical';
		}

		// Review/collaborative keywords suggest mesh
		const collaborativeKeywords = ['review', 'discuss', 'brainstorm', 'collaborate'];
		if (lowerKeywords.some((k) => collaborativeKeywords.includes(k))) {
			return 'mesh';
		}

		// Simple task keywords suggest single
		const simpleKeywords = ['typo', 'readme', 'comment', 'minor', 'quick'];
		if (lowerKeywords.some((k) => simpleKeywords.includes(k))) {
			return 'single';
		}

		return null;
	}

	/**
	 * Estimate maximum effective agents for a given complexity
	 *
	 * @param complexity - Task complexity (1-10)
	 * @returns Recommended maximum agents
	 */
	estimateMaxAgents(complexity: number): number {
		if (complexity <= 2) return 1;
		if (complexity <= 4) return 3;
		if (complexity <= 6) return 5;
		if (complexity <= 8) return 7;
		return 10;
	}
}

// Singleton instance
export const topologySelector = new TopologySelector();

/**
 * Convenience function to select topology without instantiating class
 */
export function selectTopology(factors: TopologyFactors): TopologyDecision {
	return topologySelector.selectTopology(factors);
}
