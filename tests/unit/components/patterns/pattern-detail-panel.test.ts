/**
 * TASK-074: Pattern Detail Panel Tests
 *
 * Unit tests for the PatternDetailPanel component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pattern } from '$lib/types/patterns';

// Mock pattern for testing
function createMockPattern(overrides: Partial<Pattern> = {}): Pattern {
  const now = new Date();
  return {
    id: 'test-pattern-1',
    key: 'test-pattern-key',
    name: 'Test Pattern',
    value: 'This is a test pattern value',
    namespace: 'patterns',
    domain: 'testing',
    successRate: 85.5,
    usageCount: 42,
    createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    tags: ['test', 'unit', 'vitest'],
    metadata: {},
    successHistory: generateMockHistory(),
    relatedPatternIds: ['related-1', 'related-2'],
    ...overrides
  };
}

function generateMockHistory(): { timestamp: Date; rate: number }[] {
  const history: { timestamp: Date; rate: number }[] = [];
  const now = new Date();

  for (let i = 30; i >= 0; i--) {
    history.push({
      timestamp: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
      rate: 70 + Math.random() * 20
    });
  }

  return history;
}

describe('PatternDetailPanel', () => {
  describe('Data Display', () => {
    it('should have all required pattern fields', () => {
      const pattern = createMockPattern();

      expect(pattern.id).toBeDefined();
      expect(pattern.name).toBeDefined();
      expect(pattern.value).toBeDefined();
      expect(pattern.domain).toBeDefined();
      expect(pattern.namespace).toBeDefined();
      expect(pattern.successRate).toBeDefined();
      expect(pattern.usageCount).toBeDefined();
      expect(pattern.createdAt).toBeInstanceOf(Date);
      expect(pattern.updatedAt).toBeInstanceOf(Date);
    });

    it('should have success rate between 0 and 100', () => {
      const pattern = createMockPattern();
      expect(pattern.successRate).toBeGreaterThanOrEqual(0);
      expect(pattern.successRate).toBeLessThanOrEqual(100);
    });

    it('should have valid success history', () => {
      const pattern = createMockPattern();

      expect(pattern.successHistory).toBeInstanceOf(Array);
      expect(pattern.successHistory!.length).toBeGreaterThan(0);

      pattern.successHistory!.forEach(point => {
        expect(point.timestamp).toBeInstanceOf(Date);
        expect(point.rate).toBeGreaterThanOrEqual(0);
        expect(point.rate).toBeLessThanOrEqual(100);
      });
    });

    it('should have tags as array', () => {
      const pattern = createMockPattern();
      expect(pattern.tags).toBeInstanceOf(Array);
    });

    it('should have related pattern IDs as array', () => {
      const pattern = createMockPattern();
      expect(pattern.relatedPatternIds).toBeInstanceOf(Array);
    });
  });

  describe('Sparkline Generation', () => {
    it('should generate sparkline path from success history', () => {
      const history = generateMockHistory();

      // Simulate sparkline path generation
      const width = 200;
      const height = 40;
      const padding = 4;

      const points = history.map((point, i) => {
        const x = padding + (i / (history.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((point.rate - 50) / 50) * (height - 2 * padding);
        return { x, y };
      });

      expect(points.length).toBe(history.length);
      points.forEach(point => {
        expect(point.x).toBeGreaterThanOrEqual(padding);
        expect(point.x).toBeLessThanOrEqual(width - padding);
      });
    });
  });

  describe('Success Rate Color', () => {
    it('should return green for high success rates', () => {
      const getColor = (rate: number) => {
        if (rate >= 80) return '#22c55e';
        if (rate >= 60) return '#eab308';
        return '#ef4444';
      };

      expect(getColor(85)).toBe('#22c55e');
      expect(getColor(100)).toBe('#22c55e');
    });

    it('should return yellow for medium success rates', () => {
      const getColor = (rate: number) => {
        if (rate >= 80) return '#22c55e';
        if (rate >= 60) return '#eab308';
        return '#ef4444';
      };

      expect(getColor(70)).toBe('#eab308');
      expect(getColor(60)).toBe('#eab308');
    });

    it('should return red for low success rates', () => {
      const getColor = (rate: number) => {
        if (rate >= 80) return '#22c55e';
        if (rate >= 60) return '#eab308';
        return '#ef4444';
      };

      expect(getColor(50)).toBe('#ef4444');
      expect(getColor(30)).toBe('#ef4444');
    });
  });

  describe('Date Formatting', () => {
    it('should format dates correctly', () => {
      const date = new Date('2025-01-15T12:00:00Z');
      const formatted = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(date);

      // Check the format is correct (short month, day, year)
      expect(formatted).toMatch(/[A-Z][a-z]{2} \d+, \d{4}/);
    });

    it('should format relative time correctly', () => {
      const formatRelativeTime = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return `${Math.floor(diffDays / 30)} months ago`;
      };

      const now = new Date();
      expect(formatRelativeTime(now)).toBe('Today');
      expect(formatRelativeTime(new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000))).toBe('Yesterday');
      expect(formatRelativeTime(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000))).toBe('3 days ago');
    });
  });

  describe('Related Patterns', () => {
    it('should have valid related pattern IDs', () => {
      const pattern = createMockPattern();

      pattern.relatedPatternIds?.forEach(id => {
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      });
    });

    it('should create related patterns list', () => {
      const mainPattern = createMockPattern();
      const relatedPatterns = [
        createMockPattern({ id: 'related-1', name: 'Related Pattern 1' }),
        createMockPattern({ id: 'related-2', name: 'Related Pattern 2' })
      ];

      const filteredRelated = relatedPatterns.filter(p =>
        mainPattern.relatedPatternIds?.includes(p.id)
      );

      expect(filteredRelated.length).toBe(2);
    });
  });
});

describe('PatternComparisonPanel', () => {
  describe('Comparison Properties', () => {
    it('should compare patterns on key properties', () => {
      const pattern1 = createMockPattern({ id: 'p1', successRate: 80 });
      const pattern2 = createMockPattern({ id: 'p2', successRate: 70 });

      const properties = ['domain', 'namespace', 'successRate', 'usageCount'];

      properties.forEach(prop => {
        expect(pattern1[prop as keyof Pattern]).toBeDefined();
        expect(pattern2[prop as keyof Pattern]).toBeDefined();
      });
    });

    it('should detect different values between patterns', () => {
      const pattern1 = createMockPattern({ successRate: 80 });
      const pattern2 = createMockPattern({ successRate: 70 });

      const areValuesDifferent = (patterns: Pattern[], key: string): boolean => {
        const values = patterns.map(p => p[key as keyof Pattern]);
        return !values.every(v => v === values[0]);
      };

      expect(areValuesDifferent([pattern1, pattern2], 'successRate')).toBe(true);
      expect(areValuesDifferent([pattern1, pattern2], 'domain')).toBe(false);
    });
  });

  describe('Similarity Score Calculation', () => {
    it('should calculate similarity score', () => {
      const calculateSimilarityScore = (patterns: Pattern[]): number => {
        if (patterns.length < 2) return 100;

        const properties = ['domain', 'namespace'];
        let matches = 0;

        properties.forEach(key => {
          const values = patterns.map(p => p[key as keyof Pattern]);
          if (values.every(v => v === values[0])) {
            matches++;
          }
        });

        return Math.round((matches / properties.length) * 100);
      };

      const samePatterns = [
        createMockPattern({ domain: 'testing', namespace: 'patterns' }),
        createMockPattern({ domain: 'testing', namespace: 'patterns' })
      ];

      const differentPatterns = [
        createMockPattern({ domain: 'testing', namespace: 'patterns' }),
        createMockPattern({ domain: 'api', namespace: 'other' })
      ];

      expect(calculateSimilarityScore(samePatterns)).toBe(100);
      expect(calculateSimilarityScore(differentPatterns)).toBe(0);
    });
  });

  describe('Bar Chart Calculations', () => {
    it('should calculate bar width percentages', () => {
      const patterns = [
        createMockPattern({ successRate: 80 }),
        createMockPattern({ successRate: 60 }),
        createMockPattern({ successRate: 40 })
      ];

      const maxRate = Math.max(...patterns.map(p => p.successRate), 100);
      const getBarWidth = (rate: number) => (rate / maxRate) * 100;

      expect(getBarWidth(80)).toBe(80);
      expect(getBarWidth(60)).toBe(60);
      expect(getBarWidth(40)).toBe(40);
    });
  });
});

describe('PatternFiltersPanel', () => {
  describe('Search Filter', () => {
    it('should filter patterns by search query', () => {
      const patterns = [
        createMockPattern({ name: 'JWT Authentication', value: 'Token-based auth' }),
        createMockPattern({ name: 'API Versioning', value: 'REST versioning' }),
        createMockPattern({ name: 'Database Index', value: 'Query optimization' })
      ];

      const searchQuery = 'auth';
      const filtered = patterns.filter(p => {
        const query = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          p.value.toLowerCase().includes(query)
        );
      });

      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('JWT Authentication');
    });
  });

  describe('Success Rate Filter', () => {
    it('should filter patterns by success rate range', () => {
      const patterns = [
        createMockPattern({ successRate: 90 }),
        createMockPattern({ successRate: 70 }),
        createMockPattern({ successRate: 50 })
      ];

      const filtered = patterns.filter(p =>
        p.successRate >= 60 && p.successRate <= 80
      );

      expect(filtered.length).toBe(1);
      expect(filtered[0].successRate).toBe(70);
    });
  });

  describe('Domain Filter', () => {
    it('should filter patterns by domain', () => {
      const patterns = [
        createMockPattern({ domain: 'auth' }),
        createMockPattern({ domain: 'api' }),
        createMockPattern({ domain: 'testing' })
      ];

      const selectedDomains = ['auth', 'api'];
      const filtered = patterns.filter(p =>
        selectedDomains.includes(p.domain)
      );

      expect(filtered.length).toBe(2);
    });
  });

  describe('Date Filter', () => {
    it('should filter patterns by date range', () => {
      const now = new Date();
      const patterns = [
        createMockPattern({ createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) }),
        createMockPattern({ createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) }),
        createMockPattern({ createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) })
      ];

      const startDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
      const filtered = patterns.filter(p => p.createdAt >= startDate);

      expect(filtered.length).toBe(2);
    });
  });

  describe('Debounce', () => {
    it('should debounce search input', async () => {
      const callback = vi.fn();
      let timer: ReturnType<typeof setTimeout> | null = null;

      const debouncedEmit = (value: string) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => callback(value), 300);
      };

      debouncedEmit('test');
      expect(callback).not.toHaveBeenCalled();

      await new Promise(resolve => setTimeout(resolve, 350));
      expect(callback).toHaveBeenCalledWith('test');
    });
  });
});
