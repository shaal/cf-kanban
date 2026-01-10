/**
 * Ticket-Agents Store
 * GAP-3.3.3: Agent Status on Ticket Cards
 *
 * State management for tracking agent assignments to tickets with real-time updates.
 */

import { writable, derived, get } from 'svelte/store';
import type {
	TicketAgent,
	TicketAgentAssignment,
	TicketAgentSummary,
	TicketAgentAssignedPayload,
	TicketAgentUnassignedPayload,
	TicketAgentStatusPayload,
	TicketAgentProgressPayload
} from '$lib/types/ticket-agents';
import { createTicketAgentSummary, deriveOverallStatus } from '$lib/types/ticket-agents';
import { STATUS_COLORS } from '$lib/components/swarm/types';
import type { AgentStatus } from '$lib/components/swarm/types';

/**
 * Internal store for all ticket-agent assignments
 * Map<ticketId, TicketAgentAssignment>
 */
const ticketAgentMap = writable<Map<string, TicketAgentAssignment>>(new Map());

/**
 * Get all assignments as a readable store
 */
export const ticketAgentAssignments = derived(ticketAgentMap, ($map) => Array.from($map.values()));

/**
 * Get assignment for a specific ticket
 */
export function getTicketAgents(ticketId: string): TicketAgentAssignment | undefined {
	return get(ticketAgentMap).get(ticketId);
}

/**
 * Derived store that creates summaries for all tickets
 * More efficient for rendering in lists
 */
export const ticketAgentSummaries = derived(ticketAgentMap, ($map) => {
	const summaries = new Map<string, TicketAgentSummary>();
	for (const [ticketId, assignment] of $map) {
		summaries.set(ticketId, createTicketAgentSummary(assignment));
	}
	return summaries;
});

/**
 * Get summary for a specific ticket (reactive)
 */
export function createTicketSummaryStore(ticketId: string) {
	return derived(ticketAgentSummaries, ($summaries) => $summaries.get(ticketId));
}

/**
 * Assign an agent to a ticket
 */
export function assignAgentToTicket(ticketId: string, agent: TicketAgent): void {
	ticketAgentMap.update((map) => {
		const existing = map.get(ticketId);
		if (existing) {
			// Check if agent already assigned
			const existingIndex = existing.agents.findIndex((a) => a.agentId === agent.agentId);
			if (existingIndex >= 0) {
				// Update existing agent
				existing.agents[existingIndex] = agent;
			} else {
				// Add new agent
				existing.agents.push(agent);
			}
			// If this is the first agent or marked as primary, set as primary
			if (existing.agents.length === 1 || agent.assignmentRole === 'primary') {
				existing.primaryAgentId = agent.agentId;
			}
		} else {
			// Create new assignment
			map.set(ticketId, {
				ticketId,
				agents: [agent],
				primaryAgentId: agent.agentId
			});
		}
		return new Map(map);
	});
}

/**
 * Remove an agent from a ticket
 */
export function unassignAgentFromTicket(ticketId: string, agentId: string): void {
	ticketAgentMap.update((map) => {
		const existing = map.get(ticketId);
		if (existing) {
			existing.agents = existing.agents.filter((a) => a.agentId !== agentId);
			// Update primary if needed
			if (existing.primaryAgentId === agentId) {
				existing.primaryAgentId = existing.agents[0]?.agentId;
			}
			// Remove assignment if no agents left
			if (existing.agents.length === 0) {
				map.delete(ticketId);
			}
		}
		return new Map(map);
	});
}

/**
 * Update an agent's status on a ticket
 */
export function updateAgentStatus(
	ticketId: string,
	agentId: string,
	status: AgentStatus,
	currentTask?: string,
	health?: number
): void {
	ticketAgentMap.update((map) => {
		const existing = map.get(ticketId);
		if (existing) {
			const agentIndex = existing.agents.findIndex((a) => a.agentId === agentId);
			if (agentIndex >= 0) {
				existing.agents[agentIndex] = {
					...existing.agents[agentIndex],
					status,
					currentTask: currentTask ?? existing.agents[agentIndex].currentTask,
					health: health ?? existing.agents[agentIndex].health,
					lastUpdated: Date.now()
				};
			}
		}
		return new Map(map);
	});
}

