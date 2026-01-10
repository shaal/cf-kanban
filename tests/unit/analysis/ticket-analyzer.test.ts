/**
 * TASK-046: Unit Tests for Ticket Analyzer
 *
 * Tests for ticket classification, keyword extraction, and agent suggestions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TicketAnalyzer,
  ticketAnalyzer,
  type TicketInput,
  type TicketType,
  type AgentType
} from '$lib/server/analysis/ticket-analyzer';

describe('TicketAnalyzer', () => {
  let analyzer: TicketAnalyzer;

  beforeEach(() => {
    analyzer = new TicketAnalyzer();
  });

  describe('classifyType', () => {
    describe('feature detection', () => {
      it('should classify "add" tickets as feature', () => {
        const result = analyzer.classifyType('add user authentication');
        expect(result.type).toBe('feature');
        expect(result.confidence).toBeGreaterThan(0);
      });

      it('should classify "implement" tickets as feature', () => {
        const result = analyzer.classifyType('implement websocket support');
        expect(result.type).toBe('feature');
      });

      it('should classify "create" tickets as feature', () => {
        const result = analyzer.classifyType('create new dashboard component');
        expect(result.type).toBe('feature');
      });

      it('should classify "build" tickets as feature', () => {
        const result = analyzer.classifyType('build notification system');
        expect(result.type).toBe('feature');
      });
    });

    describe('bug detection', () => {
      it('should classify "fix" tickets as bug', () => {
        const result = analyzer.classifyType('fix login error');
        expect(result.type).toBe('bug');
      });

      it('should classify "bug" tickets as bug', () => {
        const result = analyzer.classifyType('bug: user session not persisting');
        expect(result.type).toBe('bug');
      });

      it('should classify "error" related tickets as bug', () => {
        const result = analyzer.classifyType('resolve error in form validation');
        expect(result.type).toBe('bug');
      });

      it('should classify "crash" tickets as bug', () => {
        const result = analyzer.classifyType('app crash on startup');
        expect(result.type).toBe('bug');
      });
    });

    describe('refactor detection', () => {
      it('should classify "refactor" tickets as refactor', () => {
        const result = analyzer.classifyType('refactor authentication module');
        expect(result.type).toBe('refactor');
      });

      it('should classify "optimize" tickets as refactor', () => {
        const result = analyzer.classifyType('optimize database queries');
        expect(result.type).toBe('refactor');
      });

      it('should classify "improve" tickets as refactor', () => {
        const result = analyzer.classifyType('improve code organization');
        expect(result.type).toBe('refactor');
      });

      it('should classify "clean" tickets as refactor', () => {
        const result = analyzer.classifyType('clean up unused imports');
        expect(result.type).toBe('refactor');
      });
    });

    describe('docs detection', () => {
      it('should classify "document" tickets as docs', () => {
        const result = analyzer.classifyType('document api endpoints');
        expect(result.type).toBe('docs');
      });

      it('should classify "readme" tickets as docs', () => {
        const result = analyzer.classifyType('update readme with installation steps');
        expect(result.type).toBe('docs');
      });

      it('should classify "comment" tickets as docs', () => {
        // Note: "add" is also a feature keyword, but "comment" should win in docs context
        const result = analyzer.classifyType('comment the complex functions properly');
        expect(result.type).toBe('docs');
      });
    });

    describe('test detection', () => {
      it('should classify "test" tickets as test', () => {
        // Using multiple test keywords to ensure test wins over 'add' (feature)
        const result = analyzer.classifyType('test the user service with unit tests');
        expect(result.type).toBe('test');
      });

      it('should classify "coverage" tickets as test', () => {
        // Using 'coverage' with 'test' to ensure test type wins
        const result = analyzer.classifyType('increase test coverage for utils');
        expect(result.type).toBe('test');
      });

      it('should classify "e2e" tickets as test', () => {
        // Using multiple test keywords to ensure test wins
        const result = analyzer.classifyType('e2e tests for checkout flow using playwright');
        expect(result.type).toBe('test');
      });

      it('should classify "unit" test tickets as test', () => {
        const result = analyzer.classifyType('write unit tests for validators');
        expect(result.type).toBe('test');
      });
    });

    describe('chore detection', () => {
      it('should classify "update" dependency tickets as chore', () => {
        const result = analyzer.classifyType('update dependencies to latest');
        expect(result.type).toBe('chore');
      });

      it('should classify "upgrade" tickets as chore', () => {
        const result = analyzer.classifyType('upgrade typescript to v5');
        expect(result.type).toBe('chore');
      });

      it('should classify "config" tickets as chore', () => {
        const result = analyzer.classifyType('config eslint rules');
        expect(result.type).toBe('chore');
      });

      it('should classify "bump" tickets as chore', () => {
        const result = analyzer.classifyType('bump version to 2.0.0');
        expect(result.type).toBe('chore');
      });
    });

    describe('confidence scoring', () => {
      it('should have low confidence for ambiguous tickets', () => {
        const result = analyzer.classifyType('work on project stuff');
        expect(result.confidence).toBeLessThanOrEqual(0.5);
      });

      it('should have higher confidence with multiple matching keywords', () => {
        const result = analyzer.classifyType('fix bug error crash in login');
        expect(result.confidence).toBeGreaterThan(0.5);
      });

      it('should default to feature with no matches', () => {
        const result = analyzer.classifyType('some random text without keywords');
        expect(result.type).toBe('feature');
      });
    });
  });

  describe('extractKeywords', () => {
    it('should extract API-related keywords', () => {
      const keywords = analyzer.extractKeywords('create api endpoint for users');
      expect(keywords).toContain('api');
      expect(keywords).toContain('endpoint');
    });

    it('should extract database-related keywords', () => {
      const keywords = analyzer.extractKeywords('add database migration for schema');
      expect(keywords).toContain('database');
      expect(keywords).toContain('migration');
      expect(keywords).toContain('schema');
    });

    it('should extract security-related keywords', () => {
      const keywords = analyzer.extractKeywords('implement authentication and authorization');
      expect(keywords).toContain('authentication');
      expect(keywords).toContain('authorization');
    });

    it('should extract frontend-related keywords', () => {
      const keywords = analyzer.extractKeywords('build ui component with svelte and tailwind');
      expect(keywords).toContain('ui');
      expect(keywords).toContain('component');
      expect(keywords).toContain('svelte');
      expect(keywords).toContain('tailwind');
    });

    it('should extract realtime-related keywords', () => {
      const keywords = analyzer.extractKeywords('add websocket for real-time updates');
      expect(keywords).toContain('websocket');
      expect(keywords).toContain('real-time');
    });

    it('should return empty array when no keywords found', () => {
      const keywords = analyzer.extractKeywords('do something');
      expect(keywords).toHaveLength(0);
    });

    it('should not return duplicates', () => {
      const keywords = analyzer.extractKeywords('api api api endpoint');
      const apiCount = keywords.filter((k) => k === 'api').length;
      expect(apiCount).toBe(1);
    });
  });

  describe('suggestAgents', () => {
    it('should suggest correct agents for feature type', () => {
      const agents = analyzer.suggestAgents('feature', []);
      expect(agents).toContain('planner');
      expect(agents).toContain('coder');
      expect(agents).toContain('tester');
      expect(agents).toContain('reviewer');
    });

    it('should suggest correct agents for bug type', () => {
      const agents = analyzer.suggestAgents('bug', []);
      expect(agents).toContain('researcher');
      expect(agents).toContain('coder');
      expect(agents).toContain('tester');
    });

    it('should suggest correct agents for refactor type', () => {
      const agents = analyzer.suggestAgents('refactor', []);
      expect(agents).toContain('architect');
      expect(agents).toContain('coder');
      expect(agents).toContain('reviewer');
    });

    it('should suggest correct agents for docs type', () => {
      const agents = analyzer.suggestAgents('docs', []);
      expect(agents).toContain('researcher');
      expect(agents).toContain('api-docs');
    });

    it('should suggest correct agents for test type', () => {
      const agents = analyzer.suggestAgents('test', []);
      expect(agents).toContain('tester');
      expect(agents).toContain('reviewer');
    });

    it('should suggest correct agents for chore type', () => {
      const agents = analyzer.suggestAgents('chore', []);
      expect(agents).toContain('coder');
    });

    it('should add security-auditor for security-related keywords', () => {
      const agents = analyzer.suggestAgents('feature', ['auth', 'security']);
      expect(agents).toContain('security-auditor');
    });

    it('should add architect for database-related keywords', () => {
      const agents = analyzer.suggestAgents('feature', ['database', 'schema']);
      expect(agents).toContain('architect');
    });
  });

  describe('analyze (full integration)', () => {
    it('should analyze a feature ticket correctly', () => {
      const ticket: TicketInput = {
        title: 'Add user authentication with JWT',
        description: 'Implement secure authentication using JWT tokens and OAuth2'
      };

      const result = analyzer.analyze(ticket);

      expect(result.ticketType).toBe('feature');
      expect(result.keywords).toContain('authentication');
      expect(result.suggestedAgents).toContain('security-auditor');
      expect(result.intent).toBe('addition');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should analyze a bug ticket correctly', () => {
      const ticket: TicketInput = {
        title: 'Fix login error when session expires',
        description: 'Users see error message when their session times out'
      };

      const result = analyzer.analyze(ticket);

      expect(result.ticketType).toBe('bug');
      expect(result.suggestedAgents).toContain('coder');
      expect(result.intent).toBe('correction');
    });

    it('should analyze a refactor ticket correctly', () => {
      const ticket: TicketInput = {
        title: 'Refactor database queries for performance',
        description: 'Optimize slow queries in the user service'
      };

      const result = analyzer.analyze(ticket);

      expect(result.ticketType).toBe('refactor');
      expect(result.keywords).toContain('database');
      expect(result.keywords).toContain('performance');
      expect(result.suggestedAgents).toContain('architect');
      expect(result.intent).toBe('refactoring');
    });

    it('should handle tickets with null description', () => {
      const ticket: TicketInput = {
        title: 'Create new component',
        description: null
      };

      const result = analyzer.analyze(ticket);

      expect(result.ticketType).toBe('feature');
      expect(result.keywords).toContain('component');
    });

    it('should suggest hierarchical topology for complex tickets', () => {
      const ticket: TicketInput = {
        title: 'Implement system-wide logging across all services',
        description: 'Add comprehensive logging to multiple components'
      };

      const result = analyzer.analyze(ticket);

      expect(result.suggestedTopology).toBe('hierarchical');
    });

    it('should suggest mesh topology for collaborative tickets', () => {
      const ticket: TicketInput = {
        title: 'Write unit tests for service',
        description: 'Write tests for the auth service'
      };

      const result = analyzer.analyze(ticket);

      // Test type has 2 agents (tester, reviewer), so mesh is appropriate for 2-3 agents
      expect(result.suggestedTopology).toBe('mesh');
    });

    it('should suggest mesh topology for simple multi-agent tickets', () => {
      const ticket: TicketInput = {
        title: 'Document the api',
        description: 'Add jsdoc comments'
      };

      const result = analyzer.analyze(ticket);

      // Docs type has 2 agents (researcher, api-docs), so mesh is appropriate
      expect(result.suggestedTopology).toBe('mesh');
    });

    it('should include existing labels in suggested labels', () => {
      const ticket: TicketInput = {
        title: 'Add new feature',
        description: 'Build something new',
        labels: ['priority-high', 'sprint-1']
      };

      const result = analyzer.analyze(ticket);

      expect(result.suggestedLabels).toContain('priority-high');
      expect(result.suggestedLabels).toContain('sprint-1');
      expect(result.suggestedLabels).toContain('feature');
    });

    it('should add security label for auth-related tickets', () => {
      const ticket: TicketInput = {
        title: 'Add authentication middleware',
        description: null
      };

      const result = analyzer.analyze(ticket);

      expect(result.suggestedLabels).toContain('security');
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(ticketAnalyzer).toBeInstanceOf(TicketAnalyzer);
    });

    it('should work with the singleton', () => {
      const result = ticketAnalyzer.analyze({
        title: 'Fix bug in login',
        description: null
      });

      expect(result.ticketType).toBe('bug');
    });
  });
});
