/**
 * GAP-UX.3: Project Parallel View Types
 *
 * Type definitions for multi-project comparison view, including
 * metrics comparison, pattern similarity, and timeline analysis.
 */

import type { HealthStatus, ProjectWithHealth } from './dashboard';
import type { PatternDomain } from './patterns';

/**
 * Extended project data for comparison view
 */
export interface ProjectComparisonData extends ProjectWithHealth {
  velocity: number; // Tickets completed per week
  avgCycleTime: number; // Average time to complete a ticket (hours)
  blockedTickets: number;
  inProgressTickets: number;
  patternDomains: PatternDomainCount[];
  recentActivity: ActivityPoint[];
  trends: ProjectTrends;
}

/**
 * Count of patterns by domain
 */
export interface PatternDomainCount {
  domain: PatternDomain;
  count: number;
}

/**
 * Activity data point for timeline comparison
 */
export interface ActivityPoint {
  date: string; // ISO date string
  ticketsCreated: number;
  ticketsCompleted: number;
  activeAgents: number;
}

/**
 * Trend indicators for project metrics
 */
export interface ProjectTrends {
  velocityTrend: TrendDirection;
  completionTrend: TrendDirection;
  healthTrend: TrendDirection;
}

/**
 * Trend direction enum
 */
export type TrendDirection = 'up' | 'down' | 'stable';

/**
 * Comparison metrics between projects
 */
export interface ComparisonMetrics {
  velocityDiff: number;
  completionRateDiff: number;
  cycleTimeDiff: number;
  patternSimilarity: number; // 0-100 percentage
  activityCorrelation: number; // -1 to 1
}

/**
 * Pattern similarity result between two projects
 */
export interface PatternSimilarityResult {
  projectAId: string;
  projectBId: string;
  similarity: number; // 0-100
  sharedDomains: PatternDomain[];
  uniqueToA: PatternDomain[];
  uniqueToB: PatternDomain[];
}

/**
 * Timeline comparison data
 */
export interface TimelineComparisonData {
  startDate: string;
  endDate: string;
  projects: ProjectTimelineData[];
}

/**
 * Individual project timeline data
 */
export interface ProjectTimelineData {
  projectId: string;
  projectName: string;
  color: string;
  dataPoints: ActivityPoint[];
}

/**
 * Comparison view state
 */
export interface ComparisonViewState {
  selectedProjects: string[];
  dateRange: DateRange;
  metricType: ComparisonMetricType;
  showPatterns: boolean;
  showTimeline: boolean;
}

/**
 * Date range for comparison
 */
export interface DateRange {
  start: Date | null;
  end: Date | null;
}

/**
 * Types of metrics to compare
 */
export type ComparisonMetricType =
  | 'velocity'
  | 'completion'
  | 'cycleTime'
  | 'agents'
  | 'patterns';

/**
 * API response for project comparison
 */
export interface ProjectComparisonResponse {
  projects: ProjectComparisonData[];
  comparisons: ComparisonMetrics[];
  patternSimilarities: PatternSimilarityResult[];
  timeline: TimelineComparisonData;
  timestamp: string;
}

/**
 * Color assignments for projects in comparison
 */
export const PROJECT_COMPARISON_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16'  // lime
];

/**
 * Get color for project by index
 */
export function getProjectColor(index: number): string {
  return PROJECT_COMPARISON_COLORS[index % PROJECT_COMPARISON_COLORS.length];
}

/**
 * Calculate trend direction from values
 */
export function calculateTrend(current: number, previous: number, threshold = 0.05): TrendDirection {
  const change = (current - previous) / (previous || 1);
  if (change > threshold) return 'up';
  if (change < -threshold) return 'down';
  return 'stable';
}

/**
 * Format comparison metric for display
 */
export function formatComparisonMetric(value: number, type: ComparisonMetricType): string {
  switch (type) {
    case 'velocity':
      return `${value.toFixed(1)} tickets/week`;
    case 'completion':
      return `${value.toFixed(1)}%`;
    case 'cycleTime':
      return `${value.toFixed(1)} hours`;
    case 'agents':
      return `${Math.round(value)} agents`;
    case 'patterns':
      return `${Math.round(value)} patterns`;
    default:
      return String(value);
  }
}

/**
 * Get trend icon name based on direction
 */
export function getTrendIcon(trend: TrendDirection): string {
  switch (trend) {
    case 'up':
      return 'TrendingUp';
    case 'down':
      return 'TrendingDown';
    default:
      return 'Minus';
  }
}

/**
 * Get trend color class based on direction and metric type
 */
export function getTrendColor(trend: TrendDirection, inverseGood = false): string {
  if (trend === 'stable') return 'text-gray-500';
  const isGood = inverseGood ? trend === 'down' : trend === 'up';
  return isGood ? 'text-green-600' : 'text-red-600';
}
