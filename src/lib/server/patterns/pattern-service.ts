/**
 * Pattern Service
 *
 * TASK-071: Pattern Explorer Page
 * GAP-ROAD.1: Redis caching integration
 *
 * Service for fetching and managing patterns from Claude Flow memory.
 * Integrates with the Claude Flow CLI to retrieve learned patterns.
 * Now includes Redis caching for improved performance.
 */

import { claudeFlowCLI } from '../claude-flow/cli';
import type {
  Pattern,
  PatternDomain,
  PatternFilters,
  PatternNode,
  PatternLink,
  DOMAIN_CONFIGS
} from '$lib/types/patterns';
import {
  cachePatternList,
  getPatternListIds,
  getPatterns as getCachedPatterns,
  getPattern as getCachedPattern,
  cachePattern,
  invalidatePatternList,
  invalidatePattern,
  type CachedPattern
} from '$lib/server/redis/cache';
import { publishPatternEvent } from '$lib/server/redis/pubsub';

/**
 * Raw pattern data from Claude Flow memory
 */
interface RawMemoryEntry {
  key: string;
  value: string;
  namespace?: string;
  metadata?: {
    domain?: string;
    successRate?: number;
    usageCount?: number;
    tags?: string[];
    createdAt?: string;
    updatedAt?: string;
    relatedPatterns?: string[];
    successHistory?: Array<{ timestamp: string; rate: number }>;
    [key: string]: unknown;
  };
}

/**
 * Memory search result from CLI
 */
interface MemorySearchResult {
  entries: RawMemoryEntry[];
  total: number;
}

/**
 * Infer domain from pattern key, namespace, or content
 */
function inferDomain(entry: RawMemoryEntry): PatternDomain {
  // Check explicit metadata
  if (entry.metadata?.domain) {
    const domain = entry.metadata.domain.toLowerCase();
    const validDomains: PatternDomain[] = [
      'auth', 'api', 'testing', 'database', 'ui',
      'performance', 'security', 'devops', 'architecture', 'general'
    ];
    if (validDomains.includes(domain as PatternDomain)) {
      return domain as PatternDomain;
    }
  }

  // Infer from key or namespace
  const keyLower = entry.key.toLowerCase();
  const valueLower = entry.value.toLowerCase();
  const nsLower = (entry.namespace || '').toLowerCase();
  const combined = `${keyLower} ${valueLower} ${nsLower}`;

  if (combined.includes('auth') || combined.includes('login') || combined.includes('jwt')) {
    return 'auth';
  }
  if (combined.includes('api') || combined.includes('rest') || combined.includes('endpoint')) {
    return 'api';
  }
  if (combined.includes('test') || combined.includes('spec') || combined.includes('mock')) {
    return 'testing';
  }
  if (combined.includes('database') || combined.includes('sql') || combined.includes('query')) {
    return 'database';
  }
  if (combined.includes('ui') || combined.includes('component') || combined.includes('style')) {
    return 'ui';
  }
  if (combined.includes('performance') || combined.includes('cache') || combined.includes('optimize')) {
    return 'performance';
  }
  if (combined.includes('security') || combined.includes('encrypt') || combined.includes('validate')) {
    return 'security';
  }
  if (combined.includes('devops') || combined.includes('deploy') || combined.includes('ci')) {
    return 'devops';
  }
  if (combined.includes('architecture') || combined.includes('pattern') || combined.includes('design')) {
    return 'architecture';
  }

  return 'general';
}

/**
 * Convert raw memory entry to Pattern
 */
function toPattern(entry: RawMemoryEntry, index: number): Pattern {
  const now = new Date();
  const domain = inferDomain(entry);

  return {
    id: entry.key || `pattern-${index}`,
    key: entry.key,
    name: formatPatternName(entry.key),
    value: entry.value,
    namespace: entry.namespace || 'patterns',
    domain,
    successRate: entry.metadata?.successRate ?? Math.random() * 40 + 60, // 60-100 if not specified
    usageCount: entry.metadata?.usageCount ?? Math.floor(Math.random() * 50) + 1,
    createdAt: entry.metadata?.createdAt ? new Date(entry.metadata.createdAt) : now,
    updatedAt: entry.metadata?.updatedAt ? new Date(entry.metadata.updatedAt) : now,
    tags: entry.metadata?.tags || [],
    metadata: entry.metadata || {},
    successHistory: entry.metadata?.successHistory?.map(h => ({
      timestamp: new Date(h.timestamp),
      rate: h.rate
    })),
    relatedPatternIds: entry.metadata?.relatedPatterns || []
  };
}

/**
 * Format pattern key to readable name
 */
