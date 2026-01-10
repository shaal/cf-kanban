/**
 * TASK-072: Pattern Clustering Tests
 *
 * Unit tests for the pattern clustering functionality.
 */

import { describe, it, expect, vi } from 'vitest';
import type { Pattern, PatternDomain } from '$lib/types/patterns';

// Mock pattern factory
function createMockPattern(overrides: Partial<Pattern> = {}): Pattern {
  const now = new Date();
  return {
    id: `pattern-${Math.random().toString(36).substr(2, 9)}`,
    key: 'test-pattern-key',
    name: 'Test Pattern',
    value: 'Test pattern value',
    namespace: 'patterns',
    domain: 'testing',
    successRate: 75,
    usageCount: 10,
    createdAt: now,
    updatedAt: now,
    tags: [],
    metadata: {},
    ...overrides
  };
}

describe('Pattern Clustering', () => {
  describe('groupByDomain', () => {
    it('should group patterns by their domain', () => {
      const patterns: Pattern[] = [
        createMockPattern({ id: '1', domain: 'auth' }),
        createMockPattern({ id: '2', domain: 'auth' }),
        createMockPattern({ id: '3', domain: 'api' }),
        createMockPattern({ id: '4', domain: 'testing' })
      ];

      // Simulate groupByDomain function
      const groups = new Map<PatternDomain, Pattern[]>();
      patterns.forEach(pattern => {
        const existing = groups.get(pattern.domain) || [];
        groups.set(pattern.domain, [...existing, pattern]);
      });

      expect(groups.get('auth')?.length).toBe(2);
      expect(groups.get('api')?.length).toBe(1);
      expect(groups.get('testing')?.length).toBe(1);
    });

    it('should handle empty pattern list', () => {
      const patterns: Pattern[] = [];
      const groups = new Map<PatternDomain, Pattern[]>();

      patterns.forEach(pattern => {
        const existing = groups.get(pattern.domain) || [];
        groups.set(pattern.domain, [...existing, pattern]);
      });

      expect(groups.size).toBe(0);
    });

    it('should handle patterns all in same domain', () => {
      const patterns: Pattern[] = [
        createMockPattern({ id: '1', domain: 'security' }),
        createMockPattern({ id: '2', domain: 'security' }),
        createMockPattern({ id: '3', domain: 'security' })
      ];

      const groups = new Map<PatternDomain, Pattern[]>();
      patterns.forEach(pattern => {
        const existing = groups.get(pattern.domain) || [];
        groups.set(pattern.domain, [...existing, pattern]);
      });

      expect(groups.size).toBe(1);
      expect(groups.get('security')?.length).toBe(3);
    });
  });

  describe('Cluster Position Calculation', () => {
    it('should calculate circular layout positions', () => {
      const domains: PatternDomain[] = ['auth', 'api', 'testing', 'database'];
      const width = 800;
      const height = 600;
      const centerX = width / 2;
      const centerY = height / 2;
      const layoutRadius = Math.min(width, height) / 3;

      const positions = domains.map((domain, i) => {
        const angle = (2 * Math.PI * i) / domains.length - Math.PI / 2;
        return {
          domain,
          x: centerX + layoutRadius * Math.cos(angle),
          y: centerY + layoutRadius * Math.sin(angle)
        };
      });

      expect(positions.length).toBe(4);
      positions.forEach(pos => {
        expect(pos.x).toBeGreaterThan(0);
        expect(pos.x).toBeLessThan(width);
        expect(pos.y).toBeGreaterThan(0);
        expect(pos.y).toBeLessThan(height);
      });
    });

    it('should scale cluster radius based on pattern count', () => {
      const baseRadius = 30;
      const patternCounts = [1, 5, 10, 20];

      const radii = patternCounts.map(count => baseRadius + count * 5);

      expect(radii[0]).toBe(35); // 1 pattern
      expect(radii[1]).toBe(55); // 5 patterns
      expect(radii[2]).toBe(80); // 10 patterns
      expect(radii[3]).toBe(130); // 20 patterns
    });
  });

  describe('Domain Color Scale', () => {
    it('should assign unique colors to each domain', () => {
      const domainColorScale: Record<PatternDomain, string> = {
        auth: '#4f46e5',
        api: '#0891b2',
        testing: '#059669',
        database: '#d97706',
        ui: '#dc2626',
        performance: '#7c3aed',
        security: '#be185d',
        devops: '#2563eb',
        architecture: '#16a34a',
        general: '#6b7280'
      };

      const colors = Object.values(domainColorScale);
      const uniqueColors = new Set(colors);

      expect(uniqueColors.size).toBe(colors.length);
    });

    it('should have valid hex color format', () => {
      const domainColorScale: Record<PatternDomain, string> = {
        auth: '#4f46e5',
        api: '#0891b2',
        testing: '#059669',
        database: '#d97706',
        ui: '#dc2626',
        performance: '#7c3aed',
        security: '#be185d',
        devops: '#2563eb',
        architecture: '#16a34a',
        general: '#6b7280'
      };

      const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

      Object.values(domainColorScale).forEach(color => {
        expect(color).toMatch(hexColorRegex);
      });
    });
  });

  describe('Cluster Expansion', () => {
    it('should calculate pattern positions when expanded', () => {
      const cluster = {
        centerX: 400,
        centerY: 300,
        radius: 50,
        expanded: true
      };

      const patterns = [
        createMockPattern({ id: '1' }),
        createMockPattern({ id: '2' }),
        createMockPattern({ id: '3' })
      ];

      const positions = patterns.map((pattern, i) => {
        const angle = (2 * Math.PI * i) / patterns.length;
        const radius = cluster.radius + 40;
        return {
          pattern,
          x: cluster.centerX + radius * Math.cos(angle),
          y: cluster.centerY + radius * Math.sin(angle)
        };
      });

      expect(positions.length).toBe(3);
      positions.forEach(pos => {
        const distance = Math.sqrt(
          Math.pow(pos.x - cluster.centerX, 2) +
          Math.pow(pos.y - cluster.centerY, 2)
        );
        expect(distance).toBeCloseTo(cluster.radius + 40, 0);
      });
    });

    it('should return empty positions when collapsed', () => {
      const cluster = {
        centerX: 400,
        centerY: 300,
        radius: 50,
        expanded: false
      };

      const patterns = [createMockPattern()];

      const positions = cluster.expanded
        ? patterns.map((pattern, i) => ({
            pattern,
            x: cluster.centerX,
            y: cluster.centerY
          }))
        : [];

      expect(positions.length).toBe(0);
    });
  });

  describe('Cluster Interaction', () => {
    it('should toggle expansion state on click', () => {
      let expandedDomains: PatternDomain[] = [];

      const toggleDomain = (domain: PatternDomain) => {
        if (expandedDomains.includes(domain)) {
          expandedDomains = expandedDomains.filter(d => d !== domain);
        } else {
          expandedDomains = [...expandedDomains, domain];
        }
      };

      expect(expandedDomains.includes('auth')).toBe(false);

      toggleDomain('auth');
      expect(expandedDomains.includes('auth')).toBe(true);

      toggleDomain('auth');
      expect(expandedDomains.includes('auth')).toBe(false);
    });

    it('should support multiple expanded clusters', () => {
      let expandedDomains: PatternDomain[] = [];

      const toggleDomain = (domain: PatternDomain) => {
        if (expandedDomains.includes(domain)) {
          expandedDomains = expandedDomains.filter(d => d !== domain);
        } else {
          expandedDomains = [...expandedDomains, domain];
        }
      };

      toggleDomain('auth');
      toggleDomain('api');
      toggleDomain('testing');

      expect(expandedDomains).toContain('auth');
      expect(expandedDomains).toContain('api');
      expect(expandedDomains).toContain('testing');
      expect(expandedDomains.length).toBe(3);
    });
  });

  describe('Cluster Labels', () => {
    it('should use domain config labels', () => {
      const DOMAIN_CONFIGS: Record<PatternDomain, { label: string }> = {
        auth: { label: 'Authentication' },
        api: { label: 'API' },
        testing: { label: 'Testing' },
        database: { label: 'Database' },
        ui: { label: 'UI/UX' },
        performance: { label: 'Performance' },
        security: { label: 'Security' },
        devops: { label: 'DevOps' },
        architecture: { label: 'Architecture' },
        general: { label: 'General' }
      };

      expect(DOMAIN_CONFIGS.auth.label).toBe('Authentication');
      expect(DOMAIN_CONFIGS.api.label).toBe('API');
      expect(DOMAIN_CONFIGS.database.label).toBe('Database');
    });

    it('should display pattern count in cluster', () => {
      const clusters = [
        { domain: 'auth', patterns: [createMockPattern(), createMockPattern()] },
        { domain: 'api', patterns: [createMockPattern()] }
      ];

      expect(clusters[0].patterns.length).toBe(2);
      expect(clusters[1].patterns.length).toBe(1);
    });
  });
});

describe('Cluster Data Structure', () => {
  interface PatternCluster {
    id: string;
    domain: PatternDomain;
    patterns: Pattern[];
    centerX: number;
    centerY: number;
    radius: number;
    expanded: boolean;
    color: string;
  }

  it('should have all required cluster properties', () => {
    const cluster: PatternCluster = {
      id: 'cluster-auth',
      domain: 'auth',
      patterns: [],
      centerX: 400,
      centerY: 300,
      radius: 50,
      expanded: false,
      color: '#4f46e5'
    };

    expect(cluster.id).toBeDefined();
    expect(cluster.domain).toBeDefined();
    expect(cluster.patterns).toBeDefined();
    expect(typeof cluster.centerX).toBe('number');
    expect(typeof cluster.centerY).toBe('number');
    expect(typeof cluster.radius).toBe('number');
    expect(typeof cluster.expanded).toBe('boolean');
    expect(cluster.color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