/**
 * Update progress for a ticket
 */
export function updateTicketProgress(ticketId: string, progress: number): void {
	ticketAgentMap.update((map) => {
		const existing = map.get(ticketId);
		if (existing) {
			existing.progress = Math.min(100, Math.max(0, progress));
		}
		return new Map(map);
	});
}

/**
 * Set the swarm ID for a ticket's agents
 */
export function setTicketSwarm(ticketId: string, swarmId: string): void {
	ticketAgentMap.update((map) => {
		const existing = map.get(ticketId);
		if (existing) {
			existing.swarmId = swarmId;
		}
		return new Map(map);
	});
}

/**
 * Clear all agents from a ticket
 */
export function clearTicketAgents(ticketId: string): void {
	ticketAgentMap.update((map) => {
		map.delete(ticketId);
		return new Map(map);
	});
}

/**
 * Clear all ticket-agent assignments
 */
export function clearAllAssignments(): void {
	ticketAgentMap.set(new Map());
}

/**
 * Bulk initialize assignments (for loading from server)
 */
export function initializeAssignments(assignments: TicketAgentAssignment[]): void {
	const map = new Map<string, TicketAgentAssignment>();
	for (const assignment of assignments) {
		map.set(assignment.ticketId, assignment);
	}
	ticketAgentMap.set(map);
}

/**
 * WebSocket event handlers factory
 * Returns handlers that can be registered with Socket.IO
 */
export function createTicketAgentEventHandlers(projectId: string) {
	return {
		'ticket:agent:assigned': (payload: TicketAgentAssignedPayload) => {
			assignAgentToTicket(payload.ticketId, payload.agent);
		},

		'ticket:agent:unassigned': (payload: TicketAgentUnassignedPayload) => {
			unassignAgentFromTicket(payload.ticketId, payload.agentId);
		},

		'ticket:agent:status': (payload: TicketAgentStatusPayload) => {
			updateAgentStatus(
				payload.ticketId,
				payload.agentId,
				payload.status,
				payload.currentTask,
				payload.health
			);
		},

		'ticket:agent:progress': (payload: TicketAgentProgressPayload) => {
			updateTicketProgress(payload.ticketId, payload.progress);
		}
	};
}

/**
 * Initialize with mock data for development
 */
export function initializeMockAssignments(ticketIds: string[]): void {
	const mockAgentTypes = ['coder', 'tester', 'reviewer', 'researcher', 'coordinator'];
	const mockStatuses: AgentStatus[] = ['idle', 'working', 'blocked', 'learning'];

	const assignments: TicketAgentAssignment[] = [];

	// Assign agents to some tickets (not all)
	ticketIds.forEach((ticketId, index) => {
		// Only assign agents to ~60% of tickets
		if (Math.random() > 0.4) return;

		const numAgents = Math.floor(Math.random() * 3) + 1; // 1-3 agents
		const agents: TicketAgent[] = [];

		for (let i = 0; i < numAgents; i++) {
			const agentType = mockAgentTypes[Math.floor(Math.random() * mockAgentTypes.length)];
			const status = mockStatuses[Math.floor(Math.random() * mockStatuses.length)];

			agents.push({
				agentId: `agent-${ticketId}-${i}`,
				agentType,
				status,
				assignmentRole: i === 0 ? 'primary' : 'supporting',
				health: 0.7 + Math.random() * 0.3,
				currentTask: status === 'working' ? `Working on ${ticketId}` : undefined,
				assignedAt: Date.now() - Math.floor(Math.random() * 3600000),
				lastUpdated: Date.now()
			});
		}

		assignments.push({
			ticketId,
			agents,
			primaryAgentId: agents[0]?.agentId,
			progress: Math.floor(Math.random() * 100)
		});
	});

	initializeAssignments(assignments);
}