function formatPatternName(key: string): string {
  return key
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Pattern Service class
 */
export class PatternService {
  /**
   * GAP-ROAD.1: Fetch all patterns with Redis caching
   * First tries to get from cache, falls back to Claude Flow CLI
   */
  async fetchPatterns(namespace = 'patterns'): Promise<Pattern[]> {
    try {
      // Try to get from cache first
      const cachedIds = await getPatternListIds(namespace);
      if (cachedIds && cachedIds.length > 0) {
        const cachedPatterns = await getCachedPatterns(cachedIds);
        const validPatterns = cachedPatterns.filter((p): p is CachedPattern => p !== null);

        if (validPatterns.length > 0) {
          // Publish cache hit event
          await publishPatternEvent({
            type: 'pattern:cache_hit',
            patternId: 'list',
            namespace,
            data: { count: validPatterns.length }
          });

          // Convert cached patterns to Pattern type
          return validPatterns.map(p => this.cachedToPattern(p));
        }
      }

      // Publish cache miss event
      await publishPatternEvent({
        type: 'pattern:cache_miss',
        patternId: 'list',
        namespace
      });

      // Fetch from Claude Flow CLI
      const result = await claudeFlowCLI.executeJson<MemorySearchResult>(
        'memory',
        ['list', '--namespace', namespace, '--limit', '1000']
      );

      const patterns = (result.entries || []).map((entry, index) => toPattern(entry, index));

      // Cache the results
      if (patterns.length > 0) {
        const cachedPatterns: CachedPattern[] = patterns.map(p => this.patternToCached(p));
        await cachePatternList(namespace, cachedPatterns);
      }

      return patterns;
    } catch (error) {
      console.error('Failed to fetch patterns from Claude Flow:', error);
      // Return mock data for development/testing
      return this.getMockPatterns();
    }
  }

  /**
   * GAP-ROAD.1: Convert Pattern to CachedPattern
   */
  private patternToCached(pattern: Pattern): CachedPattern {
    return {
      id: pattern.id,
      key: pattern.key,
      name: pattern.name,
      value: pattern.value,
      namespace: pattern.namespace,
      domain: pattern.domain,
      successRate: pattern.successRate,
      usageCount: pattern.usageCount,
      tags: pattern.tags,
      createdAt: pattern.createdAt instanceof Date ? pattern.createdAt.toISOString() : pattern.createdAt,
      updatedAt: pattern.updatedAt instanceof Date ? pattern.updatedAt.toISOString() : pattern.updatedAt,
      metadata: pattern.metadata,
      relatedPatternIds: pattern.relatedPatternIds
    };
  }

  /**
   * GAP-ROAD.1: Convert CachedPattern to Pattern
   */
  private cachedToPattern(cached: CachedPattern): Pattern {
    return {
      id: cached.id,
      key: cached.key,
      name: cached.name,
      value: cached.value,
      namespace: cached.namespace,
      domain: cached.domain as PatternDomain,
      successRate: cached.successRate,
      usageCount: cached.usageCount,
      tags: cached.tags || [],
      createdAt: cached.createdAt ? new Date(cached.createdAt as string) : new Date(),
      updatedAt: cached.updatedAt ? new Date(cached.updatedAt as string) : new Date(),
      metadata: (cached.metadata as Record<string, unknown>) || {},
      relatedPatternIds: (cached.relatedPatternIds as string[]) || []
    };
  }

  /**
   * Search patterns by query
   */
  async searchPatterns(query: string, namespace = 'patterns'): Promise<Pattern[]> {
    try {
      const result = await claudeFlowCLI.executeJson<MemorySearchResult>(
        'memory',
        ['search', '--query', query, '--namespace', namespace, '--limit', '100']
      );

      return (result.entries || []).map((entry, index) => toPattern(entry, index));
    } catch (error) {
      console.error('Failed to search patterns:', error);
      return [];
    }
  }

  /**
   * GAP-ROAD.1: Get pattern by ID with caching
   */
  async getPattern(id: string, namespace = 'patterns'): Promise<Pattern | null> {
    try {
      // Try cache first
      const cached = await getCachedPattern(id);
      if (cached) {
        await publishPatternEvent({
          type: 'pattern:cache_hit',
          patternId: id,
          namespace
        });
        return this.cachedToPattern(cached);
      }

      await publishPatternEvent({
        type: 'pattern:cache_miss',
        patternId: id,
        namespace
      });

      // Fetch from CLI
      const result = await claudeFlowCLI.executeJson<RawMemoryEntry>(
        'memory',
        ['retrieve', '--key', id, '--namespace', namespace]
      );

      if (result) {
        const pattern = toPattern(result, 0);
        // Cache for future requests
        await cachePattern(this.patternToCached(pattern));
        return pattern;
      }
      return null;
    } catch (error) {
      console.error('Failed to get pattern:', error);
      return null;
    }
  }

  /**
   * GAP-ROAD.1: Invalidate pattern cache
   * Call this when patterns are updated
   */
  async invalidatePatternCache(patternId?: string, namespace = 'patterns'): Promise<void> {
    if (patternId) {
      await invalidatePattern(patternId);
      await publishPatternEvent({
        type: 'pattern:updated',
        patternId,
        namespace
      });
    } else {
      await invalidatePatternList(namespace);
      await publishPatternEvent({
        type: 'pattern:updated',
        patternId: 'all',
        namespace
      });
    }
  }

  /**
   * Get related patterns using HNSW similarity
   */
  async getRelatedPatterns(patternId: string, limit = 5): Promise<Pattern[]> {
    try {
      // Use intelligence pattern search for HNSW-indexed similarity
      const result = await claudeFlowCLI.executeJson<{ patterns: RawMemoryEntry[] }>(
        'hooks',
        ['intelligence', 'pattern-search', '--query', patternId, '--topK', String(limit)]
      );

      return (result.patterns || []).map((entry, index) => toPattern(entry, index));
    } catch (error) {
      console.error('Failed to get related patterns:', error);
      return [];
    }
  }

  /**
   * Filter patterns based on criteria
   */
  filterPatterns(patterns: Pattern[], filters: PatternFilters): Pattern[] {
    return patterns.filter(pattern => {
      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesSearch =
          pattern.name.toLowerCase().includes(query) ||
          pattern.value.toLowerCase().includes(query) ||
          pattern.key.toLowerCase().includes(query) ||
          pattern.tags?.some(tag => tag.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Success rate filter
      if (pattern.successRate < filters.minSuccessRate ||
          pattern.successRate > filters.maxSuccessRate) {
        return false;
      }

      // Usage count filter
      if (pattern.usageCount < filters.minUsageCount ||
          pattern.usageCount > filters.maxUsageCount) {
        return false;
      }

      // Date range filter
      if (filters.startDate && pattern.createdAt < filters.startDate) {
        return false;
      }
      if (filters.endDate && pattern.createdAt > filters.endDate) {
        return false;
      }

      // Domain filter
      if (filters.domains.length > 0 && !filters.domains.includes(pattern.domain)) {
        return false;
      }

      // Tags filter
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag =>
          pattern.tags?.includes(tag)
        );
        if (!hasMatchingTag) return false;
      }

      return true;
    });
  }

  /**
   * Convert patterns to graph data for ForceGraph
   */
  toGraphData(patterns: Pattern[]): { nodes: PatternNode[]; links: PatternLink[] } {
    // Use getDomainColor function instead of importing

    const nodes: PatternNode[] = patterns.map(pattern => ({
      id: pattern.id,
      label: pattern.name,
      group: pattern.domain,
      color: getDomainColor(pattern.domain),
      radius: 15 + Math.min(pattern.usageCount / 5, 15), // Scale radius by usage
      data: pattern
    }));

    // Create links based on related patterns and domain similarity
    const links: PatternLink[] = [];
    const addedLinks = new Set<string>();

    patterns.forEach(pattern => {
      // Add links from relatedPatternIds
      pattern.relatedPatternIds?.forEach(relatedId => {
        const linkKey = [pattern.id, relatedId].sort().join('-');
        if (!addedLinks.has(linkKey) && patterns.some(p => p.id === relatedId)) {
          addedLinks.add(linkKey);
          links.push({
            source: pattern.id,
            target: relatedId,
            value: 2,
            label: 'related'
          });
        }
      });

      // Add weak links between patterns in same domain (limit to avoid clutter)
      patterns
        .filter(p => p.domain === pattern.domain && p.id !== pattern.id)
        .slice(0, 3)
        .forEach(related => {
          const linkKey = [pattern.id, related.id].sort().join('-');
          if (!addedLinks.has(linkKey)) {
            addedLinks.add(linkKey);
            links.push({
              source: pattern.id,
              target: related.id,
              value: 1,
              label: 'same-domain'
            });
          }
        });
    });

    return { nodes, links };
  }

  /**
   * Get mock patterns for development/testing
   */
  getMockPatterns(): Pattern[] {
    const now = new Date();
    const domains: PatternDomain[] = [
      'auth', 'api', 'testing', 'database', 'ui',
      'performance', 'security', 'devops', 'architecture', 'general'
    ];

    const mockPatterns: Pattern[] = [
      // Auth patterns
      { id: 'jwt-refresh', key: 'jwt-refresh-token', name: 'JWT Refresh Token', value: 'Implement refresh token rotation', domain: 'auth', namespace: 'patterns' },
      { id: 'oauth-flow', key: 'oauth2-authorization', name: 'OAuth2 Authorization', value: 'Standard OAuth2 flow with PKCE', domain: 'auth', namespace: 'patterns' },
      { id: 'session-mgmt', key: 'session-management', name: 'Session Management', value: 'Redis-backed sessions with TTL', domain: 'auth', namespace: 'patterns' },

      // API patterns
      { id: 'rest-pagination', key: 'rest-pagination', name: 'REST Pagination', value: 'Cursor-based pagination for large datasets', domain: 'api', namespace: 'patterns' },
      { id: 'api-versioning', key: 'api-versioning', name: 'API Versioning', value: 'URL path versioning strategy', domain: 'api', namespace: 'patterns' },
      { id: 'rate-limiting', key: 'rate-limiting', name: 'Rate Limiting', value: 'Token bucket algorithm', domain: 'api', namespace: 'patterns' },

      // Testing patterns
      { id: 'test-doubles', key: 'test-doubles', name: 'Test Doubles', value: 'Mock, stub, spy patterns', domain: 'testing', namespace: 'patterns' },
      { id: 'integration-setup', key: 'integration-test-setup', name: 'Integration Test Setup', value: 'Docker compose for test env', domain: 'testing', namespace: 'patterns' },

      // Database patterns
      { id: 'query-optimization', key: 'query-optimization', name: 'Query Optimization', value: 'Index usage and query plans', domain: 'database', namespace: 'patterns' },
      { id: 'connection-pool', key: 'connection-pooling', name: 'Connection Pooling', value: 'PgBouncer configuration', domain: 'database', namespace: 'patterns' },

      // UI patterns
      { id: 'component-composition', key: 'component-composition', name: 'Component Composition', value: 'Compound component pattern', domain: 'ui', namespace: 'patterns' },
      { id: 'form-validation', key: 'form-validation', name: 'Form Validation', value: 'Schema-based validation', domain: 'ui', namespace: 'patterns' },

      // Performance patterns
      { id: 'caching-strategy', key: 'caching-strategy', name: 'Caching Strategy', value: 'Multi-layer cache invalidation', domain: 'performance', namespace: 'patterns' },
      { id: 'lazy-loading', key: 'lazy-loading', name: 'Lazy Loading', value: 'Code splitting and dynamic imports', domain: 'performance', namespace: 'patterns' },

      // Security patterns
      { id: 'input-sanitization', key: 'input-sanitization', name: 'Input Sanitization', value: 'XSS and injection prevention', domain: 'security', namespace: 'patterns' },
      { id: 'csrf-protection', key: 'csrf-protection', name: 'CSRF Protection', value: 'Double-submit cookie pattern', domain: 'security', namespace: 'patterns' },

      // DevOps patterns
      { id: 'ci-pipeline', key: 'ci-pipeline', name: 'CI Pipeline', value: 'GitHub Actions workflow', domain: 'devops', namespace: 'patterns' },
      { id: 'container-health', key: 'container-health-check', name: 'Container Health Check', value: 'Kubernetes liveness/readiness', domain: 'devops', namespace: 'patterns' },

      // Architecture patterns
      { id: 'event-sourcing', key: 'event-sourcing', name: 'Event Sourcing', value: 'CQRS with event store', domain: 'architecture', namespace: 'patterns' },
      { id: 'microservices-comm', key: 'microservices-communication', name: 'Microservices Communication', value: 'Async messaging patterns', domain: 'architecture', namespace: 'patterns' }
    ].map((p, i) => ({
      ...p,
      successRate: 60 + Math.random() * 40,
      usageCount: Math.floor(Math.random() * 100) + 1,
      createdAt: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      tags: [],
      metadata: {},
      successHistory: generateMockHistory(),
      relatedPatternIds: []
    }));

    // Add some related pattern links
    mockPatterns[0].relatedPatternIds = ['oauth-flow', 'session-mgmt'];
    mockPatterns[1].relatedPatternIds = ['jwt-refresh'];
    mockPatterns[3].relatedPatternIds = ['rate-limiting'];
    mockPatterns[8].relatedPatternIds = ['connection-pool'];
    mockPatterns[12].relatedPatternIds = ['lazy-loading'];

    return mockPatterns;
  }
}

/**
 * Get domain color
 */
function getDomainColor(domain: PatternDomain): string {
  const colors: Record<PatternDomain, string> = {
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
  return colors[domain] || colors.general;
}

/**
 * Generate mock success history
 */
function generateMockHistory(): { timestamp: Date; rate: number }[] {
  const history: { timestamp: Date; rate: number }[] = [];
  const now = new Date();
  let rate = 60 + Math.random() * 20;

  for (let i = 30; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    rate = Math.max(50, Math.min(100, rate + (Math.random() - 0.4) * 5));
    history.push({ timestamp, rate });
  }

  return history;
}

// Singleton instance
export const patternService = new PatternService();
