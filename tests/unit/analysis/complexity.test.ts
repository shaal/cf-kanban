/**
 * TASK-047: Unit Tests for Complexity Scoring
 *
 * Tests for multi-factor complexity model and scoring
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateComplexity,
  quickComplexityEstimate,
  complexityCalculator,
  type ComplexityResult
} from '$lib/server/analysis/complexity';

// Mock prisma
vi.mock('$lib/server/prisma', () => ({
  prisma: {
    ticket: {
      findMany: vi.fn()
    }
  }
}));

import { prisma } from '$lib/server/prisma';

describe('Complexity Scoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateComplexity', () => {
    describe('description length factor', () => {
      it('should score higher for longer descriptions', async () => {
        const shortResult = await calculateComplexity('Short task', 'Do it');

        const longResult = await calculateComplexity(
          'Complex task',
          'This is a much longer description that contains many words and provides detailed information about what needs to be done including various requirements and specifications that make this task more complex and harder to estimate properly.'
        );

        expect(longResult.factors.descriptionLength).toBeGreaterThan(
          shortResult.factors.descriptionLength
        );
        expect(longResult.breakdown.description).toBeGreaterThan(shortResult.breakdown.description);
      });

      it('should cap description length factor at 1', async () => {
        const result = await calculateComplexity(
          'Task',
          'word '.repeat(200) // Very long description
        );

        expect(result.factors.descriptionLength).toBeLessThanOrEqual(1);
      });
    });

    describe('technical keywords factor', () => {
      it('should detect technical keywords', async () => {
        const result = await calculateComplexity(
          'Implement API authentication',
          'Add JWT tokens and OAuth security'
        );

        expect(result.factors.technicalKeywords).toBeGreaterThan(0);
        expect(result.breakdown.technical).toBeGreaterThan(0);
      });

      it('should score higher with more technical keywords', async () => {
        const simpleResult = await calculateComplexity('Simple task', 'Just do something');

        const technicalResult = await calculateComplexity(
          'Complex infrastructure task',
          'Implement API with database migration, auth security, websocket, and cache with redis'
        );

        expect(technicalResult.factors.technicalKeywords).toBeGreaterThan(
          simpleResult.factors.technicalKeywords
        );
      });

      it('should cap technical keywords at 1', async () => {
        const result = await calculateComplexity(
          'Super technical',
          'api database schema migration auth security websocket cache redis queue worker async encryption oauth jwt middleware hook'
        );

        expect(result.factors.technicalKeywords).toBeLessThanOrEqual(1);
      });
    });

    describe('cross-cutting concerns factor', () => {
      it('should detect cross-cutting patterns', async () => {
        const result = await calculateComplexity(
          'Update logging across all services',
          'This change affects every module in the system globally'
        );

        expect(result.factors.crossCutting).toBe(true);
        expect(result.breakdown.crossCutting).toBeGreaterThan(0);
      });

      it('should not flag non-cross-cutting tasks', async () => {
        const result = await calculateComplexity(
          'Fix button styling',
          'Update the submit button color'
        );

        expect(result.factors.crossCutting).toBe(false);
        expect(result.breakdown.crossCutting).toBe(0);
      });
    });

    describe('security implications factor', () => {
      it('should detect security-related tasks', async () => {
        const result = await calculateComplexity(
          'Add authentication middleware',
          'Implement password encryption and token validation'
        );

        expect(result.factors.hasSecurityImplications).toBe(true);
        expect(result.breakdown.security).toBeGreaterThan(0);
      });

      it('should not flag non-security tasks', async () => {
        const result = await calculateComplexity('Add new page', 'Create about us page');

        expect(result.factors.hasSecurityImplications).toBe(false);
        expect(result.breakdown.security).toBe(0);
      });

      it('should detect various security patterns', async () => {
        const patterns = [
          'add role-based access control',
          'encrypt sensitive data',
          'implement permission system',
          'validate credentials'
        ];

        for (const pattern of patterns) {
          const result = await calculateComplexity('Security task', pattern);
          expect(result.factors.hasSecurityImplications).toBe(true);
        }
      });
    });

    describe('infrastructure requirements factor', () => {
      it('should detect new infrastructure needs', async () => {
        const result = await calculateComplexity(
          'Add Redis caching',
          'Set up new redis cluster for caching'
        );

        expect(result.factors.requiresNewInfrastructure).toBe(true);
        expect(result.breakdown.infrastructure).toBeGreaterThan(0);
      });

      it('should detect docker/kubernetes needs', async () => {
        const result = await calculateComplexity('Deploy service', 'Set up docker container');

        expect(result.factors.requiresNewInfrastructure).toBe(true);
      });

      it('should not flag simple code changes', async () => {
        const result = await calculateComplexity('Update button', 'Change button color');

        expect(result.factors.requiresNewInfrastructure).toBe(false);
        expect(result.breakdown.infrastructure).toBe(0);
      });
    });

    describe('estimated files factor', () => {
      it('should estimate more files for multi-component tasks', async () => {
        const simpleResult = await calculateComplexity('Fix button', 'Change color');

        const complexResult = await calculateComplexity(
          'Add new feature',
          'Create components, services, routes, and pages with frontend and backend integration'
        );

        expect(complexResult.factors.estimatedFiles).toBeGreaterThan(
          simpleResult.factors.estimatedFiles
        );
      });

      it('should estimate more files for database changes', async () => {
        const result = await calculateComplexity(
          'Add user preferences',
          'Create database schema and migration'
        );

        expect(result.factors.estimatedFiles).toBeGreaterThan(3);
      });

      it('should multiply files for cross-cutting changes', async () => {
        const crossCuttingResult = await calculateComplexity(
          'Update logging everywhere',
          'Add logging to all modules globally'
        );

        const localResult = await calculateComplexity(
          'Update logging in auth',
          'Add logging to auth module'
        );

        expect(crossCuttingResult.factors.estimatedFiles).toBeGreaterThan(
          localResult.factors.estimatedFiles
        );
      });
    });

    describe('label complexity factor', () => {
      it('should add complexity for security label', async () => {
        const result = await calculateComplexity('Task', 'Description', ['security']);

        expect(result.factors.labelComplexity).toBe(1);
        expect(result.breakdown.labels).toBeGreaterThan(0);
      });

      it('should add complexity for multiple complex labels', async () => {
        const result = await calculateComplexity('Task', 'Description', [
          'security',
          'performance',
          'architecture'
        ]);

        expect(result.factors.labelComplexity).toBe(3);
      });

      it('should not add complexity for regular labels', async () => {
        const result = await calculateComplexity('Task', 'Description', ['ui', 'frontend', 'minor']);

        expect(result.factors.labelComplexity).toBe(0);
      });
    });

    describe('historical similarity factor', () => {
      it('should use similar task complexity when available', async () => {
        vi.mocked(prisma.ticket.findMany).mockResolvedValue([
          { complexity: 7 },
          { complexity: 8 },
          { complexity: 6 }
        ] as any);

        const result = await calculateComplexity(
          'Add user profile',
          'Create profile page',
          [],
          'project-123'
        );

        expect(result.factors.similarTaskComplexity).toBe(7); // Average of 7, 8, 6
        expect(result.breakdown.historical).toBeGreaterThan(0);
      });

      it('should return null when no similar tasks found', async () => {
        vi.mocked(prisma.ticket.findMany).mockResolvedValue([]);

        const result = await calculateComplexity(
          'Unique task',
          'Something never done before',
          [],
          'project-123'
        );

        expect(result.factors.similarTaskComplexity).toBeNull();
        expect(result.breakdown.historical).toBe(0);
      });

      it('should not query database when projectId not provided', async () => {
        const result = await calculateComplexity('Task', 'Description', []);

        expect(prisma.ticket.findMany).not.toHaveBeenCalled();
        expect(result.factors.similarTaskComplexity).toBeNull();
      });
    });

    describe('score calculation', () => {
      it('should return score between 1 and 10', async () => {
        const simpleResult = await calculateComplexity('Fix typo', 'Change text');
        const complexResult = await calculateComplexity(
          'Implement distributed auth system across all services',
          'Build new authentication infrastructure with redis cache, database migration, encryption, oauth, jwt tokens, security audit, and deploy to kubernetes cluster globally'
        );

        expect(simpleResult.score).toBeGreaterThanOrEqual(1);
        expect(simpleResult.score).toBeLessThanOrEqual(10);
        expect(complexResult.score).toBeGreaterThanOrEqual(1);
        expect(complexResult.score).toBeLessThanOrEqual(10);
      });

      it('should score simple tasks lower than complex tasks', async () => {
        const simpleResult = await calculateComplexity('Fix button', 'Change color');
        const complexResult = await calculateComplexity(
          'Implement authentication',
          'Add security middleware with database, api integration, and encryption'
        );

        expect(complexResult.score).toBeGreaterThan(simpleResult.score);
      });
    });

    describe('confidence calculation', () => {
      it('should have higher confidence with more data', async () => {
        vi.mocked(prisma.ticket.findMany).mockResolvedValue([{ complexity: 5 }] as any);

        const lowConfidenceResult = await calculateComplexity('Short', null, []);

        const highConfidenceResult = await calculateComplexity(
          'Detailed task',
          'This is a detailed description with more than fifty characters to provide context.',
          ['feature', 'security'],
          'project-123'
        );

        expect(highConfidenceResult.confidence).toBeGreaterThan(lowConfidenceResult.confidence);
      });

      it('should cap confidence at 1', async () => {
        vi.mocked(prisma.ticket.findMany).mockResolvedValue([{ complexity: 5 }] as any);

        const result = await calculateComplexity(
          'Task',
          'Very long description '.repeat(20),
          ['security', 'performance'],
          'project-123'
        );

        expect(result.confidence).toBeLessThanOrEqual(1);
      });
    });

    describe('null description handling', () => {
      it('should handle null description gracefully', async () => {
        const result = await calculateComplexity('Task title', null, []);

        expect(result.score).toBeGreaterThanOrEqual(1);
        expect(result.factors.descriptionLength).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('quickComplexityEstimate', () => {
    it('should return quick estimate without database query', () => {
      const result = quickComplexityEstimate('Simple task', 'Do something');

      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(10);
    });

    it('should score higher for technical tasks', () => {
      const simpleResult = quickComplexityEstimate('Fix button', 'Change color');
      const technicalResult = quickComplexityEstimate(
        'Add API authentication',
        'Implement security with jwt'
      );

      expect(technicalResult).toBeGreaterThan(simpleResult);
    });

    it('should add complexity for cross-cutting concerns', () => {
      const localResult = quickComplexityEstimate('Update auth module', 'Fix login');
      const globalResult = quickComplexityEstimate(
        'Update auth everywhere',
        'Change auth across all services globally'
      );

      expect(globalResult).toBeGreaterThan(localResult);
    });

    it('should add complexity for security tasks', () => {
      const normalResult = quickComplexityEstimate('Add page', 'Create new page');
      const securityResult = quickComplexityEstimate(
        'Add authentication',
        'Implement password encryption'
      );

      expect(securityResult).toBeGreaterThan(normalResult);
    });

    it('should add complexity for complex labels', () => {
      const normalResult = quickComplexityEstimate('Task', 'Description', []);
      const labeledResult = quickComplexityEstimate('Task', 'Description', ['security', 'breaking-change']);

      expect(labeledResult).toBeGreaterThan(normalResult);
    });

    it('should handle null description', () => {
      const result = quickComplexityEstimate('Task', null, []);

      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(10);
    });

    it('should return between 1 and 10', () => {
      // Very simple task
      const simpleResult = quickComplexityEstimate('a', 'b', []);
      expect(simpleResult).toBeGreaterThanOrEqual(1);

      // Very complex task
      const complexResult = quickComplexityEstimate(
        'security auth encryption everywhere',
        'database api security authentication across all global',
        ['security', 'performance', 'architecture', 'breaking-change']
      );
      expect(complexResult).toBeLessThanOrEqual(10);
    });
  });

  describe('complexityCalculator singleton', () => {
    it('should export calculate method', () => {
      expect(complexityCalculator.calculate).toBe(calculateComplexity);
    });

    it('should export quickEstimate method', () => {
      expect(complexityCalculator.quickEstimate).toBe(quickComplexityEstimate);
    });
  });
});
