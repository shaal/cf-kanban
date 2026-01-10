/**
 * Swarm Store
 * GAP-3.3.2: Swarm Visualization
 *
 * State management for real-time swarm visualization with WebSocket integration.
 */

import { writable, derived, get } from 'svelte/store';
import type {
	SwarmGraphData,
	SwarmNode,
	SwarmLink,
	FlowAnimation,
	AgentStatus,
	ConsensusState,
	AgentStatusPayload,
	AgentJoinedPayload,
	AgentLeftPayload,
	CommunicationPayload,
	ConsensusVotePayload,
	SwarmHealthPayload,
	SwarmInitializedPayload
} from '$lib/components/swarm/types';
import { STATUS_COLORS, createMockSwarm } from '$lib/components/swarm/types';

/**
 * Active swarm data
 */
export const activeSwarm = writable<SwarmGraphData | null>(null);

/**
 * Flow animations for message visualization
 */
export const flowAnimations = writable<FlowAnimation[]>([]);

/**
 * Connection status for swarm socket
 */
export const swarmConnectionStatus = writable<'disconnected' | 'connecting' | 'connected'>(
	'disconnected'
);

/**
 * Derived store for node map (O(1) lookup)
 */
export const nodeMap = derived(activeSwarm, ($swarm) => {
	if (!$swarm) return new Map<string, SwarmNode>();
	return new Map($swarm.nodes.map((n) => [n.agentId, n]));
});

/**
 * Derived store for active nodes count
 */
export const activeNodesCount = derived(activeSwarm, ($swarm) => {
	if (!$swarm) return 0;
	return $swarm.nodes.filter((n) => n.status === 'working' || n.status === 'idle').length;
});

/**
 * Derived store for blocked nodes
 */
export const blockedNodes = derived(activeSwarm, ($swarm) => {
	if (!$swarm) return [];
	return $swarm.nodes.filter((n) => n.status === 'blocked');
});

/**
 * Initialize swarm with data
 */
export function initializeSwarm(data: SwarmGraphData): void {
	// Update node colors based on status
	const nodesWithColors = data.nodes.map((node) => ({
		...node,
		color: STATUS_COLORS[node.status] || STATUS_COLORS.idle
	}));

	activeSwarm.set({
		...data,
		nodes: nodesWithColors
	});
}

/**
 * Initialize with mock data for development
 */
export function initializeMockSwarm(projectId: string): void {
	const mockData = createMockSwarm(projectId);
	initializeSwarm(mockData);
}

/**
 * Clear the active swarm
 */
export function clearSwarm(): void {
	activeSwarm.set(null);
	flowAnimations.set([]);
}

/**
 * Update a single agent's status
 */
export function updateAgentStatus(
	agentId: string,
	status: AgentStatus,
	health?: number,
	currentTask?: string
): void {
	activeSwarm.update((swarm) => {
		if (!swarm) return swarm;
		const nodeIndex = swarm.nodes.findIndex((n) => n.agentId === agentId);
		if (nodeIndex === -1) return swarm;

		const updatedNodes = [...swarm.nodes];
		updatedNodes[nodeIndex] = {
			...updatedNodes[nodeIndex],
			status,
			health: health ?? updatedNodes[nodeIndex].health,
			currentTask,
			color: STATUS_COLORS[status],
			lastUpdated: Date.now()
		};

		return { ...swarm, nodes: updatedNodes };
	});
}

/**
 * Add an agent to the swarm
 */
export function addAgent(agent: SwarmNode, newLinks: SwarmLink[] = []): void {
	activeSwarm.update((swarm) => {
		if (!swarm) return swarm;

		// Add color based on status
		const agentWithColor = {
			...agent,
			color: STATUS_COLORS[agent.status] || STATUS_COLORS.idle
		};

		return {
			...swarm,
			nodes: [...swarm.nodes, agentWithColor],
			links: [...swarm.links, ...newLinks]
		};
	});
}

/**
 * Remove an agent from the swarm
 */
export function removeAgent(agentId: string): void {
	activeSwarm.update((swarm) => {
		if (!swarm) return swarm;

		const nodeToRemove = swarm.nodes.find((n) => n.agentId === agentId);
		if (!nodeToRemove) return swarm;

		return {
			...swarm,
			nodes: swarm.nodes.filter((n) => n.agentId !== agentId),
			links: swarm.links.filter(
				(l) => l.source !== nodeToRemove.id && l.target !== nodeToRemove.id
			)
		};
	});
}

/**
 * Add communication flow animation
 */
export function addFlowAnimation(
	sourceId: string,
	targetId: string,
	type: FlowAnimation['type']
): string {
	const animId = `flow-${Date.now()}-${Math.random().toString(36).slice(2)}`;

	flowAnimations.update((anims) => [
		...anims,
		{ id: animId, sourceId, targetId, type, progress: 0, startTime: Date.now() }
	]);

	// Auto-remove after animation completes (500ms)
	setTimeout(() => {
		flowAnimations.update((anims) => anims.filter((a) => a.id !== animId));
	}, 500);

	return animId;
}

