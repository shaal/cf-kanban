/**
 * TASK-063: Unit Tests for Agent Router
 *
 * Tests for the agent assignment service that routes tickets to appropriate
 * agents based on analysis results and learned patterns.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the Claude Flow CLI - use vi.hoisted to ensure mock is available during hoisting
const { mockExecute } = vi.hoisted(() => ({
  mockExecute: vi.fn()
}));

vi.mock('$lib/server/claude-flow/cli', () => ({
  claudeFlowCLI: {
    execute: mockExecute,
    executeJson: vi.fn()
  }
}));

// Import after mocks
import {
  AgentRouter,
  agentRouter,
  type AgentAssignment,
  type AgentConfig,
  AGENT_CAPABILITIES
} from '$lib/server/assignment/agent-router';
import type { AnalysisResult } from '$lib/server/analysis/ticket-analyzer';

describe('Agent Router', () => {
  let router: AgentRouter;

  beforeEach(() => {
    router = new AgentRouter();
    vi.clearAllMocks();
    mockExecute.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0, timedOut: false });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('assignAgents', () => {
    describe('basic assignment from analysis', () => {
      it('should assign agents based on suggested agents from analysis', async () => {
        const analysis: AnalysisResult = createMockAnalysis({
          ticketType: 'feature',
          suggestedAgents: ['planner', 'coder', 'tester', 'reviewer'],
          confidence: 0.8
        });

        const result = await router.assignAgents(analysis);

        expect(result.agents.length).toBe(4);
        expect(result.agents.map(a => a.type)).toContain('planner');
        expect(result.agents.map(a => a.type)).toContain('coder');
        expect(result.agents.map(a => a.type)).toContain('tester');
        expect(result.agents.map(a => a.type)).toContain('reviewer');
      });

      it('should assign roles based on position and complexity', async () => {
        const analysis: AnalysisResult = createMockAnalysis({
          ticketType: 'feature',
          suggestedAgents: ['coordinator', 'coder', 'tester'],
          suggestedTopology: 'hierarchical',
          confidence: 0.8
        });

        const result = await router.assignAgents(analysis);

        const coordinator = result.agents.find(a => a.type === 'coordinator');
        expect(coordinator?.role).toBe('coordinator');

        const workers = result.agents.filter(a => a.type !== 'coordinator');
        workers.forEach(w => {
          expect(w.role).toBe('worker');
        });
      });

      it('should assign priority based on agent order', async () => {
        const analysis: AnalysisResult = createMockAnalysis({
          ticketType: 'feature',
          suggestedAgents: ['coder', 'tester', 'reviewer'],
          confidence: 0.8
        });

        const result = await router.assignAgents(analysis);

        const coder = result.agents.find(a => a.type === 'coder');
        const reviewer = result.agents.find(a => a.type === 'reviewer');

        expect(coder?.priority).toBeGreaterThan(reviewer?.priority || 0);
      });
    });

    describe('topology selection', () => {
      it('should use single topology for 1 agent', async () => {
        const analysis: AnalysisResult = createMockAnalysis({
          ticketType: 'chore',
          suggestedAgents: ['coder'],
          suggestedTopology: 'single',
          confidence: 0.6
        });

        const result = await router.assignAgents(analysis);

        expect(result.topology).toBe('single');
      });

      it('should use mesh topology for low complexity', async () => {
        const analysis: AnalysisResult = createMockAnalysis({
          ticketType: 'bug',
          suggestedAgents: ['researcher', 'coder', 'tester'],
          suggestedTopology: 'mesh',
          confidence: 0.8
        });

        const result = await router.assignAgents(analysis);

        expect(result.topology).toBe('mesh');
      });

      it('should upgrade to hierarchical for 4+ agents', async () => {
        const analysis: AnalysisResult = createMockAnalysis({
          ticketType: 'feature',
          suggestedAgents: ['planner', 'coder', 'tester', 'reviewer', 'api-docs'],
          suggestedTopology: 'mesh',
          confidence: 0.7
        });

        const result = await router.assignAgents(analysis);

        expect(result.topology).toBe('hierarchical');
        expect(result.reasoning).toContain('Upgraded to hierarchical topology for 4+ agents');
      });

      it('should use hierarchical for high complexity', async () => {
        const analysis: AnalysisResult = createMockAnalysis({
          ticketType: 'feature',
          suggestedAgents: ['coordinator', 'coder', 'tester'],
          suggestedTopology: 'hierarchical',
          confidence: 0.85
        });

        const result = await router.assignAgents(analysis);

        expect(result.topology).toBe('hierarchical');
      });
    });

    describe('coordinator management', () => {
      it('should add coordinator for hierarchical topology if not present', async () => {
        const analysis: AnalysisResult = createMockAnalysis({
          ticketType: 'feature',
          suggestedAgents: ['coder', 'tester', 'reviewer', 'api-docs', 'security-auditor'],
          suggestedTopology: 'hierarchical',
          confidence: 0.75
        });

        const result = await router.assignAgents(analysis);

        expect(result.topology).toBe('hierarchical');
        // Should have a coordinator (either added or first agent promoted)
        expect(result.agents.find(a => a.role === 'coordinator')).toBeDefined();
      });

      it('should not add duplicate coordinator', async () => {
        const analysis: AnalysisResult = createMockAnalysis({
          ticketType: 'feature',
          suggestedAgents: ['coordinator', 'coder', 'tester'],
          suggestedTopology: 'hierarchical',
          confidence: 0.75
        });

        const result = await router.assignAgents(analysis);

        const coordinators = result.agents.filter(a => a.type === 'coordinator');
        expect(coordinators.length).toBe(1);
      });

      it('should have coordinator with correct role in hierarchical topology', async () => {
        const analysis: AnalysisResult = createMockAnalysis({
          ticketType: 'feature',
          suggestedAgents: ['coordinator', 'coder', 'tester', 'reviewer', 'api-docs'],
          suggestedTopology: 'hierarchical',
          confidence: 0.75
        });

        const result = await router.assignAgents(analysis);

        const coordinator = result.agents.find(a => a.role === 'coordinator');
        expect(coordinator).toBeDefined();
        expect(coordinator?.role).toBe('coordinator');
      });
    });

    describe('learned patterns', () => {
      it('should use learned pattern when available and successful', async () => {
        mockExecute.mockResolvedValue({
          stdout: 'agents: [coordinator, coder, tester] topology: hierarchical success: 0.85',
          stderr: '',
          exitCode: 0,
          timedOut: false
        });

        const analysis: AnalysisResult = createMockAnalysis({
          ticketType: 'feature',
          keywords: ['api', 'database'],
          suggestedAgents: ['planner', 'coder'],
          confidence: 0.7
        });

        const result = await router.assignAgents(analysis);

        // Should use learned pattern with high success rate
        expect(result.confidence).toBeGreaterThan(0.7);
        expect(result.reasoning.some(r => r.includes('learned pattern'))).toBe(true);
      });

      it('should not use learned pattern with low success rate', async () => {
        mockExecute.mockResolvedValue({
          stdout: 'agents: [coder] topology: single success: 0.4',
          stderr: '',
          exitCode: 0,
          timedOut: false
        });

        const analysis: AnalysisResult = createMockAnalysis({
          ticketType: 'feature',
          suggestedAgents: ['planner', 'coder', 'tester'],
          confidence: 0.7
        });

        const result = await router.assignAgents(analysis);

        // Should fall back to analysis-based assignment
        expect(result.agents.length).toBeGreaterThan(1);
      });

      it('should handle pattern search failure gracefully', async () => {
        mockExecute.mockRejectedValue(new Error('CLI unavailable'));

        const analysis: AnalysisResult = createMockAnalysis({
          ticketType: 'bug',
          suggestedAgents: ['researcher', 'coder', 'tester'],
          confidence: 0.8
        });

        const result = await router.assignAgents(analysis);

        // Should still return valid assignment
        expect(result.agents.length).toBeGreaterThan(0);
        // Confidence is analysis.confidence * 0.8 when no pattern
        expect(result.confidence).toBeCloseTo(0.64, 2);
      });
    });

    describe('reasoning', () => {
      it('should include ticket type in reasoning', async () => {
        const analysis: AnalysisResult = createMockAnalysis({
          ticketType: 'bug',
          confidence: 0.8
        });

        const result = await router.assignAgents(analysis);

        expect(result.reasoning.some(r => r.includes('bug'))).toBe(true);
      });

      it('should include confidence in reasoning', async () => {
        const analysis: AnalysisResult = createMockAnalysis({
          ticketType: 'feature',
          confidence: 0.85
        });

        const result = await router.assignAgents(analysis);

        expect(result.reasoning.some(r => r.includes('confidence'))).toBe(true);
      });

      it('should explain each agent addition', async () => {
        const analysis: AnalysisResult = createMockAnalysis({
          ticketType: 'feature',
          suggestedAgents: ['planner', 'coder'],
          confidence: 0.8
        });

        const result = await router.assignAgents(analysis);

        expect(result.reasoning.some(r => r.includes('planner'))).toBe(true);
        expect(result.reasoning.some(r => r.includes('coder'))).toBe(true);
      });
    });

    describe('confidence scoring', () => {
      it('should have reduced confidence without learned patterns', async () => {
        const analysis: AnalysisResult = createMockAnalysis({
          ticketType: 'feature',
          confidence: 0.7
        });

        const result = await router.assignAgents(analysis);

        // Confidence is analysis.confidence * 0.8 when no pattern
        expect(result.confidence).toBeCloseTo(0.56, 2);
      });

      it('should have higher confidence with successful learned pattern', async () => {
        mockExecute.mockResolvedValue({
          stdout: 'agents: [coder, tester] topology: mesh success: 0.9',
          stderr: '',
          exitCode: 0,
          timedOut: false
        });

        const analysis: AnalysisResult = createMockAnalysis({
          ticketType: 'feature',
          keywords: ['api'],
          confidence: 0.8
        });

        const result = await router.assignAgents(analysis);

        expect(result.confidence).toBeGreaterThanOrEqual(0.7);
      });
    });

    describe('edge cases', () => {
      it('should handle empty suggested agents', async () => {
        const analysis: AnalysisResult = createMockAnalysis({
          ticketType: 'feature',
          suggestedAgents: [],
          confidence: 0.6
        });

        const result = await router.assignAgents(analysis);

        // Should still return a valid result, possibly with default agents
        expect(result).toBeDefined();
        expect(result.topology).toBeDefined();
      });

      it('should handle high confidence analysis', async () => {
        const analysis: AnalysisResult = createMockAnalysis({
          ticketType: 'feature',
          confidence: 0.95,
          suggestedAgents: ['coordinator', 'coder', 'tester', 'reviewer'],
          suggestedTopology: 'hierarchical'
        });

        const result = await router.assignAgents(analysis);

        expect(result.topology).toBe('hierarchical');
        expect(result.agents.find(a => a.role === 'coordinator')).toBeDefined();
      });

      it('should handle unknown ticket type', async () => {
        const analysis: AnalysisResult = createMockAnalysis({
          ticketType: 'unknown' as any,
          confidence: 0.8
        });

        const result = await router.assignAgents(analysis);

        expect(result).toBeDefined();
        expect(result.agents.length).toBeGreaterThan(0);
      });
    });
  });

  describe('storeSuccessfulAssignment', () => {
    it('should store pattern in Claude Flow memory', async () => {
      const analysis: AnalysisResult = createMockAnalysis({
        ticketType: 'feature',
        keywords: ['api', 'database'],
        confidence: 0.7
      });

      const assignment: AgentAssignment = {
        agents: [
          { type: 'coder', role: 'worker', priority: 1 },
          { type: 'tester', role: 'worker', priority: 2 }
        ],
        topology: 'mesh',
        confidence: 0.8,
        reasoning: ['Test reasoning'],
        fromPattern: false
      };

      await router.storeSuccessfulAssignment(analysis, assignment, 0.9);

      expect(mockExecute).toHaveBeenCalledWith(
        'memory',
        expect.arrayContaining([
          'store',
          '--key',
          expect.stringContaining('pattern-'),
          '--value',
          expect.stringContaining('coder'),
          '--namespace',
          'agent-assignments'
        ])
      );
    });

    it('should include success rate in stored pattern', async () => {
      const analysis: AnalysisResult = createMockAnalysis({
        ticketType: 'bug',
        confidence: 0.8
      });

      const assignment: AgentAssignment = {
        agents: [{ type: 'coder', role: 'worker', priority: 1 }],
        topology: 'single',
        confidence: 0.7,
        reasoning: [],
        fromPattern: false
      };

      await router.storeSuccessfulAssignment(analysis, assignment, 0.95);

      expect(mockExecute).toHaveBeenCalledWith(
        'memory',
        expect.arrayContaining([
          '--value',
          expect.stringContaining('0.95')
        ])
      );
    });

    it('should handle storage failure gracefully', async () => {
      mockExecute.mockRejectedValue(new Error('Storage failed'));

      const analysis: AnalysisResult = createMockAnalysis({
        ticketType: 'feature',
        confidence: 0.7
      });

      const assignment: AgentAssignment = {
        agents: [{ type: 'coder', role: 'worker', priority: 1 }],
        topology: 'single',
        confidence: 0.7,
        reasoning: [],
        fromPattern: false
      };

      // Should return false on failure
      const result = await router.storeSuccessfulAssignment(analysis, assignment, 0.9);
      expect(result).toBe(false);
    });

    it('should return true on successful storage', async () => {
      mockExecute.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0, timedOut: false });

      const analysis: AnalysisResult = createMockAnalysis({
        ticketType: 'feature',
        confidence: 0.7
      });

      const assignment: AgentAssignment = {
        agents: [{ type: 'coder', role: 'worker', priority: 1 }],
        topology: 'single',
        confidence: 0.7,
        reasoning: [],
        fromPattern: false
      };

      const result = await router.storeSuccessfulAssignment(analysis, assignment, 0.9);
      expect(result).toBe(true);
    });
  });

  describe('getAgentCapabilities', () => {
    it('should return capabilities for coder agent', () => {
      const capabilities = router.getAgentCapabilities('coder');
      expect(capabilities).toContain('implementation');
      expect(capabilities).toContain('coding');
    });

    it('should return capabilities for security-auditor agent', () => {
      const capabilities = router.getAgentCapabilities('security-auditor');
      expect(capabilities).toContain('security-audit');
      expect(capabilities).toContain('vulnerability');
    });

    it('should return empty array for unknown agent type', () => {
      const capabilities = router.getAgentCapabilities('unknown' as any);
      expect(capabilities).toEqual([]);
    });
  });

  describe('scoreAgentMatch', () => {
    it('should return 1.0 for perfect match', () => {
      const score = router.scoreAgentMatch('coder', ['implementation', 'coding']);
      expect(score).toBe(1.0);
    });

    it('should return 0 for no match', () => {
      const score = router.scoreAgentMatch('coder', ['documentation', 'api']);
      expect(score).toBe(0);
    });

    it('should return partial score for partial match', () => {
      const score = router.scoreAgentMatch('coder', ['implementation', 'documentation']);
      expect(score).toBe(0.5);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton', () => {
      expect(agentRouter).toBeInstanceOf(AgentRouter);
    });
  });
});

// Helper function to create mock analysis results
function createMockAnalysis(overrides: Partial<AnalysisResult>): AnalysisResult {
  return {
    ticketType: 'feature',
    keywords: [],
    suggestedLabels: [],
    confidence: 0.7,
    suggestedAgents: ['coder', 'tester'],
    suggestedTopology: 'mesh',
    intent: 'addition',
    ...overrides
  };
}
