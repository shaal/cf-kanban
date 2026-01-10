/**
 * Swarm Visualization Types
 * GAP-3.3.2: Swarm Visualization
 *
 * Type definitions for real-time swarm visualization.
 */

import type { ForceNode, ForceLink } from '$lib/components/viz/types';

/**
 * Agent status with visual color mapping
 */
export type AgentStatus = 'idle' | 'working' | 'blocked' | 'learning' | 'error';

/**
 * Agent role in the swarm
 */
export type AgentRole = 'coordinator' | 'worker' | 'specialist' | 'scout' | 'queen';

/**
 * Status color mapping for consistent styling
 */
export const STATUS_COLORS: Record<AgentStatus, string> = {
	idle: '#9ca3af', // gray-400
	working: '#3b82f6', // blue-500
	blocked: '#ef4444', // red-500
	learning: '#fbbf24', // yellow-400
	error: '#dc2626' // red-600
};

/**
 * Role color mapping
 */
export const ROLE_COLORS: Record<AgentRole, string> = {
	queen: '#7c3aed', // violet-600
	coordinator: '#0891b2', // cyan-600
	specialist: '#059669', // emerald-600
	worker: '#6b7280', // gray-500
	scout: '#d97706' // amber-600
};

/**
 * Extended node for swarm visualization
 */
export interface SwarmNode extends ForceNode {
	agentId: string;
	agentType: string;
	status: AgentStatus;
	role?: AgentRole;
	currentTask?: string;
	health: number; // 0-1
	taskCount: number;
	consensusVote?: 'for' | 'against' | 'pending' | null;
	lastUpdated: number; // timestamp for animation timing
}

/**
 * Communication types between agents
 */
export type CommunicationType = 'command' | 'data' | 'consensus' | 'broadcast';

/**
 * Communication link between agents
 */
export interface SwarmLink extends ForceLink {
	communicationType: CommunicationType;
	active: boolean;
	messageCount?: number;
	lastMessageTime?: number;
}

/**
 * Consensus voting state
 */
export interface ConsensusState {
	proposalId: string;
	description: string;
	votes: Map<string, 'for' | 'against' | 'pending'>;
	requiredQuorum: number;
	deadline?: number;
}

/**
 * Swarm topology types
 */
export type SwarmTopology = 'hierarchical' | 'mesh' | 'hybrid' | 'ring' | 'star' | 'single';

/**
 * Swarm status values
 */
export type SwarmStatus = 'initializing' | 'active' | 'paused' | 'terminated' | 'error' | 'degraded';

/**
 * Complete swarm visualization data
 */
export interface SwarmGraphData {
	swarmId: string;
	topology: SwarmTopology;
	nodes: SwarmNode[];
	links: SwarmLink[];
	consensus?: ConsensusState;
	status: SwarmStatus;
	health: number; // 0-1 overall swarm health
	createdAt?: number;
}

/**
 * Flow animation for message visualization
 */
export interface FlowAnimation {
	id: string;
	sourceId: string;
	targetId: string;
	type: 'message' | 'task' | 'vote';
	progress: number; // 0-1
	startTime: number;
}

/**
 * WebSocket event payloads for swarm updates
 */
export interface SwarmInitializedPayload {
	swarmId: string;
	projectId: string;
	topology: SwarmTopology;
	agents: SwarmNode[];
	links: SwarmLink[];
}

export interface AgentStatusPayload {
	swarmId: string;
	agentId: string;
	status: AgentStatus;
	health: number;
	currentTask?: string;
}

export interface AgentJoinedPayload {
	swarmId: string;
	agent: SwarmNode;
	links: SwarmLink[];
}

export interface AgentLeftPayload {
	swarmId: string;
	agentId: string;
}

export interface CommunicationPayload {
	swarmId: string;
	sourceAgentId: string;
	targetAgentId: string;
	type: CommunicationType;
	messageType?: string;
}

export interface ConsensusStartedPayload {
	swarmId: string;
	proposalId: string;
	description: string;
	requiredQuorum: number;
	deadline?: number;
}

