/**
 * GAP-UX.3: Project Comparison Components
 *
 * Components for multi-project parallel comparison view,
 * including metrics comparison, pattern similarity, and timeline analysis.
 */

export { default as ProjectParallelView } from './ProjectParallelView.svelte';
export { default as ProjectComparisonCard } from './ProjectComparisonCard.svelte';
export { default as MetricsComparisonChart } from './MetricsComparisonChart.svelte';
export { default as PatternSimilarityIndicator } from './PatternSimilarityIndicator.svelte';
export { default as TimelineComparison } from './TimelineComparison.svelte';

// Re-export types
export type {
  ProjectComparisonData,
  PatternDomainCount,
  ActivityPoint,
  ProjectTrends,
  TrendDirection,
  ComparisonMetrics,
  PatternSimilarityResult,
  TimelineComparisonData,
  ProjectTimelineData,
  ComparisonViewState,
  DateRange,
  ComparisonMetricType,
  ProjectComparisonResponse
} from '$lib/types/project-comparison';

export {
  PROJECT_COMPARISON_COLORS,
  getProjectColor,
  calculateTrend,
  formatComparisonMetric,
  getTrendIcon,
  getTrendColor
} from '$lib/types/project-comparison';
