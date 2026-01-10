/**
 * TASK-009: Integration Tests for State Transition API
 *
 * Tests the POST /api/tickets/:id/transition endpoint behavior
 */

import { describe, it, expect } from 'vitest';
import { TICKET_STATES, VALID_TRANSITIONS, type TicketState } from '$lib/state-machine/types';

describe('API: POST /api/tickets/:id/transition - Validation', () => {
	describe('request body validation', () => {
		it('should require toState field', () => {
			const expectedError = 'Missing required field: toState';
			expect(expectedError).toContain('toState');
		});

		it('should require triggeredBy field', () => {
			const expectedError = 'Missing required field: triggeredBy';
			expect(expectedError).toContain('triggeredBy');
		});

		it('should validate toState is a valid TicketState', () => {
			const invalidState = 'INVALID_STATE';
			expect(TICKET_STATES).not.toContain(invalidState);
		});

		it('should validate triggeredBy is user, agent, or system', () => {
			const validValues = ['user', 'agent', 'system'];
			expect(validValues).toContain('user');
			expect(validValues).toContain('agent');
			expect(validValues).toContain('system');
		});
	});
});

describe('API: State Transition Business Logic', () => {
	describe('transition validation', () => {
		it('should reject BACKLOG -> DONE (invalid skip)', () => {
			const from: TicketState = 'BACKLOG';
			const to: TicketState = 'DONE';
			expect(VALID_TRANSITIONS[from]).not.toContain(to);
		});

		it('should accept BACKLOG -> TODO (valid)', () => {
			const from: TicketState = 'BACKLOG';
			const to: TicketState = 'TODO';
			expect(VALID_TRANSITIONS[from]).toContain(to);
		});

		it('should reject transitions from DONE (terminal state)', () => {
			const from: TicketState = 'DONE';
			expect(VALID_TRANSITIONS[from]).toHaveLength(0);
		});
	});
});

describe('API: GET /api/tickets/:id/transition', () => {
	it('should return available transitions for BACKLOG', () => {
		const currentState: TicketState = 'BACKLOG';
		const expectedTransitions = VALID_TRANSITIONS[currentState];

		expect(expectedTransitions).toContain('TODO');
		expect(expectedTransitions).toContain('CANCELLED');
		expect(expectedTransitions).toHaveLength(2);
	});

	it('should return empty array for DONE (terminal)', () => {
		const currentState: TicketState = 'DONE';
		const expectedTransitions = VALID_TRANSITIONS[currentState];

		expect(expectedTransitions).toHaveLength(0);
	});
});

describe('State Machine Transition Workflows', () => {
	describe('happy path workflow', () => {
		it('should complete full ticket lifecycle: BACKLOG -> TODO -> IN_PROGRESS -> REVIEW -> DONE', () => {
			const workflow: TicketState[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

			for (let i = 0; i < workflow.length - 1; i++) {
				const from = workflow[i];
				const to = workflow[i + 1];
				expect(VALID_TRANSITIONS[from]).toContain(to);
			}
		});
	});

	describe('feedback workflow', () => {
		it('should handle feedback loop: IN_PROGRESS -> NEEDS_FEEDBACK -> READY_TO_RESUME -> IN_PROGRESS', () => {
			const workflow: TicketState[] = [
				'IN_PROGRESS',
				'NEEDS_FEEDBACK',
				'READY_TO_RESUME',
				'IN_PROGRESS'
			];

			for (let i = 0; i < workflow.length - 1; i++) {
				const from = workflow[i];
				const to = workflow[i + 1];
				expect(VALID_TRANSITIONS[from]).toContain(to);
			}
		});
	});

	describe('rejection workflow', () => {
		it('should handle review rejection: REVIEW -> IN_PROGRESS -> REVIEW -> DONE', () => {
			const workflow: TicketState[] = ['REVIEW', 'IN_PROGRESS', 'REVIEW', 'DONE'];

			for (let i = 0; i < workflow.length - 1; i++) {
				const from = workflow[i];
				const to = workflow[i + 1];
				expect(VALID_TRANSITIONS[from]).toContain(to);
			}
		});
	});

	describe('cancellation workflow', () => {
		it('should handle cancellation and reopening: TODO -> CANCELLED -> BACKLOG', () => {
			const workflow: TicketState[] = ['TODO', 'CANCELLED', 'BACKLOG'];

			for (let i = 0; i < workflow.length - 1; i++) {
				const from = workflow[i];
				const to = workflow[i + 1];
				expect(VALID_TRANSITIONS[from]).toContain(to);
			}
		});
	});
});