export interface ConsensusVotePayload {
	swarmId: string;
	proposalId: string;
	agentId: string;
	vote: 'for' | 'against';
}

export interface ConsensusResolvedPayload {
	swarmId: string;
	proposalId: string;
	result: 'approved' | 'rejected' | 'timeout';
}

export interface SwarmHealthPayload {
	swarmId: string;
	health: number;
	status: SwarmStatus;
}

export interface SwarmTerminatedPayload {
	swarmId: string;
	reason?: string;
}

/**
 * D3 force simulation configuration
 */
export interface SimulationConfig {
	chargeStrength: number;
	linkDistance: number;
	centerStrength: number;
	collisionRadius: number;
	coordinatorPull: number;
	alphaDecay: number;
	velocityDecay: number;
}

/**
 * Default simulation configuration
 */
export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
	chargeStrength: -350,
	linkDistance: 120,
	centerStrength: 0.08,
	collisionRadius: 45,
	coordinatorPull: 0.15,
	alphaDecay: 0.015,
	velocityDecay: 0.4
};

/**
 * Create a mock swarm for development/demo
 */
export function createMockSwarm(projectId: string): SwarmGraphData {
	const nodes: SwarmNode[] = [
		{
			id: 'coord-1',
			agentId: 'agent-coord-1',
			agentType: 'coordinator',
			label: 'Coordinator',
			status: 'working',
			role: 'coordinator',
			health: 0.95,
			taskCount: 5,
			currentTask: 'Orchestrating swarm',
			lastUpdated: Date.now(),
			group: 'coordinator',
			color: ROLE_COLORS.coordinator
		},
		{
			id: 'coder-1',
			agentId: 'agent-coder-1',
			agentType: 'coder',
			label: 'Coder',
			status: 'working',
			role: 'worker',
			health: 0.9,
			taskCount: 12,
			currentTask: 'Implementing feature',
			lastUpdated: Date.now(),
			group: 'worker',
			color: STATUS_COLORS.working
		},
		{
			id: 'tester-1',
			agentId: 'agent-tester-1',
			agentType: 'tester',
			label: 'Tester',
			status: 'idle',
			role: 'worker',
			health: 1.0,
			taskCount: 8,
			lastUpdated: Date.now(),
			group: 'worker',
			color: STATUS_COLORS.idle
		},
		{
			id: 'reviewer-1',
			agentId: 'agent-reviewer-1',
			agentType: 'reviewer',
			label: 'Reviewer',
			status: 'learning',
			role: 'specialist',
			health: 0.85,
			taskCount: 3,
			currentTask: 'Learning patterns',
			lastUpdated: Date.now(),
			group: 'specialist',
			color: STATUS_COLORS.learning
		},
		{
			id: 'researcher-1',
			agentId: 'agent-researcher-1',
			agentType: 'researcher',
			label: 'Researcher',
			status: 'blocked',
			role: 'scout',
			health: 0.7,
			taskCount: 2,
			currentTask: 'Waiting for data',
			lastUpdated: Date.now(),
			group: 'scout',
			color: STATUS_COLORS.blocked
		}
	];

	const links: SwarmLink[] = [
		{
			source: 'coord-1',
			target: 'coder-1',
			communicationType: 'command',
			active: true,
			value: 1
		},
		{
			source: 'coord-1',
			target: 'tester-1',
			communicationType: 'command',
			active: false,
			value: 1
		},
		{
			source: 'coord-1',
			target: 'reviewer-1',
			communicationType: 'data',
			active: false,
			value: 1
		},
		{
			source: 'coord-1',
			target: 'researcher-1',
			communicationType: 'data',
			active: false,
			value: 1
		},
		{
			source: 'coder-1',
			target: 'tester-1',
			communicationType: 'data',
			active: false,
			value: 0.5
		},
		{
			source: 'coder-1',
			target: 'reviewer-1',
			communicationType: 'data',
			active: false,
			value: 0.5
		}
	];

	return {
		swarmId: `swarm-${projectId}`,
		topology: 'hierarchical',
		nodes,
		links,
		status: 'active',
		health: 0.88,
		createdAt: Date.now()
	};
}
