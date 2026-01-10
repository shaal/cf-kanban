/**
 * Pattern Types
 *
 * Type definitions for Claude Flow pattern data structures
 * used in the Pattern Explorer visualization.
 */

/**
 * Success rate data point for historical tracking
 */
export interface SuccessRatePoint {
  timestamp: Date;
  rate: number;
}

/**
 * Pattern data from Claude Flow memory
 */
export interface Pattern {
  id: string;
  key: string;
  name: string;
  value: string;
  namespace: string;
  domain: PatternDomain;
  successRate: number;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  metadata?: Record<string, unknown>;
  successHistory?: SuccessRatePoint[];
  relatedPatternIds?: string[];
}

/**
 * Pattern domain categories
 */
export type PatternDomain =
  | 'auth'
  | 'api'
  | 'testing'
  | 'database'
  | 'ui'
  | 'performance'
  | 'security'
  | 'devops'
  | 'architecture'
  | 'general';

/**
 * Domain display configuration
 */
export interface DomainConfig {
  label: string;
  color: string;
  description: string;
}

/**
 * Domain configurations with colors and labels
 */
export const DOMAIN_CONFIGS: Record<PatternDomain, DomainConfig> = {
  auth: { label: 'Authentication', color: '#4f46e5', description: 'Auth patterns' },
  api: { label: 'API', color: '#0891b2', description: 'API patterns' },
  testing: { label: 'Testing', color: '#059669', description: 'Testing patterns' },
  database: { label: 'Database', color: '#d97706', description: 'Database patterns' },
  ui: { label: 'UI/UX', color: '#dc2626', description: 'UI patterns' },
  performance: { label: 'Performance', color: '#7c3aed', description: 'Performance patterns' },
  security: { label: 'Security', color: '#be185d', description: 'Security patterns' },
  devops: { label: 'DevOps', color: '#2563eb', description: 'DevOps patterns' },
  architecture: { label: 'Architecture', color: '#16a34a', description: 'Architecture patterns' },
  general: { label: 'General', color: '#6b7280', description: 'General patterns' }
};

/**
 * Pattern filter options
 */
export interface PatternFilters {
  searchQuery: string;
  minSuccessRate: number;
  maxSuccessRate: number;
  minUsageCount: number;
  maxUsageCount: number;
  startDate: Date | null;
  endDate: Date | null;
  domains: PatternDomain[];
  tags: string[];
}

/**
 * Default pattern filter values
 */
export const DEFAULT_PATTERN_FILTERS: PatternFilters = {
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

/**
 * Pattern cluster for visualization
 */
export interface PatternCluster {
  id: string;
  domain: PatternDomain;
  patterns: Pattern[];
  centerX: number;
  centerY: number;
  radius: number;
  expanded: boolean;
}

/**
 * Pattern comparison result
 */
export interface PatternComparison {
  patterns: Pattern[];
  differences: PropertyDifference[];
  similarityScore: number;
}

/**
 * Property difference in comparison
 */
export interface PropertyDifference {
  property: string;
  values: (string | number | undefined)[];
  isDifferent: boolean;
}

/**
 * Pattern graph node (for ForceGraph)
 */
export interface PatternNode {
  id: string;
  label: string;
  group: PatternDomain;
  color: string;
  radius: number;
  data: Pattern;
}

/**
 * Pattern graph link (for ForceGraph)
 */
export interface PatternLink {
  source: string;
  target: string;
  value: number;
  label?: string;
}
