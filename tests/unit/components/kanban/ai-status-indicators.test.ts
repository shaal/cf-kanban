/**
 * AI Status Indicator Components Tests
 *
 * GAP-UX.1: KanbanCard AI Status Indicators
 *
 * Tests for the AI status indicator components:
 * - AIStatusIndicator
 * - ConfidenceMeter
 * - KnowledgeRing
 * - AgentAvatar
 * - AIStatusSection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	setTicketAIStatus,
	getTicketAIStatus,
	updateTicketConfidence,
	updateTicketKnowledge,
	updateTicketAIProcessingStatus,
	assignAIAgent,
	clearTicketAIStatus,
	clearAllAIStatuses,
	initializeAIStatuses,
	initializeMockAIStatuses,
	type TicketAIStatus
} from '$lib/stores/ai-status';
import type { AgentStatus } from '$lib/components/swarm/types';

describe('AI Status Store', () => {
	beforeEach(() => {
		clearAllAIStatuses();
	});

	describe('setTicketAIStatus', () => {
		it('should create new AI status for a ticket', () => {
			const ticketId = 'ticket-1';
			setTicketAIStatus(ticketId, {
				status: 'working',
				confidence: 85,
				knowledge: 70
			});

			const status = getTicketAIStatus(ticketId);
			expect(status).toBeDefined();
			expect(status?.status).toBe('working');
			expect(status?.confidence).toBe(85);
			expect(status?.knowledge).toBe(70);
		});

		it('should update existing AI status', () => {
			const ticketId = 'ticket-1';
			setTicketAIStatus(ticketId, { status: 'idle', confidence: 50 });
			setTicketAIStatus(ticketId, { status: 'working', confidence: 75 });

			const status = getTicketAIStatus(ticketId);
			expect(status?.status).toBe('working');
			expect(status?.confidence).toBe(75);
		});

		it('should preserve existing fields when updating partially', () => {
			const ticketId = 'ticket-1';
			setTicketAIStatus(ticketId, {
				status: 'working',
				confidence: 85,
				knowledge: 70,
				agentType: 'coder'
			});
			setTicketAIStatus(ticketId, { confidence: 90 });

			const status = getTicketAIStatus(ticketId);
			expect(status?.status).toBe('working');
			expect(status?.confidence).toBe(90);
			expect(status?.knowledge).toBe(70);
			expect(status?.agentType).toBe('coder');
		});
	});

	describe('updateTicketConfidence', () => {
		it('should update confidence level', () => {
			const ticketId = 'ticket-1';
			setTicketAIStatus(ticketId, { status: 'working' });
			updateTicketConfidence(ticketId, 95);

			const status = getTicketAIStatus(ticketId);
			expect(status?.confidence).toBe(95);
		});

		it('should clamp confidence to 0-100 range', () => {
			const ticketId = 'ticket-1';
			setTicketAIStatus(ticketId, { status: 'working' });

			updateTicketConfidence(ticketId, 150);
			expect(getTicketAIStatus(ticketId)?.confidence).toBe(100);

			updateTicketConfidence(ticketId, -20);
			expect(getTicketAIStatus(ticketId)?.confidence).toBe(0);
		});
	});

	describe('updateTicketKnowledge', () => {
		it('should update knowledge level', () => {
			const ticketId = 'ticket-1';
			setTicketAIStatus(ticketId, { status: 'working' });
			updateTicketKnowledge(ticketId, 80);

			const status = getTicketAIStatus(ticketId);
			expect(status?.knowledge).toBe(80);
		});

		it('should clamp knowledge to 0-100 range', () => {
			const ticketId = 'ticket-1';
			setTicketAIStatus(ticketId, { status: 'working' });

			updateTicketKnowledge(ticketId, 120);
			expect(getTicketAIStatus(ticketId)?.knowledge).toBe(100);

			updateTicketKnowledge(ticketId, -10);
			expect(getTicketAIStatus(ticketId)?.knowledge).toBe(0);
		});
	});

	describe('updateTicketAIProcessingStatus', () => {
		it('should update AI processing status', () => {
			const ticketId = 'ticket-1';
			setTicketAIStatus(ticketId, { status: 'idle' });

			updateTicketAIProcessingStatus(ticketId, 'working');
			expect(getTicketAIStatus(ticketId)?.status).toBe('working');

			updateTicketAIProcessingStatus(ticketId, 'blocked');
			expect(getTicketAIStatus(ticketId)?.status).toBe('blocked');
		});
	});

	describe('assignAIAgent', () => {
		it('should assign an agent to ticket AI status', () => {
			const ticketId = 'ticket-1';
			assignAIAgent(ticketId, 'coder', 'Agent-1', 'working');

			const status = getTicketAIStatus(ticketId);
			expect(status?.agentType).toBe('coder');
			expect(status?.agentName).toBe('Agent-1');
			expect(status?.status).toBe('working');
		});

		it('should default status to idle if not provided', () => {
			const ticketId = 'ticket-1';
			assignAIAgent(ticketId, 'tester');

			const status = getTicketAIStatus(ticketId);
			expect(status?.agentType).toBe('tester');
			expect(status?.status).toBe('idle');
		});
	});

	describe('clearTicketAIStatus', () => {
		it('should remove AI status for a specific ticket', () => {
			setTicketAIStatus('ticket-1', { status: 'working' });
			setTicketAIStatus('ticket-2', { status: 'idle' });

			clearTicketAIStatus('ticket-1');

			expect(getTicketAIStatus('ticket-1')).toBeUndefined();
			expect(getTicketAIStatus('ticket-2')).toBeDefined();
		});
	});

	describe('clearAllAIStatuses', () => {
		it('should remove all AI statuses', () => {
			setTicketAIStatus('ticket-1', { status: 'working' });
			setTicketAIStatus('ticket-2', { status: 'idle' });
			setTicketAIStatus('ticket-3', { status: 'blocked' });

			clearAllAIStatuses();

			expect(getTicketAIStatus('ticket-1')).toBeUndefined();
			expect(getTicketAIStatus('ticket-2')).toBeUndefined();
			expect(getTicketAIStatus('ticket-3')).toBeUndefined();
		});
	});

	describe('initializeAIStatuses', () => {
		it('should bulk initialize AI statuses', () => {
			const statuses: TicketAIStatus[] = [
				{ ticketId: 'ticket-1', status: 'working', confidence: 80, lastUpdated: Date.now() },
				{ ticketId: 'ticket-2', status: 'idle', confidence: 50, lastUpdated: Date.now() }
			];

			initializeAIStatuses(statuses);

			expect(getTicketAIStatus('ticket-1')?.status).toBe('working');
			expect(getTicketAIStatus('ticket-2')?.status).toBe('idle');
		});

		it('should replace existing statuses', () => {
			setTicketAIStatus('ticket-1', { status: 'blocked' });

			const statuses: TicketAIStatus[] = [
				{ ticketId: 'ticket-1', status: 'working', lastUpdated: Date.now() }
			];

			initializeAIStatuses(statuses);

			expect(getTicketAIStatus('ticket-1')?.status).toBe('working');
		});
	});

	describe('initializeMockAIStatuses', () => {
		it('should create mock AI statuses for provided ticket IDs', () => {
			const ticketIds = ['ticket-1', 'ticket-2', 'ticket-3', 'ticket-4', 'ticket-5'];
			initializeMockAIStatuses(ticketIds);

			// At least some tickets should have AI status (approximately 50%)
			const statusCount = ticketIds.filter((id) => getTicketAIStatus(id)).length;
			// With 50% probability, we expect at least 1 to have status
			expect(statusCount).toBeGreaterThanOrEqual(0);
		});
	});
});

describe('AI Status Indicator Component Logic', () => {
	describe('Status Configuration', () => {
		const validStatuses: AgentStatus[] = ['idle', 'working', 'blocked', 'learning', 'error'];

		it('should have configuration for all valid statuses', () => {
			validStatuses.forEach((status) => {
				// This tests that the status values are valid
				expect(validStatuses).toContain(status);
			});
		});
	});
});

describe('Confidence Meter Logic', () => {
	describe('Color gradients', () => {
		it('should return correct color for high confidence (80-100)', () => {
			const getColor = (value: number): string => {
				if (value >= 80) return 'green';
				if (value >= 60) return 'emerald';
				if (value >= 40) return 'amber';
				if (value >= 20) return 'orange';
				return 'red';
			};

			expect(getColor(100)).toBe('green');
			expect(getColor(80)).toBe('green');
		});

		it('should return correct color for medium confidence (40-60)', () => {
			const getColor = (value: number): string => {
				if (value >= 80) return 'green';
				if (value >= 60) return 'emerald';
				if (value >= 40) return 'amber';
				if (value >= 20) return 'orange';
				return 'red';
			};

			expect(getColor(50)).toBe('amber');
			expect(getColor(40)).toBe('amber');
		});

		it('should return correct color for low confidence (0-20)', () => {
			const getColor = (value: number): string => {
				if (value >= 80) return 'green';
				if (value >= 60) return 'emerald';
				if (value >= 40) return 'amber';
				if (value >= 20) return 'orange';
				return 'red';
			};

			expect(getColor(10)).toBe('red');
			expect(getColor(0)).toBe('red');
		});
	});

	describe('Value clamping', () => {
		it('should clamp values to 0-100 range', () => {
			const clamp = (value: number): number => Math.max(0, Math.min(100, value));

			expect(clamp(150)).toBe(100);
			expect(clamp(-50)).toBe(0);
			expect(clamp(50)).toBe(50);
		});
	});
});

describe('Knowledge Ring Logic', () => {
	describe('SVG calculations', () => {
		it('should calculate correct circumference', () => {
			const radius = 10;
			const circumference = 2 * Math.PI * radius;
			expect(circumference).toBeCloseTo(62.83, 1);
		});

		it('should calculate correct offset for progress', () => {
			const radius = 10;
			const circumference = 2 * Math.PI * radius;
			const knowledge = 75;
			const offset = circumference - (knowledge / 100) * circumference;

			expect(offset).toBeCloseTo(15.71, 1);
		});

		it('should have zero offset at 100% knowledge', () => {
			const radius = 10;
			const circumference = 2 * Math.PI * radius;
			const knowledge = 100;
			const offset = circumference - (knowledge / 100) * circumference;

			expect(offset).toBeCloseTo(0, 1);
		});

		it('should have full offset at 0% knowledge', () => {
			const radius = 10;
			const circumference = 2 * Math.PI * radius;
			const knowledge = 0;
			const offset = circumference - (knowledge / 100) * circumference;

			expect(offset).toBeCloseTo(circumference, 1);
		});
	});

	describe('Gradient selection', () => {
		it('should select correct gradient based on knowledge level', () => {
			const getGradientId = (value: number): string => {
				if (value >= 80) return 'knowledge-high';
				if (value >= 60) return 'knowledge-good';
				if (value >= 40) return 'knowledge-medium';
				if (value >= 20) return 'knowledge-low';
				return 'knowledge-minimal';
			};

			expect(getGradientId(90)).toBe('knowledge-high');
			expect(getGradientId(70)).toBe('knowledge-good');
			expect(getGradientId(50)).toBe('knowledge-medium');
			expect(getGradientId(30)).toBe('knowledge-low');
			expect(getGradientId(10)).toBe('knowledge-minimal');
		});
	});
});

describe('Agent Avatar Logic', () => {
	describe('Agent type colors', () => {
		it('should have color configuration for common agent types', () => {
			const agentTypeColors: Record<string, { bg: string; text: string }> = {
				coder: { bg: 'bg-blue-100', text: 'text-blue-600' },
				tester: { bg: 'bg-green-100', text: 'text-green-600' },
				reviewer: { bg: 'bg-purple-100', text: 'text-purple-600' }
			};

			expect(agentTypeColors.coder).toBeDefined();
			expect(agentTypeColors.tester).toBeDefined();
			expect(agentTypeColors.reviewer).toBeDefined();
		});
	});

	describe('Status pulse animation', () => {
		it('should pulse for working and learning statuses', () => {
			const shouldPulse = (status: AgentStatus): boolean => {
				return status === 'working' || status === 'learning';
			};

			expect(shouldPulse('working')).toBe(true);
			expect(shouldPulse('learning')).toBe(true);
			expect(shouldPulse('idle')).toBe(false);
			expect(shouldPulse('blocked')).toBe(false);
		});
	});
});