/**
 * Update link activity status
 */
export function setLinkActive(sourceId: string, targetId: string, active: boolean): void {
	activeSwarm.update((swarm) => {
		if (!swarm) return swarm;

		const linkIndex = swarm.links.findIndex(
			(l) =>
				(l.source === sourceId && l.target === targetId) ||
				(l.source === targetId && l.target === sourceId)
		);

		if (linkIndex === -1) return swarm;

		const updatedLinks = [...swarm.links];
		updatedLinks[linkIndex] = { ...updatedLinks[linkIndex], active };

		return { ...swarm, links: updatedLinks };
	});
}

/**
 * Update consensus vote for an agent
 */
export function updateConsensusVote(
	agentId: string,
	vote: 'for' | 'against' | 'pending'
): void {
	activeSwarm.update((swarm) => {
		if (!swarm) return swarm;

		const nodeIndex = swarm.nodes.findIndex((n) => n.agentId === agentId);
		if (nodeIndex === -1) return swarm;

		const updatedNodes = [...swarm.nodes];
		updatedNodes[nodeIndex] = {
			...updatedNodes[nodeIndex],
			consensusVote: vote
		};

		// Also update consensus state if it exists
		if (swarm.consensus) {
			const newVotes = new Map(swarm.consensus.votes);
			newVotes.set(agentId, vote);
			return {
				...swarm,
				nodes: updatedNodes,
				consensus: { ...swarm.consensus, votes: newVotes }
			};
		}

		return { ...swarm, nodes: updatedNodes };
	});
}

/**
 * Start a consensus round
 */
export function startConsensus(
	proposalId: string,
	description: string,
	requiredQuorum: number,
	deadline?: number
): void {
	activeSwarm.update((swarm) => {
		if (!swarm) return swarm;

		const votes = new Map<string, 'for' | 'against' | 'pending'>();
		swarm.nodes.forEach((n) => votes.set(n.agentId, 'pending'));

		// Update all nodes to pending vote
		const updatedNodes = swarm.nodes.map((n) => ({
			...n,
			consensusVote: 'pending' as const
		}));

		return {
			...swarm,
			nodes: updatedNodes,
			consensus: {
				proposalId,
				description,
				votes,
				requiredQuorum,
				deadline
			}
		};
	});
}

/**
 * Clear consensus state
 */
export function clearConsensus(): void {
	activeSwarm.update((swarm) => {
		if (!swarm) return swarm;

		const updatedNodes = swarm.nodes.map((n) => ({
			...n,
			consensusVote: null
		}));

		return {
			...swarm,
			nodes: updatedNodes,
			consensus: undefined
		};
	});
}

/**
 * Update swarm health
 */
export function updateSwarmHealth(health: number, status?: SwarmGraphData['status']): void {
	activeSwarm.update((swarm) => {
		if (!swarm) return swarm;
		return {
			...swarm,
			health,
			status: status ?? swarm.status
		};
	});
}

/**
 * WebSocket event handlers factory
 * Returns handlers that can be registered with Socket.IO
 */
export function createSwarmEventHandlers(targetSwarmId: string) {
	return {
		'swarm:initialized': (payload: SwarmInitializedPayload) => {
			if (payload.swarmId !== targetSwarmId) return;
			initializeSwarm({
				swarmId: payload.swarmId,
				topology: payload.topology,
				nodes: payload.agents,
				links: payload.links,
				status: 'active',
				health: 1.0
			});
		},

		'swarm:agent:status': (payload: AgentStatusPayload) => {
			if (payload.swarmId !== targetSwarmId) return;
			updateAgentStatus(payload.agentId, payload.status, payload.health, payload.currentTask);
		},

		'swarm:agent:joined': (payload: AgentJoinedPayload) => {
			if (payload.swarmId !== targetSwarmId) return;
			addAgent(payload.agent, payload.links);
		},

		'swarm:agent:left': (payload: AgentLeftPayload) => {
			if (payload.swarmId !== targetSwarmId) return;
			removeAgent(payload.agentId);
		},

		'swarm:communication': (payload: CommunicationPayload) => {
			if (payload.swarmId !== targetSwarmId) return;
			addFlowAnimation(payload.sourceAgentId, payload.targetAgentId, 'message');

			// Briefly activate the link
			setLinkActive(payload.sourceAgentId, payload.targetAgentId, true);
			setTimeout(() => {
				setLinkActive(payload.sourceAgentId, payload.targetAgentId, false);
			}, 300);
		},

		'swarm:consensus:vote': (payload: ConsensusVotePayload) => {
			if (payload.swarmId !== targetSwarmId) return;
			updateConsensusVote(payload.agentId, payload.vote);
			addFlowAnimation(payload.agentId, 'coord-1', 'vote'); // Animate vote to coordinator
		},

		'swarm:health': (payload: SwarmHealthPayload) => {
			if (payload.swarmId !== targetSwarmId) return;
			updateSwarmHealth(payload.health, payload.status);
		},

		'swarm:terminated': () => {
			clearSwarm();
		}
	};
}
