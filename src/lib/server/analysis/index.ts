/**
 * Analysis Module Index
 *
 * Exports all analysis services for ticket processing
 */

// Ticket Analyzer (TASK-046)
export {
  TicketAnalyzer,
  ticketAnalyzer,
  type TicketInput,
  type AnalysisResult,
  type TicketType,
  type AgentType,
  type Topology
} from './ticket-analyzer';

// Complexity Scoring (TASK-047)
export {
  calculateComplexity,
  quickComplexityEstimate,
  complexityCalculator,
  type ComplexityFactors,
  type ComplexityBreakdown,
  type ComplexityResult
} from './complexity';

// Time Estimation (TASK-048)
export {
  estimateCompletionTime,
  quickTimeEstimate,
  formatDuration,
  formatRange,
  timeEstimator,
  type TimeEstimate
} from './time-estimation';

// Dependency Detection (TASK-049)
export {
  detectDependencies,
  hasBlockingDependencies,
  getDependencySummary,
  dependencyDetector,
  type Dependency,
  type DependencyType,
  type DependencyResult
} from './dependencies';

// NLP Parser (GAP-3.2.7)
export {
  NLPParserService,
  nlpParser,
  type NLPParseResult,
  type TechnicalRequirement,
  type RoutingHint,
  type Entity
} from './nlp-parser';
