/**
 * TASK-071: Pattern Explorer Page Tests
 *
 * Unit tests for the Pattern Explorer page and pattern service.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PatternService } from '$lib/server/patterns/pattern-service';
import type { Pattern, PatternFilters } from '$lib/types/patterns';

// Mock the Claude Flow CLI
vi.mock('$lib/server/claude-flow/cli', () => ({
  claudeFlowCLI: {
    executeJson: vi.fn(),
    execute: vi.fn()
  }
}));

describe('PatternService', () => {
  let service: PatternService;

  beforeEach(() => {
    service = new PatternService();
    vi.clearAllMocks();
  });

  describe('fetchPatterns', () => {
    it('should return mock patterns when CLI fails', async () => {
      const patterns = await service.fetchPatterns();

      expect(patterns).toBeInstanceOf(Array);
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0]).toHaveProperty('id');
      expect(patterns[0]).toHaveProperty('name');
      expect(patterns[0]).toHaveProperty('domain');
      expect(patterns[0]).toHaveProperty('successRate');
    });

    it('should return patterns with all required fields', async () => {
      const patterns = await service.fetchPatterns();
      const pattern = patterns[0];

      expect(pattern.id).toBeDefined();
      expect(pattern.key).toBeDefined();
      expect(pattern.name).toBeDefined();
      expect(pattern.value).toBeDefined();
      expect(pattern.namespace).toBeDefined();
      expect(pattern.domain).toBeDefined();
      expect(typeof pattern.successRate).toBe('number');
      expect(typeof pattern.usageCount).toBe('number');
      expect(pattern.createdAt).toBeInstanceOf(Date);
      expect(pattern.updatedAt).toBeInstanceOf(Date);
    });

    it('should have valid domain values', async () => {
      const patterns = await service.fetchPatterns();
      const validDomains = [
        'auth', 'api', 'testing', 'database', 'ui',
        'performance', 'security', 'devops', 'architecture', 'general'
      ];

      patterns.forEach(pattern => {
        expect(validDomains).toContain(pattern.domain);
      });
    });
  });

  describe('filterPatterns', () => {
    let mockPatterns: Pattern[];

    beforeEach(() => {
      mockPatterns = service.getMockPatterns();
    });

    it('should filter by search query', () => {
      const filters: PatternFilters = {
        searchQuery: 'jwt',
        minSuccessRate: 0,
        maxSuccessRate: 100,
        minUsageCount: 0,
        maxUsageCount: Infinity,
        startDate: null,
        endDate: null,
        domains: [],
        tags: []
      };

      const filtered = service.filterPatterns(mockPatterns, filters);

      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach(pattern => {
        const matchesSearch =
          pattern.name.toLowerCase().includes('jwt') ||
          pattern.value.toLowerCase().includes('jwt') ||
          pattern.key.toLowerCase().includes('jwt');
        expect(matchesSearch).toBe(true);
      });
    });

    it('should filter by success rate range', () => {
      const filters: PatternFilters = {
        searchQuery: '',
        minSuccessRate: 70,
        maxSuccessRate: 90,
        minUsageCount: 0,
        maxUsageCount: Infinity,
        startDate: null,
        endDate: null,
        domains: [],
        tags: []
      };

      const filtered = service.filterPatterns(mockPatterns, filters);

      filtered.forEach(pattern => {
        expect(pattern.successRate).toBeGreaterThanOrEqual(70);
        expect(pattern.successRate).toBeLessThanOrEqual(90);
      });
    });

    it('should filter by domain', () => {
      const filters: PatternFilters = {
        searchQuery: '',
        minSuccessRate: 0,
        maxSuccessRate: 100,
        minUsageCount: 0,
        maxUsageCount: Infinity,
        startDate: null,
        endDate: null,
        domains: ['auth', 'api'],
        tags: []
      };

      const filtered = service.filterPatterns(mockPatterns, filters);

      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach(pattern => {
        expect(['auth', 'api']).toContain(pattern.domain);
      });
    });

    it('should filter by usage count', () => {
      const filters: PatternFilters = {
        searchQuery: '',
        minSuccessRate: 0,
        maxSuccessRate: 100,
        minUsageCount: 10,
        maxUsageCount: 50,
        startDate: null,
        endDate: null,
        domains: [],
        tags: []
      };

      const filtered = service.filterPatterns(mockPatterns, filters);

      filtered.forEach(pattern => {
        expect(pattern.usageCount).toBeGreaterThanOrEqual(10);
        expect(pattern.usageCount).toBeLessThanOrEqual(50);
      });
    });

    it('should handle empty filters', () => {
      const filters: PatternFilters = {
        searchQuery: '',
        minSuccessRate: 0,
        maxSuccessRate: 100,
        minUsageCount: 0,
        maxUsageCount: Infinity,
        startDate: null,
        endDate: null,
        domains: [],
        tags: []
      };

      const filtered = service.filterPatterns(mockPatterns, filters);

      expect(filtered.length).toBe(mockPatterns.length);
    });

    it('should combine multiple filters', () => {
      const filters: PatternFilters = {
        searchQuery: 'token',
        minSuccessRate: 60,
        maxSuccessRate: 100,
        minUsageCount: 0,
        maxUsageCount: Infinity,
        startDate: null,
        endDate: null,
        domains: ['auth'],
        tags: []
      };

      const filtered = service.filterPatterns(mockPatterns, filters);

      filtered.forEach(pattern => {
        expect(pattern.domain).toBe('auth');
        expect(pattern.successRate).toBeGreaterThanOrEqual(60);
        const matchesSearch =
          pattern.name.toLowerCase().includes('token') ||
          pattern.value.toLowerCase().includes('token') ||
          pattern.key.toLowerCase().includes('token');
        expect(matchesSearch).toBe(true);
      });
    });
  });

  describe('toGraphData', () => {
    it('should convert patterns to graph nodes', async () => {
      const patterns = await service.fetchPatterns();
      const graphData = service.toGraphData(patterns);

      expect(graphData.nodes).toBeInstanceOf(Array);
      expect(graphData.nodes.length).toBe(patterns.length);

      graphData.nodes.forEach(node => {
        expect(node.id).toBeDefined();
        expect(node.label).toBeDefined();
        expect(node.group).toBeDefined();
        expect(node.color).toBeDefined();
        expect(typeof node.radius).toBe('number');
        expect(node.data).toBeDefined();
      });
    });

    it('should create links between related patterns', async () => {
      const patterns = await service.fetchPatterns();
      const graphData = service.toGraphData(patterns);

      expect(graphData.links).toBeInstanceOf(Array);
      graphData.links.forEach(link => {
        expect(link.source).toBeDefined();
        expect(link.target).toBeDefined();
        expect(typeof link.value).toBe('number');
      });
    });

    it('should scale node radius by usage count', async () => {
      const patterns = await service.fetchPatterns();
      const graphData = service.toGraphData(patterns);

      graphData.nodes.forEach(node => {
        expect(node.radius).toBeGreaterThanOrEqual(15);
        expect(node.radius).toBeLessThanOrEqual(30);
      });
    });

    it('should assign colors based on domain', async () => {
      const patterns = await service.fetchPatterns();
      const graphData = service.toGraphData(patterns);

      const domainColors = new Map<string, string>();
      graphData.nodes.forEach(node => {
        if (domainColors.has(node.group)) {
          expect(node.color).toBe(domainColors.get(node.group));
        } else {
          domainColors.set(node.group, node.color);
        }
      });
    });
  });

  describe('getMockPatterns', () => {
    it('should return patterns across multiple domains', () => {
      const patterns = service.getMockPatterns();
      const domains = new Set(patterns.map(p => p.domain));

      expect(domains.size).toBeGreaterThan(5);
    });

    it('should include success history', () => {
      const patterns = service.getMockPatterns();

      patterns.forEach(pattern => {
        expect(pattern.successHistory).toBeInstanceOf(Array);
        expect(pattern.successHistory!.length).toBeGreaterThan(0);
        pattern.successHistory!.forEach(point => {
          expect(point.timestamp).toBeInstanceOf(Date);
          expect(typeof point.rate).toBe('number');
        });
      });
    });

    it('should have some patterns with related pattern IDs', () => {
      const patterns = service.getMockPatterns();
      const patternsWithRelations = patterns.filter(
        p => p.relatedPatternIds && p.relatedPatternIds.length > 0
      );

      expect(patternsWithRelations.length).toBeGreaterThan(0);
    });
  });
});

describe('Pattern Types', () => {
  it('should have valid domain configs', async () => {
    const { DOMAIN_CONFIGS } = await import('$lib/types/patterns');

    expect(DOMAIN_CONFIGS.auth).toBeDefined();
    expect(DOMAIN_CONFIGS.auth.label).toBe('Authentication');
    expect(DOMAIN_CONFIGS.auth.color).toBeDefined();
  });

  it('should have default filter values', async () => {
    const { DEFAULT_PATTERN_FILTERS } = await import('$lib/types/patterns');

    expect(DEFAULT_PATTERN_FILTERS.searchQuery).toBe('');
    expect(DEFAULT_PATTERN_FILTERS.minSuccessRate).toBe(0);
    expect(DEFAULT_PATTERN_FILTERS.maxSuccessRate).toBe(100);
    expect(DEFAULT_PATTERN_FILTERS.domains).toEqual([]);
  });
});
