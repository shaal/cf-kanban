/**
 * TASK-007: State Machine Tests (TDD - RED Phase)
 *
 * These tests define the expected behavior of the TicketStateMachine.
 *
 * Test Coverage:
 * - All valid transitions per swim-lane design
 * - Invalid transition rejections
 * - Terminal state behavior
 * - Helper functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TICKET_STATES,
  VALID_TRANSITIONS,
  InvalidTransitionError,
  isTerminalState,
  getIncomingTransitions,
  getOutgoingTransitions,
  type TicketState
} from '$lib/state-machine/types';
import { TicketStateMachine } from '$lib/state-machine/ticket-state-machine';

describe('State Machine Types', () => {
  describe('TICKET_STATES', () => {
    it('should have exactly 8 states', () => {
      expect(TICKET_STATES).toHaveLength(8);
    });

    it('should include all required states', () => {
      const expectedStates = [
        'BACKLOG',
        'TODO',
        'IN_PROGRESS',
        'NEEDS_FEEDBACK',
        'READY_TO_RESUME',
        'REVIEW',
        'DONE',
        'CANCELLED'
      ];
      expectedStates.forEach((state) => {
        expect(TICKET_STATES).toContain(state);
      });
    });
  });

  describe('VALID_TRANSITIONS', () => {
    it('should define transitions for all states', () => {
      TICKET_STATES.forEach((state) => {
        expect(VALID_TRANSITIONS[state]).toBeDefined();
        expect(Array.isArray(VALID_TRANSITIONS[state])).toBe(true);
      });
    });

    it('should have DONE as terminal state with no outgoing transitions', () => {
      expect(VALID_TRANSITIONS.DONE).toEqual([]);
    });

    it('should allow CANCELLED to reopen to BACKLOG', () => {
      expect(VALID_TRANSITIONS.CANCELLED).toContain('BACKLOG');
    });
  });

  describe('isTerminalState', () => {
    it('should return true for DONE state', () => {
      expect(isTerminalState('DONE')).toBe(true);
    });

    it('should return false for non-terminal states', () => {
      const nonTerminalStates: TicketState[] = [
        'BACKLOG',
        'TODO',
        'IN_PROGRESS',
        'NEEDS_FEEDBACK',
        'READY_TO_RESUME',
        'REVIEW',
        'CANCELLED'
      ];
      nonTerminalStates.forEach((state) => {
        expect(isTerminalState(state)).toBe(false);
      });
    });
  });

  describe('getIncomingTransitions', () => {
    it('should return states that can transition to DONE', () => {
      const incoming = getIncomingTransitions('DONE');
      expect(incoming).toContain('REVIEW');
      expect(incoming).toHaveLength(1);
    });

    it('should return states that can transition to IN_PROGRESS', () => {
      const incoming = getIncomingTransitions('IN_PROGRESS');
      expect(incoming).toContain('TODO');
      expect(incoming).toContain('READY_TO_RESUME');
      expect(incoming).toContain('REVIEW');
    });
  });

  describe('getOutgoingTransitions', () => {
    it('should return valid transitions for BACKLOG', () => {
      const outgoing = getOutgoingTransitions('BACKLOG');
      expect(outgoing).toContain('TODO');
      expect(outgoing).toContain('CANCELLED');
      expect(outgoing).toHaveLength(2);
    });

    it('should return empty array for DONE', () => {
      const outgoing = getOutgoingTransitions('DONE');
      expect(outgoing).toEqual([]);
    });
  });
});

describe('TicketStateMachine', () => {
  let stateMachine: TicketStateMachine;

  beforeEach(() => {
    stateMachine = new TicketStateMachine();
  });

  describe('canTransition', () => {
    describe('valid transitions', () => {
      it('should allow BACKLOG -> TODO', () => {
        expect(stateMachine.canTransition('BACKLOG', 'TODO')).toBe(true);
      });

      it('should allow BACKLOG -> CANCELLED', () => {
        expect(stateMachine.canTransition('BACKLOG', 'CANCELLED')).toBe(true);
      });

      it('should allow TODO -> IN_PROGRESS', () => {
        expect(stateMachine.canTransition('TODO', 'IN_PROGRESS')).toBe(true);
      });

      it('should allow TODO -> BACKLOG (deprioritize)', () => {
        expect(stateMachine.canTransition('TODO', 'BACKLOG')).toBe(true);
      });

      it('should allow TODO -> CANCELLED', () => {
        expect(stateMachine.canTransition('TODO', 'CANCELLED')).toBe(true);
      });

      it('should allow IN_PROGRESS -> NEEDS_FEEDBACK', () => {
        expect(stateMachine.canTransition('IN_PROGRESS', 'NEEDS_FEEDBACK')).toBe(true);
      });

      it('should allow IN_PROGRESS -> REVIEW', () => {
        expect(stateMachine.canTransition('IN_PROGRESS', 'REVIEW')).toBe(true);
      });

      it('should allow IN_PROGRESS -> TODO (pause work)', () => {
        expect(stateMachine.canTransition('IN_PROGRESS', 'TODO')).toBe(true);
      });

      it('should allow IN_PROGRESS -> CANCELLED', () => {
        expect(stateMachine.canTransition('IN_PROGRESS', 'CANCELLED')).toBe(true);
      });

      it('should allow NEEDS_FEEDBACK -> READY_TO_RESUME', () => {
        expect(stateMachine.canTransition('NEEDS_FEEDBACK', 'READY_TO_RESUME')).toBe(true);
      });

      it('should allow NEEDS_FEEDBACK -> CANCELLED', () => {
        expect(stateMachine.canTransition('NEEDS_FEEDBACK', 'CANCELLED')).toBe(true);
      });

      it('should allow READY_TO_RESUME -> IN_PROGRESS', () => {
        expect(stateMachine.canTransition('READY_TO_RESUME', 'IN_PROGRESS')).toBe(true);
      });

      it('should allow REVIEW -> DONE', () => {
        expect(stateMachine.canTransition('REVIEW', 'DONE')).toBe(true);
      });

      it('should allow REVIEW -> IN_PROGRESS (rejection)', () => {
        expect(stateMachine.canTransition('REVIEW', 'IN_PROGRESS')).toBe(true);
      });

      it('should allow REVIEW -> CANCELLED', () => {
        expect(stateMachine.canTransition('REVIEW', 'CANCELLED')).toBe(true);
      });

      it('should allow CANCELLED -> BACKLOG (reopen)', () => {
        expect(stateMachine.canTransition('CANCELLED', 'BACKLOG')).toBe(true);
      });
    });

    describe('invalid transitions', () => {
      it('should reject BACKLOG -> DONE (skip states)', () => {
        expect(stateMachine.canTransition('BACKLOG', 'DONE')).toBe(false);
      });

      it('should reject BACKLOG -> IN_PROGRESS (skip TODO)', () => {
        expect(stateMachine.canTransition('BACKLOG', 'IN_PROGRESS')).toBe(false);
      });

      it('should reject BACKLOG -> REVIEW', () => {
        expect(stateMachine.canTransition('BACKLOG', 'REVIEW')).toBe(false);
      });

      it('should reject TODO -> DONE (skip states)', () => {
        expect(stateMachine.canTransition('TODO', 'DONE')).toBe(false);
      });

      it('should reject TODO -> REVIEW (skip IN_PROGRESS)', () => {
        expect(stateMachine.canTransition('TODO', 'REVIEW')).toBe(false);
      });

      it('should reject DONE -> any state (terminal)', () => {
        TICKET_STATES.forEach((state) => {
          if (state !== 'DONE') {
            expect(stateMachine.canTransition('DONE', state)).toBe(false);
          }
        });
      });

      it('should reject self-transition (same state)', () => {
        TICKET_STATES.forEach((state) => {
          expect(stateMachine.canTransition(state, state)).toBe(false);
        });
      });

      it('should reject NEEDS_FEEDBACK -> REVIEW (wrong path)', () => {
        expect(stateMachine.canTransition('NEEDS_FEEDBACK', 'REVIEW')).toBe(false);
      });

      it('should reject READY_TO_RESUME -> DONE (skip states)', () => {
        expect(stateMachine.canTransition('READY_TO_RESUME', 'DONE')).toBe(false);
      });

      it('should reject CANCELLED -> DONE', () => {
        expect(stateMachine.canTransition('CANCELLED', 'DONE')).toBe(false);
      });

      it('should reject CANCELLED -> IN_PROGRESS (must go through BACKLOG)', () => {
        expect(stateMachine.canTransition('CANCELLED', 'IN_PROGRESS')).toBe(false);
      });
    });
  });
});

describe('InvalidTransitionError', () => {
  it('should have correct fromState and toState properties', () => {
    const error = new InvalidTransitionError('BACKLOG', 'DONE');

    expect(error.fromState).toBe('BACKLOG');
    expect(error.toState).toBe('DONE');
    expect(error.name).toBe('InvalidTransitionError');
    expect(error.message).toBe('Invalid transition from BACKLOG to DONE');
  });

  it('should be instanceof Error', () => {
    const error = new InvalidTransitionError('TODO', 'DONE');
    expect(error).toBeInstanceOf(Error);
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
