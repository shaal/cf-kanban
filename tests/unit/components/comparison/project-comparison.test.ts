/**
 * GAP-UX.3: Project Comparison Component Tests
 *
 * Unit tests for the project parallel comparison view
 * including type utilities and component logic.
 */

import { describe, it, expect, vi } from 'vitest';
import type {
  ProjectComparisonData,
  PatternDomainCount,
  ActivityPoint,
  ProjectTrends,
  TrendDirection,
  PatternSimilarityResult,
  ComparisonMetricType
} from '$lib/types/project-comparison';
import {
  getProjectColor,
  calculateTrend,
  formatComparisonMetric,
  getTrendIcon,
  getTrendColor,
  PROJECT_COMPARISON_COLORS
} from '$lib/types/project-comparison';
import type { HealthStatus } from '$lib/types/dashboard';
import type { PatternDomain } from '$lib/types/patterns';

// Mock project factory
function createMockProject(overrides: Partial<ProjectComparisonData> = {}): ProjectComparisonData {
  const now = new Date();
  return {
    id: `project-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Project',
    description: 'A test project for comparison',
    workspacePath: '/test/path',
    ticketCount: 10,
    completedTickets: 5,
    inProgressTickets: 3,
    blockedTickets: 1,
    memberCount: 3,
    activeAgents: 2,
    patternCount: 15,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
    healthStatus: 'healthy' as HealthStatus,
    velocity: 3.5,
    avgCycleTime: 24,
    patternDomains: [
      { domain: 'api', count: 5 },
      { domain: 'testing', count: 4 },
      { domain: 'database', count: 3 }
    ],
    recentActivity: generateMockActivity(7),
    trends: {
      velocityTrend: 'up',
      completionTrend: 'stable',
      healthTrend: 'stable'
    },
    ...overrides
  };
}

// Generate mock activity data
function generateMockActivity(days: number): ActivityPoint[] {
  const points: ActivityPoint[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    points.push({
      date: date.toISOString().split('T')[0],
      ticketsCreated: Math.floor(Math.random() * 5),
      ticketsCompleted: Math.floor(Math.random() * 4),
      activeAgents: Math.floor(Math.random() * 3)
    });
  }

  return points;
}

describe('Project Comparison Types', () => {
  describe('getProjectColor', () => {
    it('should return colors from the defined palette', () => {
      const color0 = getProjectColor(0);
      const color1 = getProjectColor(1);
      const color2 = getProjectColor(2);

      expect(color0).toBe(PROJECT_COMPARISON_COLORS[0]);
      expect(color1).toBe(PROJECT_COMPARISON_COLORS[1]);
      expect(color2).toBe(PROJECT_COMPARISON_COLORS[2]);
    });

    it('should cycle colors when index exceeds palette length', () => {
      const paletteLength = PROJECT_COMPARISON_COLORS.length;
      const colorBeyond = getProjectColor(paletteLength);
      const colorWrap = getProjectColor(paletteLength + 1);

      expect(colorBeyond).toBe(PROJECT_COMPARISON_COLORS[0]);
      expect(colorWrap).toBe(PROJECT_COMPARISON_COLORS[1]);
    });

    it('should return valid hex colors', () => {
      const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

      for (let i = 0; i < 10; i++) {
        expect(getProjectColor(i)).toMatch(hexColorRegex);
      }
    });
  });

  describe('calculateTrend', () => {
    it('should return "up" when current is significantly higher than previous', () => {
      expect(calculateTrend(10, 5)).toBe('up');
      expect(calculateTrend(100, 50)).toBe('up');
    });

    it('should return "down" when current is significantly lower than previous', () => {
      expect(calculateTrend(5, 10)).toBe('down');
      expect(calculateTrend(50, 100)).toBe('down');
    });

    it('should return "stable" when values are within threshold', () => {
      expect(calculateTrend(100, 100)).toBe('stable');
      expect(calculateTrend(102, 100)).toBe('stable'); // Within 5% default threshold
    });

    it('should handle custom threshold', () => {
      expect(calculateTrend(110, 100, 0.15)).toBe('stable');
      expect(calculateTrend(120, 100, 0.15)).toBe('up');
    });

    it('should handle zero previous value', () => {
      const result = calculateTrend(10, 0);
      expect(['up', 'stable', 'down']).toContain(result);
    });
  });

  describe('formatComparisonMetric', () => {
    it('should format velocity correctly', () => {
      expect(formatComparisonMetric(3.5, 'velocity')).toBe('3.5 tickets/week');
      expect(formatComparisonMetric(10, 'velocity')).toBe('10.0 tickets/week');
    });

    it('should format completion rate correctly', () => {
      expect(formatComparisonMetric(75.5, 'completion')).toBe('75.5%');
      expect(formatComparisonMetric(100, 'completion')).toBe('100.0%');
    });

    it('should format cycle time correctly', () => {
      expect(formatComparisonMetric(24.5, 'cycleTime')).toBe('24.5 hours');
      expect(formatComparisonMetric(48, 'cycleTime')).toBe('48.0 hours');
    });

    it('should format agents correctly', () => {
      expect(formatComparisonMetric(3.7, 'agents')).toBe('4 agents');
      expect(formatComparisonMetric(2.2, 'agents')).toBe('2 agents');
    });

    it('should format patterns correctly', () => {
      expect(formatComparisonMetric(15.5, 'patterns')).toBe('16 patterns');
      expect(formatComparisonMetric(10, 'patterns')).toBe('10 patterns');
    });
  });

  describe('getTrendIcon', () => {
    it('should return TrendingUp for up trend', () => {
      expect(getTrendIcon('up')).toBe('TrendingUp');
    });

    it('should return TrendingDown for down trend', () => {
      expect(getTrendIcon('down')).toBe('TrendingDown');
    });

    it('should return Minus for stable trend', () => {
      expect(getTrendIcon('stable')).toBe('Minus');
    });
  });

  describe('getTrendColor', () => {
    it('should return green for positive trend', () => {
      expect(getTrendColor('up')).toBe('text-green-600');
    });

    it('should return red for negative trend', () => {
      expect(getTrendColor('down')).toBe('text-red-600');
    });

    it('should return gray for stable trend', () => {
      expect(getTrendColor('stable')).toBe('text-gray-500');
    });

    it('should invert colors when inverseGood is true', () => {
      expect(getTrendColor('up', true)).toBe('text-red-600');
      expect(getTrendColor('down', true)).toBe('text-green-600');
    });
  });
});

describe('Project Comparison Data', () => {
  describe('ProjectComparisonData', () => {
    it('should have all required fields', () => {
      const project = createMockProject();

      expect(project.id).toBeDefined();
      expect(project.name).toBeDefined();
      expect(typeof project.velocity).toBe('number');
      expect(typeof project.avgCycleTime).toBe('number');
      expect(Array.isArray(project.patternDomains)).toBe(true);
      expect(Array.isArray(project.recentActivity)).toBe(true);
      expect(project.trends).toBeDefined();
    });

    it('should calculate completion percentage correctly', () => {
      const project = createMockProject({
        ticketCount: 20,
        completedTickets: 15
      });

      const completionPercentage = (project.completedTickets / project.ticketCount) * 100;
      expect(completionPercentage).toBe(75);
    });

    it('should handle zero tickets gracefully', () => {
      const project = createMockProject({
        ticketCount: 0,
        completedTickets: 0
      });

      const completionPercentage = project.ticketCount > 0
        ? (project.completedTickets / project.ticketCount) * 100
        : 0;
      expect(completionPercentage).toBe(0);
    });
  });

  describe('Pattern Domain Count', () => {
    it('should sum pattern counts correctly', () => {
      const project = createMockProject({
        patternDomains: [
          { domain: 'api', count: 5 },
          { domain: 'testing', count: 4 },
          { domain: 'database', count: 3 }
        ]
      });

      const totalPatterns = project.patternDomains.reduce((sum, d) => sum + d.count, 0);
      expect(totalPatterns).toBe(12);
    });

    it('should identify unique domains', () => {
      const project = createMockProject({
        patternDomains: [
          { domain: 'api', count: 5 },
          { domain: 'testing', count: 4 },
          { domain: 'security', count: 2 }
        ]
      });

      const domains = project.patternDomains.map(d => d.domain);
      const uniqueDomains = new Set(domains);

      expect(uniqueDomains.size).toBe(3);
      expect(domains).toContain('api');
      expect(domains).toContain('testing');
      expect(domains).toContain('security');
    });
  });

  describe('Activity Timeline', () => {
    it('should generate correct number of data points', () => {
      const activity = generateMockActivity(14);
      expect(activity.length).toBe(14);
    });

    it('should have valid date strings', () => {
      const activity = generateMockActivity(7);
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

      activity.forEach(point => {
        expect(point.date).toMatch(dateRegex);
      });
    });

    it('should have non-negative activity values', () => {
      const activity = generateMockActivity(7);

      activity.forEach(point => {
        expect(point.ticketsCreated).toBeGreaterThanOrEqual(0);
        expect(point.ticketsCompleted).toBeGreaterThanOrEqual(0);
        expect(point.activeAgents).toBeGreaterThanOrEqual(0);
      });
    });
  });
});

describe('Pattern Similarity Calculation', () => {
  function calculateSimilarity(
    domainsA: PatternDomain[],
    domainsB: PatternDomain[]
  ): PatternSimilarityResult {
    const setA = new Set(domainsA);
    const setB = new Set(domainsB);

    const shared: PatternDomain[] = [];
    const uniqueToA: PatternDomain[] = [];
    const uniqueToB: PatternDomain[] = [];

    setA.forEach(d => {
      if (setB.has(d)) {
        shared.push(d);
      } else {
        uniqueToA.push(d);
      }
    });

    setB.forEach(d => {
      if (!setA.has(d)) {
        uniqueToB.push(d);
      }
    });

    const totalDomains = setA.size + setB.size - shared.length;
    const similarity = totalDomains > 0
      ? Math.round((shared.length / totalDomains) * 100)
      : 0;

    return {
      projectAId: 'project-a',
      projectBId: 'project-b',
      similarity,
      sharedDomains: shared,
      uniqueToA,
      uniqueToB
    };
  }

  it('should return 100% similarity for identical domains', () => {
    const domains: PatternDomain[] = ['api', 'testing', 'database'];
    const result = calculateSimilarity(domains, domains);

    expect(result.similarity).toBe(100);
    expect(result.sharedDomains.length).toBe(3);
    expect(result.uniqueToA.length).toBe(0);
    expect(result.uniqueToB.length).toBe(0);
  });

  it('should return 0% similarity for completely different domains', () => {
    const domainsA: PatternDomain[] = ['api', 'testing'];
    const domainsB: PatternDomain[] = ['security', 'devops'];
    const result = calculateSimilarity(domainsA, domainsB);

    expect(result.similarity).toBe(0);
    expect(result.sharedDomains.length).toBe(0);
    expect(result.uniqueToA.length).toBe(2);
    expect(result.uniqueToB.length).toBe(2);
  });

  it('should calculate partial similarity correctly', () => {
    const domainsA: PatternDomain[] = ['api', 'testing', 'database'];
    const domainsB: PatternDomain[] = ['api', 'testing', 'security'];
    const result = calculateSimilarity(domainsA, domainsB);

    // 2 shared out of 4 unique = 50%
    expect(result.similarity).toBe(50);
    expect(result.sharedDomains).toContain('api');
    expect(result.sharedDomains).toContain('testing');
    expect(result.uniqueToA).toContain('database');
    expect(result.uniqueToB).toContain('security');
  });

  it('should handle empty domain sets', () => {
    const result = calculateSimilarity([], []);

    expect(result.similarity).toBe(0);
    expect(result.sharedDomains.length).toBe(0);
  });
});

describe('Project Selection Logic', () => {
  it('should toggle project selection correctly', () => {
    let selectedIds: string[] = [];

    const toggleSelection = (id: string) => {
      if (selectedIds.includes(id)) {
        selectedIds = selectedIds.filter(i => i !== id);
      } else {
        selectedIds = [...selectedIds, id];
      }
    };

    expect(selectedIds.length).toBe(0);

    toggleSelection('project-1');
    expect(selectedIds).toContain('project-1');

    toggleSelection('project-2');
    expect(selectedIds.length).toBe(2);

    toggleSelection('project-1');
    expect(selectedIds).not.toContain('project-1');
    expect(selectedIds.length).toBe(1);
  });

  it('should respect maximum selection limit', () => {
    let selectedIds: string[] = [];
    const maxSelections = 4;

    const toggleSelection = (id: string) => {
      if (selectedIds.includes(id)) {
        selectedIds = selectedIds.filter(i => i !== id);
      } else if (selectedIds.length < maxSelections) {
        selectedIds = [...selectedIds, id];
      }
    };

    for (let i = 1; i <= 5; i++) {
      toggleSelection(`project-${i}`);
    }

    expect(selectedIds.length).toBe(4);
    expect(selectedIds).not.toContain('project-5');
  });

  it('should filter selected projects correctly', () => {
    const projects = [
      createMockProject({ id: 'p1', name: 'Project 1' }),
      createMockProject({ id: 'p2', name: 'Project 2' }),
      createMockProject({ id: 'p3', name: 'Project 3' })
    ];

    const selectedIds = ['p1', 'p3'];
    const selectedProjects = projects.filter(p => selectedIds.includes(p.id));

    expect(selectedProjects.length).toBe(2);
    expect(selectedProjects.map(p => p.id)).toContain('p1');
    expect(selectedProjects.map(p => p.id)).toContain('p3');
    expect(selectedProjects.map(p => p.id)).not.toContain('p2');
  });
});

describe('Metric Comparison', () => {
  it('should extract correct metric value by type', () => {
    const project = createMockProject({
      velocity: 5.5,
      avgCycleTime: 48,
      activeAgents: 3,
      patternCount: 20
    });

    const getMetricValue = (p: ProjectComparisonData, type: ComparisonMetricType): number => {
      switch (type) {
        case 'velocity':
          return p.velocity;
        case 'completion':
          return p.ticketCount > 0
            ? (p.completedTickets / p.ticketCount) * 100
            : 0;
        case 'cycleTime':
          return p.avgCycleTime;
        case 'agents':
          return p.activeAgents;
        case 'patterns':
          return p.patternCount;
        default:
          return 0;
      }
    };

    expect(getMetricValue(project, 'velocity')).toBe(5.5);
    expect(getMetricValue(project, 'cycleTime')).toBe(48);
    expect(getMetricValue(project, 'agents')).toBe(3);
    expect(getMetricValue(project, 'patterns')).toBe(20);
  });

  it('should calculate max value across projects', () => {
    const projects = [
      createMockProject({ velocity: 3 }),
      createMockProject({ velocity: 7 }),
      createMockProject({ velocity: 5 })
    ];

    const maxVelocity = Math.max(...projects.map(p => p.velocity));
    expect(maxVelocity).toBe(7);
  });

  it('should sort projects by metric', () => {
    const projects = [
      createMockProject({ id: 'p1', velocity: 3 }),
      createMockProject({ id: 'p2', velocity: 7 }),
      createMockProject({ id: 'p3', velocity: 5 })
    ];

    const sorted = [...projects].sort((a, b) => b.velocity - a.velocity);

    expect(sorted[0].id).toBe('p2');
    expect(sorted[1].id).toBe('p3');
    expect(sorted[2].id).toBe('p1');
  });
});

describe('Health Status', () => {
  it('should map health status to correct colors', () => {
    const healthColors: Record<HealthStatus, string> = {
      healthy: 'text-green-600',
      degraded: 'text-yellow-600',
      unhealthy: 'text-red-600',
      unknown: 'text-gray-400'
    };

    expect(healthColors.healthy).toBe('text-green-600');
    expect(healthColors.degraded).toBe('text-yellow-600');
    expect(healthColors.unhealthy).toBe('text-red-600');
    expect(healthColors.unknown).toBe('text-gray-400');
  });

  it('should determine health based on blocked tickets', () => {
    const determineHealth = (blockedTickets: number): HealthStatus => {
      if (blockedTickets > 2) return 'unhealthy';
      if (blockedTickets > 0) return 'degraded';
      return 'healthy';
    };

    expect(determineHealth(0)).toBe('healthy');
    expect(determineHealth(1)).toBe('degraded');
    expect(determineHealth(2)).toBe('degraded');
    expect(determineHealth(3)).toBe('unhealthy');
  });
});

describe('Date Range Filtering', () => {
  it('should filter activity by date range', () => {
    const activity = generateMockActivity(30);
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);

    const filtered = activity.filter(point => {
      const pointDate = new Date(point.date);
      return pointDate >= weekAgo && pointDate <= today;
    });

    expect(filtered.length).toBeLessThanOrEqual(8);
    expect(filtered.length).toBeGreaterThanOrEqual(7);
  });

  it('should aggregate metrics within date range', () => {
    const activity: ActivityPoint[] = [
      { date: '2024-01-01', ticketsCreated: 2, ticketsCompleted: 1, activeAgents: 2 },
      { date: '2024-01-02', ticketsCreated: 3, ticketsCompleted: 2, activeAgents: 3 },
      { date: '2024-01-03', ticketsCreated: 1, ticketsCompleted: 3, activeAgents: 2 }
    ];

    const totalCreated = activity.reduce((sum, a) => sum + a.ticketsCreated, 0);
    const totalCompleted = activity.reduce((sum, a) => sum + a.ticketsCompleted, 0);

    expect(totalCreated).toBe(6);
    expect(totalCompleted).toBe(6);
  });
});
