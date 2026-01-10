/**
 * Ticket-Agent Assignment Types
 * GAP-3.3.3: Agent Status on Ticket Cards
 *
 * Types for tracking which agents are assigned to tickets and their real-time status.
 */

import type { AgentStatus, AgentRole } from '$lib/components/swarm/types';

/**
 * Represents an agent assigned to work on a ticket
 */
export interface TicketAgent {
	/** Unique agent ID */
	agentId: string;
	/** Agent type (coder, tester, reviewer, etc.) */
	agentType: string;
	/** Current status */
	status: AgentStatus;
	/** Role in the assignment (primary, supporting) */
	assignmentRole: AgentAssignmentRole;
	/** What the agent is currently doing */
	currentTask?: string;
	/** Agent health (0-1) */
	health: number;
	/** When the agent was assigned */
	assignedAt: number;
	/** Last status update */
	lastUpdated: number;
}

/**
 * Role types for agent assignment to tickets
 */
export type AgentAssignmentRole = 'primary' | 'supporting' | 'reviewer' | 'observer';

/**
 * Full ticket agent assignment with all agents
 */
export interface TicketAgentAssignment {
	/** The ticket ID */
	ticketId: string;
	/** All agents assigned to this ticket */
	agents: TicketAgent[];
	/** Primary agent ID (if any) */
	primaryAgentId?: string;
	/** Total progress across all agents (0-100) */
	progress?: number;
	/** Swarm ID if this ticket is part of a swarm */
	swarmId?: string;
}

/**
 * Summary for displaying on cards (lightweight)
 */
export interface TicketAgentSummary {
	/** The ticket ID */
	ticketId: string;
	/** Number of agents assigned */
	agentCount: number;
	/** Primary agent (if any) */
	primaryAgent?: Pick<TicketAgent, 'agentId' | 'agentType' | 'status'>;
	/** Overall status derived from agent statuses */
	overallStatus: AgentStatus;
	/** Has any blocked agents */
	hasBlockedAgent: boolean;
	/** Progress percentage */
	progress?: number;
}

/**
 * WebSocket event payloads for ticket agent updates
 */
export interface TicketAgentAssignedPayload {
	ticketId: string;
	agent: TicketAgent;
}

export interface TicketAgentUnassignedPayload {
	ticketId: string;
	agentId: string;
}

export interface TicketAgentStatusPayload {
	ticketId: string;
	agentId: string;
	status: AgentStatus;
	currentTask?: string;
	health?: number;
}

export interface TicketAgentProgressPayload {
	ticketId: string;
	agentId: string;
	progress: number;
}

/**
 * Props for agent status display components
 */
export interface AgentStatusBadgeProps {
	agent: Pick<TicketAgent, 'agentId' | 'agentType' | 'status'>;
	size?: 'xs' | 'sm' | 'md';
	showTooltip?: boolean;
	class?: string;
}

export interface TicketAgentsDisplayProps {
	ticketId: string;
	maxVisible?: number;
	size?: 'xs' | 'sm' | 'md';
	class?: string;
}

/**
 * Agent type to icon mapping (using Lucide icon names)
 */
export const AGENT_TYPE_ICONS: Record<string, string> = {
	coder: 'Code',
	tester: 'TestTube',
	reviewer: 'Eye',
	researcher: 'Search',
	coordinator: 'Network',
	planner: 'Calendar',
	architect: 'Building2',
	'security-auditor': 'Shield',
	'performance-engineer': 'Gauge',
	'memory-specialist': 'Brain',
	default: 'Bot'
};

/**
 * Get icon name for an agent type
 */
export function getAgentIcon(agentType: string): string {
	return AGENT_TYPE_ICONS[agentType] || AGENT_TYPE_ICONS.default;
}

/**
 * Derive overall status from multiple agents
 * Priority: error > blocked > working > learning > idle
 */
export function deriveOverallStatus(agents: TicketAgent[]): AgentStatus {
	if (agents.length === 0) return 'idle';

	const statusPriority: Record<AgentStatus, number> = {
		error: 5,
		blocked: 4,
		working: 3,
		learning: 2,
		idle: 1
	};

	let highestPriority = 0;
	let highestStatus: AgentStatus = 'idle';

	for (const agent of agents) {
		const priority = statusPriority[agent.status];
		if (priority > highestPriority) {
			highestPriority = priority;
			highestStatus = agent.status;
		}
	}

	return highestStatus;
}

/**
 * Create a summary from full assignment data
 */
export function createTicketAgentSummary(assignment: TicketAgentAssignment): TicketAgentSummary {
	const primaryAgent = assignment.primaryAgentId
		? assignment.agents.find((a) => a.agentId === assignment.primaryAgentId)
		: assignment.agents[0];

	return {
		ticketId: assignment.ticketId,
		agentCount: assignment.agents.length,
		primaryAgent: primaryAgent
			? {
					agentId: primaryAgent.agentId,
					agentType: primaryAgent.agentType,
					status: primaryAgent.status
				}
			: undefined,
		overallStatus: deriveOverallStatus(assignment.agents),
		hasBlockedAgent: assignment.agents.some((a) => a.status === 'blocked'),
		progress: assignment.progress
	};
}
