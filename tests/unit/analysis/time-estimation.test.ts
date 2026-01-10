/**
 * TASK-048: Unit Tests for Time Estimation
 *
 * Tests for completion time estimation based on complexity,
 * historical data, and ticket characteristics
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  estimateCompletionTime,
  quickTimeEstimate,
  formatDuration,
  formatRange,
  timeEstimator,
  type TimeEstimate
} from '$lib/server/analysis/time-estimation';

// Mock prisma
vi.mock('$lib/server/prisma', () => ({
  prisma: {
    ticket: {
      findMany: vi.fn()
    }
  }
}));

import { prisma } from '$lib/server/prisma';

describe('Time Estimation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('estimateCompletionTime', () => {
    describe('complexity-based estimation', () => {
      it('should estimate lower time for lower complexity', async () => {
        const lowResult = await estimateCompletionTime(2);
        const highResult = await estimateCompletionTime(8);

        expect(lowResult.hours).toBeLessThan(highResult.hours);
      });

      it('should follow fibonacci-like progression', async () => {
        const results: number[] = [];
        for (let i = 1; i <= 10; i++) {
          const result = await estimateCompletionTime(i);
          results.push(result.hours);
        }

        // Each estimate should be roughly >= previous (with type multiplier of 1.2 for feature)
        for (let i = 1; i < results.length; i++) {
          expect(results[i]).toBeGreaterThanOrEqual(results[i - 1] * 0.8); // Allow some variance
        }
      });

      it('should return complexity-based type when no historical data', async () => {
        vi.mocked(prisma.ticket.findMany).mockResolvedValue([]);

        const result = await estimateCompletionTime(5);

        expect(result.basedOn).toBe('complexity');
      });

      it('should include notes about base estimate', async () => {
        const result = await estimateCompletionTime(5);

        expect(result.notes.some((n) => n.includes('Base estimate'))).toBe(true);
      });
    });

    describe('type multipliers', () => {
      it('should apply higher multiplier for features', async () => {
        const featureResult = await estimateCompletionTime(5, 'feature');
        const choreResult = await estimateCompletionTime(5, 'chore');

        expect(featureResult.hours).toBeGreaterThan(choreResult.hours);
      });

      it('should apply lower multiplier for bugs', async () => {
        const featureResult = await estimateCompletionTime(5, 'feature');
        const bugResult = await estimateCompletionTime(5, 'bug');

        expect(bugResult.hours).toBeLessThan(featureResult.hours);
      });

      it('should apply lowest multiplier for docs', async () => {
        const docsResult = await estimateCompletionTime(5, 'docs');
        const featureResult = await estimateCompletionTime(5, 'feature');

        expect(docsResult.hours).toBeLessThan(featureResult.hours);
      });

      it('should default to 1.0 multiplier for unknown types', async () => {
        const unknownResult = await estimateCompletionTime(5, 'unknown-type');
        const refactorResult = await estimateCompletionTime(5, 'refactor'); // 1.0 multiplier

        expect(unknownResult.hours).toBe(refactorResult.hours);
      });

      it('should note type multiplier when different from 1.0', async () => {
        const result = await estimateCompletionTime(5, 'feature');

        expect(result.notes.some((n) => n.includes('Type multiplier'))).toBe(true);
      });
    });

    describe('label adjustments', () => {
      it('should increase time for security label', async () => {
        const withLabel = await estimateCompletionTime(5, 'feature', ['security']);
        const withoutLabel = await estimateCompletionTime(5, 'feature', []);

        expect(withLabel.hours).toBeGreaterThan(withoutLabel.hours);
      });

      it('should increase time for performance label', async () => {
        const withLabel = await estimateCompletionTime(5, 'feature', ['performance']);
        const withoutLabel = await estimateCompletionTime(5, 'feature', []);

        expect(withLabel.hours).toBeGreaterThan(withoutLabel.hours);
      });

      it('should accumulate time for multiple slow labels', async () => {
        const oneLabel = await estimateCompletionTime(5, 'feature', ['security']);
        const twoLabels = await estimateCompletionTime(5, 'feature', ['security', 'performance']);

        expect(twoLabels.hours).toBeGreaterThan(oneLabel.hours);
      });

      it('should not affect time for regular labels', async () => {
        const withLabels = await estimateCompletionTime(5, 'feature', ['frontend', 'ui']);
        const withoutLabels = await estimateCompletionTime(5, 'feature', []);

        expect(withLabels.hours).toBe(withoutLabels.hours);
      });

      it('should note label adjustments', async () => {
        const result = await estimateCompletionTime(5, 'feature', ['security', 'performance']);

        expect(result.notes.some((n) => n.includes('Label adjustment'))).toBe(true);
      });
    });

    describe('historical data integration', () => {
      it('should use hybrid approach with sufficient historical data', async () => {
        const now = new Date();
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

        vi.mocked(prisma.ticket.findMany).mockResolvedValue([
          {
            id: '1',
            history: [
              { toStatus: 'IN_PROGRESS', createdAt: twoHoursAgo },
              { toStatus: 'DONE', createdAt: now }
            ]
          },
          {
            id: '2',
            history: [
              { toStatus: 'IN_PROGRESS', createdAt: twoHoursAgo },
              { toStatus: 'DONE', createdAt: now }
            ]
          },
          {
            id: '3',
            history: [
              { toStatus: 'IN_PROGRESS', createdAt: twoHoursAgo },
              { toStatus: 'DONE', createdAt: now }
            ]
          }
        ] as any);

        const result = await estimateCompletionTime(5, 'feature', [], 'project-123');

        expect(result.basedOn).toBe('hybrid');
        expect(result.notes.some((n) => n.includes('Historical data'))).toBe(true);
      });

      it('should not use historical data with insufficient samples', async () => {
        vi.mocked(prisma.ticket.findMany).mockResolvedValue([
          { id: '1', history: [] }
        ] as any);

        const result = await estimateCompletionTime(5, 'feature', [], 'project-123');

        expect(result.basedOn).toBe('complexity');
      });

      it('should not query database without projectId', async () => {
        await estimateCompletionTime(5, 'feature', []);

        expect(prisma.ticket.findMany).not.toHaveBeenCalled();
      });

      it('should handle database errors gracefully', async () => {
        vi.mocked(prisma.ticket.findMany).mockRejectedValue(new Error('DB error'));

        const result = await estimateCompletionTime(5, 'feature', [], 'project-123');

        expect(result).toBeDefined();
        expect(result.basedOn).toBe('complexity');
      });
    });

    describe('confidence scoring', () => {
      it('should have lower confidence without historical data', async () => {
        vi.mocked(prisma.ticket.findMany).mockResolvedValue([]);

        const result = await estimateCompletionTime(5);

        expect(result.confidence).toBeLessThan(0.7);
      });

      it('should have higher confidence with historical data', async () => {
        const now = new Date();
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

        vi.mocked(prisma.ticket.findMany).mockResolvedValue(
          Array(10).fill({
            id: '1',
            history: [
              { toStatus: 'IN_PROGRESS', createdAt: twoHoursAgo },
              { toStatus: 'DONE', createdAt: now }
            ]
          })
        );

        const result = await estimateCompletionTime(5, 'feature', [], 'project-123');

        expect(result.confidence).toBeGreaterThan(0.5);
      });

      it('should bound confidence between 0.2 and 0.95', async () => {
        const lowResult = await estimateCompletionTime(10); // Extreme complexity
        const normalResult = await estimateCompletionTime(5);

        expect(lowResult.confidence).toBeGreaterThanOrEqual(0.2);
        expect(normalResult.confidence).toBeLessThanOrEqual(0.95);
      });
    });

    describe('range calculation', () => {
      it('should provide min and max range', async () => {
        const result = await estimateCompletionTime(5);

        expect(result.range).toHaveProperty('min');
        expect(result.range).toHaveProperty('max');
        expect(result.range.min).toBeLessThan(result.hours);
        expect(result.range.max).toBeGreaterThan(result.hours);
      });

      it('should have wider range for complexity-based estimates', async () => {
        const result = await estimateCompletionTime(5);

        // Range should be 0.5x to 2x for complexity-based
        expect(result.range.max).toBeGreaterThanOrEqual(result.hours * 1.4);
      });
    });

    describe('rounding', () => {
      it('should round hours to quarter hours', async () => {
        const result = await estimateCompletionTime(3);

        // Should be a multiple of 0.25
        expect((result.hours * 4) % 1).toBe(0);
      });
    });
  });

  describe('quickTimeEstimate', () => {
    it('should return quick estimate without database', () => {
      const result = quickTimeEstimate(5, 'feature');

      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
    });

    it('should scale with complexity', () => {
      const lowResult = quickTimeEstimate(2, 'feature');
      const highResult = quickTimeEstimate(8, 'feature');

      expect(highResult).toBeGreaterThan(lowResult);
    });

    it('should apply type multiplier', () => {
      const featureResult = quickTimeEstimate(5, 'feature');
      const bugResult = quickTimeEstimate(5, 'bug');

      expect(featureResult).toBeGreaterThan(bugResult);
    });

    it('should return rounded values', () => {
      const result = quickTimeEstimate(4, 'refactor');

      expect((result * 4) % 1).toBe(0);
    });
  });

  describe('formatDuration', () => {
    it('should format minutes for < 1 hour', () => {
      const result = formatDuration(0.5);

      expect(result).toContain('min');
    });

    it('should format hours for 1-8 hours', () => {
      const result = formatDuration(4);

      expect(result).toContain('hrs');
    });

    it('should format days for 8-40 hours', () => {
      const result = formatDuration(16);

      expect(result).toContain('days');
    });

    it('should format weeks for > 40 hours', () => {
      const result = formatDuration(80);

      expect(result).toContain('weeks');
    });

    it('should handle edge cases', () => {
      expect(formatDuration(0)).toContain('min');
      expect(formatDuration(8)).toContain('day');
    });
  });

  describe('formatRange', () => {
    it('should format range with both min and max', () => {
      const result = formatRange({ min: 2, max: 8 });

      expect(result).toContain('-');
      expect(result).toContain('hrs');
    });

    it('should handle mixed units', () => {
      const result = formatRange({ min: 0.5, max: 16 });

      expect(result).toContain('min');
      expect(result).toContain('days');
    });
  });

  describe('timeEstimator singleton', () => {
    it('should export estimate method', () => {
      expect(timeEstimator.estimate).toBe(estimateCompletionTime);
    });

    it('should export quick method', () => {
      expect(timeEstimator.quick).toBe(quickTimeEstimate);
    });

    it('should export formatDuration', () => {
      expect(timeEstimator.formatDuration).toBe(formatDuration);
    });

    it('should export formatRange', () => {
      expect(timeEstimator.formatRange).toBe(formatRange);
    });
  });
});
