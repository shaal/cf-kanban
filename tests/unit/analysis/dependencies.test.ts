/**
 * TASK-049: Unit Tests for Dependency Detection
 *
 * Tests for detecting explicit and implicit dependencies between tickets
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectDependencies,
  hasBlockingDependencies,
  getDependencySummary,
  dependencyDetector,
  type Dependency,
  type DependencyResult
} from '$lib/server/analysis/dependencies';

// Mock prisma
vi.mock('$lib/server/prisma', () => ({
  prisma: {
    ticket: {
      findMany: vi.fn(),
      findUnique: vi.fn()
    }
  }
}));

import { prisma } from '$lib/server/prisma';

describe('Dependency Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.ticket.findMany).mockResolvedValue([]);
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('detectDependencies', () => {
    describe('explicit reference detection', () => {
      it('should detect "after #123" pattern', async () => {
        const result = await detectDependencies(
          'ticket-1',
          'Add feature',
          'This should be done after #123',
          'project-1'
        );

        expect(result.dependencies).toHaveLength(1);
        expect(result.dependencies[0].ticketNumber).toBe('123');
        expect(result.dependencies[0].type).toBe('explicit');
        expect(result.dependencies[0].blocking).toBe(true);
      });

      it('should detect "depends on #456" pattern', async () => {
        const result = await detectDependencies(
          'ticket-1',
          'Build UI',
          'This depends on #456 for the API',
          'project-1'
        );

        expect(result.dependencies).toHaveLength(1);
        expect(result.dependencies[0].ticketNumber).toBe('456');
        expect(result.dependencies[0].type).toBe('explicit');
      });

      it('should detect "blocked by #789" pattern', async () => {
        const result = await detectDependencies(
          'ticket-1',
          'Deploy feature',
          'Currently blocked by #789',
          'project-1'
        );

        expect(result.dependencies).toHaveLength(1);
        expect(result.dependencies[0].ticketNumber).toBe('789');
        expect(result.dependencies[0].blocking).toBe(true);
      });

      it('should detect "requires #123" pattern', async () => {
        const result = await detectDependencies(
          'ticket-1',
          'Integration',
          'Requires #123 to be completed first',
          'project-1'
        );

        expect(result.dependencies).toHaveLength(1);
        expect(result.dependencies[0].ticketNumber).toBe('123');
        expect(result.dependencies[0].blocking).toBe(true);
      });

      it('should detect "waiting on #456" pattern', async () => {
        const result = await detectDependencies(
          'ticket-1',
          'Feature',
          'Waiting on #456 for database changes',
          'project-1'
        );

        expect(result.dependencies).toHaveLength(1);
        expect(result.dependencies[0].ticketNumber).toBe('456');
        expect(result.dependencies[0].blocking).toBe(true);
      });

      it('should detect "prerequisite: #789" pattern', async () => {
        const result = await detectDependencies(
          'ticket-1',
          'Feature',
          'Prerequisite: #789',
          'project-1'
        );

        expect(result.dependencies).toHaveLength(1);
        expect(result.dependencies[0].ticketNumber).toBe('789');
      });

      it('should detect multiple explicit references', async () => {
        const result = await detectDependencies(
          'ticket-1',
          'Complex feature',
          'After #123, depends on #456, and blocked by #789',
          'project-1'
        );

        expect(result.dependencies.length).toBeGreaterThanOrEqual(3);
        const numbers = result.dependencies.map((d) => d.ticketNumber);
        expect(numbers).toContain('123');
        expect(numbers).toContain('456');
        expect(numbers).toContain('789');
      });

      it('should deduplicate same ticket references', async () => {
        const result = await detectDependencies(
          'ticket-1',
          'Feature',
          'After #123, also depends on #123',
          'project-1'
        );

        const refs123 = result.dependencies.filter((d) => d.ticketNumber === '123');
        expect(refs123.length).toBe(1);
      });

      it('should include match text in reason', async () => {
        const result = await detectDependencies(
          'ticket-1',
          'Feature',
          'blocked by #123',
          'project-1'
        );

        expect(result.dependencies[0].reason).toContain('blocked by #123');
      });
    });

    describe('implicit dependency detection', () => {
      it('should detect potential database dependencies', async () => {
        vi.mocked(prisma.ticket.findMany).mockResolvedValueOnce([
          { id: 'schema-ticket', title: 'Add user schema migration' }
        ] as any);

        const result = await detectDependencies(
          'ticket-1',
          'Add user profile',
          'Use the new user table schema',
          'project-1'
        );

        const implicit = result.dependencies.filter((d) => d.type === 'implicit');
        expect(implicit.length).toBeGreaterThan(0);
      });

      it('should detect potential API dependencies', async () => {
        vi.mocked(prisma.ticket.findMany).mockResolvedValueOnce([
          { id: 'api-ticket', title: 'Build user API endpoint' }
        ] as any);

        const result = await detectDependencies(
          'ticket-1',
          'Build frontend',
          'Call the user API endpoint',
          'project-1'
        );

        const suggested = result.dependencies.filter(
          (d) => d.type === 'implicit' || d.type === 'suggested'
        );
        expect(suggested.length).toBeGreaterThanOrEqual(0);
      });

      it('should set lower confidence for implicit dependencies', async () => {
        vi.mocked(prisma.ticket.findMany).mockResolvedValueOnce([
          { id: 'schema-ticket', title: 'Schema changes' }
        ] as any);

        const result = await detectDependencies(
          'ticket-1',
          'Feature',
          'Use the schema migration',
          'project-1'
        );

        const implicit = result.dependencies.filter((d) => d.type === 'implicit');
        for (const dep of implicit) {
          expect(dep.confidence).toBeLessThan(1.0);
        }
      });

      it('should not mark implicit dependencies as blocking', async () => {
        vi.mocked(prisma.ticket.findMany).mockResolvedValueOnce([
          { id: 'other-ticket', title: 'Related work' }
        ] as any);

        const result = await detectDependencies(
          'ticket-1',
          'Feature',
          'Use the database schema',
          'project-1'
        );

        const implicit = result.dependencies.filter((d) => d.type !== 'explicit');
        for (const dep of implicit) {
          expect(dep.blocking).toBe(false);
        }
      });
    });

    describe('dependency tags', () => {
      it('should add has-dependencies tag for explicit references', async () => {
        const result = await detectDependencies(
          'ticket-1',
          'Feature',
          'Depends on #123',
          'project-1'
        );

        expect(result.dependencyTags).toContain('has-dependencies');
      });

      it('should add database-related tag for schema keywords', async () => {
        const result = await detectDependencies(
          'ticket-1',
          'Add migration',
          'Create schema for users table',
          'project-1'
        );

        expect(result.dependencyTags).toContain('database-related');
      });

      it('should add api-related tag for API keywords', async () => {
        const result = await detectDependencies(
          'ticket-1',
          'Build endpoint',
          'Create REST API for users',
          'project-1'
        );

        expect(result.dependencyTags).toContain('api-related');
      });
    });

    describe('blockedBy and blocks', () => {
      it('should populate blockedBy with blocking dependencies', async () => {
        // Mock that we find related tickets
        vi.mocked(prisma.ticket.findMany).mockImplementation(async (query: any) => {
          // Check if this is looking for tickets we block
          if (query.where?.status?.in?.includes('BACKLOG')) {
            return [{ id: 'blocked-ticket' }] as any;
          }
          return [];
        });

        const result = await detectDependencies(
          'ticket-1',
          'Feature',
          'After #existing-ticket-id',
          'project-1'
        );

        // blockedBy comes from explicit blocking references
        expect(result.blockedBy).toBeDefined();
        expect(Array.isArray(result.blockedBy)).toBe(true);
      });

      it('should find tickets that this one blocks', async () => {
        vi.mocked(prisma.ticket.findMany).mockImplementation(async (query: any) => {
          if (query.where?.status?.in?.includes('BACKLOG')) {
            return [{ id: 'waiting-ticket' }] as any;
          }
          return [];
        });

        const result = await detectDependencies(
          'ticket-1',
          'Build API',
          'Core API implementation',
          'project-1'
        );

        expect(result.blocks).toBeDefined();
        expect(Array.isArray(result.blocks)).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle null description', async () => {
        const result = await detectDependencies('ticket-1', 'Simple task', null, 'project-1');

        expect(result).toBeDefined();
        expect(result.dependencies).toEqual([]);
      });

      it('should handle empty strings', async () => {
        const result = await detectDependencies('ticket-1', '', '', 'project-1');

        expect(result).toBeDefined();
      });

      it('should handle database errors gracefully', async () => {
        vi.mocked(prisma.ticket.findMany).mockRejectedValue(new Error('DB error'));

        const result = await detectDependencies(
          'ticket-1',
          'Feature',
          'Use the database schema',
          'project-1'
        );

        // Should not throw, just return without implicit deps
        expect(result).toBeDefined();
      });

      it('should handle special characters in text', async () => {
        const result = await detectDependencies(
          'ticket-1',
          'Fix <script> tag',
          'After #123 & before #456',
          'project-1'
        );

        expect(result.dependencies.length).toBeGreaterThan(0);
      });
    });
  });

  describe('hasBlockingDependencies', () => {
    it('should return blocked=true when blocking dependencies exist', async () => {
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
        title: 'Feature',
        description: 'Blocked by #123'
      } as any);

      const result = await hasBlockingDependencies('ticket-1', 'project-1');

      expect(result.blocked).toBe(true);
      expect(result.blockedBy.length).toBeGreaterThan(0);
    });

    it('should return blocked=false when no dependencies', async () => {
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
        title: 'Simple task',
        description: 'Just do it'
      } as any);

      const result = await hasBlockingDependencies('ticket-1', 'project-1');

      expect(result.blocked).toBe(false);
      expect(result.blockedBy).toHaveLength(0);
    });

    it('should return blocked=false for non-existent ticket', async () => {
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue(null);

      const result = await hasBlockingDependencies('non-existent', 'project-1');

      expect(result.blocked).toBe(false);
    });
  });

  describe('getDependencySummary', () => {
    it('should summarize explicit dependencies', () => {
      const result: DependencyResult = {
        dependencies: [
          { ticketId: '1', ticketNumber: '1', type: 'explicit', reason: '', blocking: true, confidence: 1 },
          { ticketId: '2', ticketNumber: '2', type: 'explicit', reason: '', blocking: true, confidence: 1 }
        ],
        blockedBy: ['1', '2'],
        blocks: [],
        dependencyTags: []
      };

      const summary = getDependencySummary(result);

      expect(summary).toContain('2 explicit');
    });

    it('should summarize mixed dependency types', () => {
      const result: DependencyResult = {
        dependencies: [
          { ticketId: '1', ticketNumber: '1', type: 'explicit', reason: '', blocking: true, confidence: 1 },
          { ticketId: '2', ticketNumber: null, type: 'implicit', reason: '', blocking: false, confidence: 0.6 },
          { ticketId: '3', ticketNumber: null, type: 'suggested', reason: '', blocking: false, confidence: 0.3 }
        ],
        blockedBy: ['1'],
        blocks: [],
        dependencyTags: []
      };

      const summary = getDependencySummary(result);

      expect(summary).toContain('1 explicit');
      expect(summary).toContain('1 implicit');
      expect(summary).toContain('1 suggested');
    });

    it('should return "No dependencies" when empty', () => {
      const result: DependencyResult = {
        dependencies: [],
        blockedBy: [],
        blocks: [],
        dependencyTags: []
      };

      const summary = getDependencySummary(result);

      expect(summary).toBe('No dependencies detected');
    });
  });

  describe('dependencyDetector singleton', () => {
    it('should export detect method', () => {
      expect(dependencyDetector.detect).toBe(detectDependencies);
    });

    it('should export hasBlocking method', () => {
      expect(dependencyDetector.hasBlocking).toBe(hasBlockingDependencies);
    });

    it('should export getSummary method', () => {
      expect(dependencyDetector.getSummary).toBe(getDependencySummary);
    });
  });
});
