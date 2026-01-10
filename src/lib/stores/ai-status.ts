/**
 * AI Status Store
 * GAP-UX.1: KanbanCard AI Status Indicators
 *
 * State management for AI status indicators on tickets.
 * Tracks confidence, knowledge, and AI processing status per ticket.
 */

import { writable, derived, get } from 'svelte/store';
import type { AgentStatus } from '$lib/components/swarm/types';

/**
 * AI Status data for a single ticket
 */
export interface TicketAIStatus {
	/** The ticket ID */
	ticketId: string;
	/** Current AI processing status */
	status: AgentStatus;
	/** AI confidence level (0-100) */
	confidence?: number;
	/** Pattern familiarity / knowledge level (0-100) */
	knowledge?: number;
	/** Assigned agent type */
	agentType?: string;
	/** Agent name (optional) */
	agentName?: string;
	/** Current task being performed */
	currentTask?: string;
	/** Last update timestamp */
	lastUpdated: number;
}

/**
 * WebSocket event payloads for AI status updates
 */
export interface AIStatusUpdatePayload {
	ticketId: string;
	status?: AgentStatus;
	confidence?: number;
	knowledge?: number;
	agentType?: string;
	agentName?: string;
	currentTask?: string;
}

export interface AIConfidenceUpdatePayload {
	ticketId: string;
	confidence: number;
}

export interface AIKnowledgeUpdatePayload {
	ticketId: string;
	knowledge: number;
}

/**
 * Internal store for all ticket AI statuses
 * Map<ticketId, TicketAIStatus>
 */
const aiStatusMap = writable<Map<string, TicketAIStatus>>(new Map());

/**
 * Get all AI statuses as a readable store
 */
export const ticketAIStatuses = derived(aiStatusMap, ($map) => Array.from($map.values()));

/**
 * Get AI status for a specific ticket
 */
export function getTicketAIStatus(ticketId: string): TicketAIStatus | undefined {
	return get(aiStatusMap).get(ticketId);
}

/**
 * Create a derived store for a specific ticket's AI status (reactive)
 */
export function createTicketAIStatusStore(ticketId: string) {
	return derived(aiStatusMap, ($map) => $map.get(ticketId));
}

/**
 * Set or update AI status for a ticket
 */
export function setTicketAIStatus(ticketId: string, data: Partial<TicketAIStatus>): void {
	aiStatusMap.update((map) => {
		const existing = map.get(ticketId);
		if (existing) {
			map.set(ticketId, {
				...existing,
				...data,
				lastUpdated: Date.now()
			});
		} else {
			map.set(ticketId, {
				ticketId,
				status: 'idle',
				...data,
				lastUpdated: Date.now()
			});
		}
		return new Map(map);
	});
}

/**
 * Update confidence for a ticket
 */
export function updateTicketConfidence(ticketId: string, confidence: number): void {
	setTicketAIStatus(ticketId, { confidence: Math.max(0, Math.min(100, confidence)) });
}

/**
 * Update knowledge for a ticket
 */
export function updateTicketKnowledge(ticketId: string, knowledge: number): void {
	setTicketAIStatus(ticketId, { knowledge: Math.max(0, Math.min(100, knowledge)) });
}

/**
 * Update AI status for a ticket
 */
export function updateTicketAIProcessingStatus(ticketId: string, status: AgentStatus): void {
	setTicketAIStatus(ticketId, { status });
}

/**
 * Assign an agent to a ticket's AI status
 */
export function assignAIAgent(
	ticketId: string,
	agentType: string,
	agentName?: string,
	status: AgentStatus = 'idle'
): void {
	setTicketAIStatus(ticketId, { agentType, agentName, status });
}

/**
 * Set current task for a ticket
 */
export function setAICurrentTask(ticketId: string, currentTask?: string): void {
	setTicketAIStatus(ticketId, { currentTask });
}

/**
 * Clear AI status for a ticket
 */
export function clearTicketAIStatus(ticketId: string): void {
	aiStatusMap.update((map) => {
		map.delete(ticketId);
		return new Map(map);
	});
}

/**
 * Clear all AI statuses
 */
export function clearAllAIStatuses(): void {
	aiStatusMap.set(new Map());
}

/**
 * Bulk initialize AI statuses (for loading from server)
 */
export function initializeAIStatuses(statuses: TicketAIStatus[]): void {
	const map = new Map<string, TicketAIStatus>();
	for (const status of statuses) {
		map.set(status.ticketId, status);
	}
	aiStatusMap.set(map);
}

/**
 * WebSocket event handlers factory
 * Returns handlers that can be registered with Socket.IO
 */
export function createAIStatusEventHandlers() {
	return {
		'ticket:ai:status': (payload: AIStatusUpdatePayload) => {
			setTicketAIStatus(payload.ticketId, {
				status: payload.status,
				confidence: payload.confidence,
				knowledge: payload.knowledge,
				agentType: payload.agentType,
				agentName: payload.agentName,
				currentTask: payload.currentTask
			});
		},

		'ticket:ai:confidence': (payload: AIConfidenceUpdatePayload) => {
			updateTicketConfidence(payload.ticketId, payload.confidence);
		},

		'ticket:ai:knowledge': (payload: AIKnowledgeUpdatePayload) => {
			updateTicketKnowledge(payload.ticketId, payload.knowledge);
		}
	};
}

/**
 * Initialize with mock data for development
 */
export function initializeMockAIStatuses(ticketIds: string[]): void {
	const mockAgentTypes = ['coder', 'tester', 'reviewer', 'researcher', 'coordinator'];
	const mockStatuses: AgentStatus[] = ['idle', 'working', 'blocked', 'learning'];
	const mockTasks = [
		'Analyzing code patterns',
		'Running test suite',
		'Reviewing changes',
		'Researching solution',
		'Coordinating agents'
	];

	const statuses: TicketAIStatus[] = [];

	// Assign AI status to some tickets (not all)
	ticketIds.forEach((ticketId, index) => {
		// Only assign AI status to ~50% of tickets
		if (Math.random() > 0.5) return;

		const agentType = mockAgentTypes[Math.floor(Math.random() * mockAgentTypes.length)];
		const status = mockStatuses[Math.floor(Math.random() * mockStatuses.length)];
		const hasConfidence = Math.random() > 0.3;
		const hasKnowledge = Math.random() > 0.4;

		statuses.push({
			ticketId,
			status,
			agentType,
			confidence: hasConfidence ? Math.floor(Math.random() * 100) : undefined,
			knowledge: hasKnowledge ? Math.floor(Math.random() * 100) : undefined,
			currentTask: status === 'working' ? mockTasks[Math.floor(Math.random() * mockTasks.length)] : undefined,
			lastUpdated: Date.now()
		});
	});

	initializeAIStatuses(statuses);
}
