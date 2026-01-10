/**
 * Agent Type Definitions for Visual Agent Catalog
 * GAP-3.3.1: Visual Agent Catalog
 */

/**
 * Agent categories for organization and filtering
 */
export type AgentCategory =
	| 'core-development'
	| 'v3-specialized'
	| 'swarm-coordination'
	| 'consensus-distributed'
	| 'github-repository'
	| 'sparc-methodology'
	| 'testing-validation'
	| 'specialized-dev'
	| 'performance-optimization';

/**
 * Agent complexity level
 */
export type AgentComplexity = 'basic' | 'intermediate' | 'advanced';

/**
 * Static definition of an agent type (from catalog)
 */
export interface AgentTypeDefinition {
	/** Unique identifier (e.g., 'coder', 'security-architect') */
	id: string;
	/** Display name */
	name: string;
	/** Category for grouping */
	category: AgentCategory;
	/** Description of what the agent does */
	description: string;
	/** List of capabilities */
	capabilities: string[];
	/** Agent IDs that work well together */
	bestPairedWith: string[];
	/** Example use cases */
	useCases: string[];
	/** Complexity level */
	complexity: AgentComplexity;
	/** Lucide icon name */
	icon: string;
	/** Keywords for search */
	keywords?: string[];
}

/**
 * Runtime metrics for an agent type
 */
export interface AgentMetrics {
	/** Agent type ID */
	agentTypeId: string;
	/** Total tasks completed */
	tasksCompleted: number;
	/** Success rate (0-100) */
	successRate: number;
	/** Average completion time in ms */
	avgCompletionTime: number;
	/** How often this agent type is spawned */
	usageCount: number;
	/** Last time this agent type was used */
	lastUsed?: Date;
	/** Per-project success rates */
	projectSuccessRates?: Record<string, number>;
}

/**
 * GAP-3.3.4: Extended metrics with historical trends
 */
export interface AgentMetricsWithHistory extends AgentMetrics {
	/** Historical success rate data points */
	successHistory: MetricsHistoryPoint[];
	/** Historical completion time data points */
	completionTimeHistory: MetricsHistoryPoint[];
	/** Recent task outcomes (last 50) */
	recentOutcomes: TaskOutcome[];
	/** Trend direction for success rate */
	successTrend: MetricsTrend;
	/** Trend direction for completion time */
	completionTimeTrend: MetricsTrend;
}

/**
 * A single data point in metrics history
 */
export interface MetricsHistoryPoint {
	/** Timestamp of this data point */
	timestamp: Date;
	/** The value at this point */
	value: number;
	/** Optional sample size for this period */
	sampleSize?: number;
}

/**
 * Outcome of a single task
 */
export interface TaskOutcome {
	/** Unique ID for this outcome record */
	id: string;
	/** Agent type that executed the task */
	agentTypeId: string;
	/** Project ID where task was executed */
	projectId: string;
	/** Ticket ID if associated with a ticket */
	ticketId?: string;
	/** Task description/type */
	taskType: string;
	/** Whether the task succeeded */
	success: boolean;
	/** Completion time in ms */
	completionTime: number;
	/** Error message if failed */
	errorMessage?: string;
	/** When the task started */
	startedAt: Date;
	/** When the task completed */
	completedAt: Date;
}

/**
 * Trend direction indicator
 */
export type MetricsTrend = 'improving' | 'stable' | 'declining';

/**
 * Time period for metrics aggregation
 */
export type MetricsPeriod = '24h' | '7d' | '30d' | '90d' | 'all';

/**
 * Aggregated metrics for a time period
 */
export interface PeriodMetrics {
	period: MetricsPeriod;
	tasksCompleted: number;
	successRate: number;
	avgCompletionTime: number;
	fastestCompletion: number;
	slowestCompletion: number;
}

/**
 * WebSocket event payloads for metrics updates
 */
export interface TaskOutcomePayload {
	outcome: TaskOutcome;
}

export interface AgentMetricsUpdatePayload {
	agentTypeId: string;
	metrics: AgentMetrics;
}

/**
 * Calculate trend from historical data
 */
export function calculateTrend(history: MetricsHistoryPoint[], isHigherBetter = true): MetricsTrend {
	if (history.length < 2) return 'stable';

	// Compare recent average to older average
	const midpoint = Math.floor(history.length / 2);
	const recentAvg =
		history.slice(midpoint).reduce((sum, p) => sum + p.value, 0) / (history.length - midpoint);
	const olderAvg = history.slice(0, midpoint).reduce((sum, p) => sum + p.value, 0) / midpoint;

	const threshold = 0.05; // 5% change threshold
	const change = (recentAvg - olderAvg) / olderAvg;

	if (Math.abs(change) < threshold) return 'stable';

	if (isHigherBetter) {
		return change > 0 ? 'improving' : 'declining';
	} else {
		return change < 0 ? 'improving' : 'declining';
	}
}

/**
 * Format completion time for display
 */
export function formatCompletionTime(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
	if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
	return `${(ms / 3600000).toFixed(1)}h`;
}

/**
 * Get trend color class
 */
export function getTrendColor(trend: MetricsTrend, metric: 'success' | 'time'): string {
	if (trend === 'stable') return 'text-gray-500';

	// For success rate, improving is green
	if (metric === 'success') {
		return trend === 'improving' ? 'text-green-600' : 'text-red-600';
	}

	// For completion time, lower is better (improving = green)
	return trend === 'improving' ? 'text-green-600' : 'text-red-600';
}

/**
 * Get trend icon name
 */
export function getTrendIcon(trend: MetricsTrend): string {
	switch (trend) {
		case 'improving':
			return 'TrendingUp';
		case 'declining':
			return 'TrendingDown';
		default:
			return 'Minus';
	}
}

/**
 * Combined agent data for display
 */
export interface AgentCatalogEntry extends AgentTypeDefinition {
	metrics?: AgentMetrics;
}

/**
 * Filter state for the catalog
 */
export interface AgentCatalogFilters {
	/** Search query */
	searchQuery: string;
	/** Selected categories */
	categories: AgentCategory[];
	/** Minimum success rate filter */
	minSuccessRate: number;
	/** Maximum success rate filter */
	maxSuccessRate: number;
	/** Complexity levels to show */
	complexity: AgentComplexity[];
	/** Sort field */
	sortBy: 'name' | 'successRate' | 'usageCount' | 'avgCompletionTime';
	/** Sort direction */
	sortDirection: 'asc' | 'desc';
	/** View mode */
	viewMode: 'grid' | 'list';
}

/**
 * Default filter values
 */
export const DEFAULT_AGENT_FILTERS: AgentCatalogFilters = {
	searchQuery: '',
	categories: [],
	minSuccessRate: 0,
	maxSuccessRate: 100,
	complexity: [],
	sortBy: 'name',
	sortDirection: 'asc',
	viewMode: 'grid'
};

/**
 * Category display configuration
 */
export interface CategoryConfig {
	category: AgentCategory;
	label: string;
	color: string;
	description: string;
}

/**
 * Category colors and labels
 */
export const CATEGORY_CONFIG: Record<AgentCategory, Omit<CategoryConfig, 'category'>> = {
	'core-development': {
		label: 'Core Development',
		color: '#4f46e5', // indigo-600
		description: 'Essential agents for coding, testing, and review'
	},
	'v3-specialized': {
		label: 'V3 Specialized',
		color: '#7c3aed', // violet-600
		description: 'Advanced agents for security, memory, and performance'
	},
	'swarm-coordination': {
		label: 'Swarm Coordination',
		color: '#0891b2', // cyan-600
		description: 'Agents for managing multi-agent topologies'
	},
	'consensus-distributed': {
		label: 'Consensus & Distributed',
		color: '#0d9488', // teal-600
		description: 'Agents for distributed consensus and synchronization'
	},
	'github-repository': {
		label: 'GitHub & Repository',
		color: '#059669', // emerald-600
		description: 'Agents for GitHub integration and repo management'
	},
	'sparc-methodology': {
		label: 'SPARC Methodology',
		color: '#d97706', // amber-600
		description: 'Agents following the SPARC development methodology'
	},
	'testing-validation': {
		label: 'Testing & Validation',
		color: '#dc2626', // red-600
		description: 'Agents for testing, QA, and validation'
	},
	'specialized-dev': {
		label: 'Specialized Development',
		color: '#2563eb', // blue-600
		description: 'Domain-specific development agents'
	},
	'performance-optimization': {
		label: 'Performance & Optimization',
		color: '#ea580c', // orange-600
		description: 'Agents for performance analysis and optimization'
	}
};

/**
 * Get all categories as array
 */
export function getCategoryList(): CategoryConfig[] {
	return Object.entries(CATEGORY_CONFIG).map(([category, config]) => ({
		category: category as AgentCategory,
		...config
	}));
}

// ═══════════════════════════════════════════════════════════════════════════
// GAP-3.3.5: Custom Agent Configuration Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Custom agent configuration preset
 * Users can create and save custom configurations for spawning agents
 */
export interface CustomAgentConfig {
	/** Unique identifier for this config */
	id: string;
	/** Display name for the preset */
	name: string;
	/** Base agent type from the catalog */
	agentTypeId: string;
	/** Custom prompt/instructions for the agent */
	prompt?: string;
	/** Model override (e.g., 'claude-3-opus', 'claude-3-sonnet') */
	model?: string;
	/** Maximum tokens for agent responses */
	maxTokens?: number;
	/** Temperature setting (0-1) */
	temperature?: number;
	/** Custom environment variables */
	env?: Record<string, string>;
	/** Tags for organizing configs */
	tags?: string[];
	/** Description of what this config is for */
	description?: string;
	/** When this config was created */
	createdAt: Date;
	/** When this config was last updated */
	updatedAt: Date;
	/** Whether this is the default config for this agent type */
	isDefault?: boolean;
}

/**
 * Payload for creating a new custom agent config
 */
export interface CreateCustomAgentConfigPayload {
	name: string;
	agentTypeId: string;
	prompt?: string;
	model?: string;
	maxTokens?: number;
	temperature?: number;
	env?: Record<string, string>;
	tags?: string[];
	description?: string;
	isDefault?: boolean;
}

/**
 * Payload for updating a custom agent config
 */
export interface UpdateCustomAgentConfigPayload {
	name?: string;
	prompt?: string;
	model?: string;
	maxTokens?: number;
	temperature?: number;
	env?: Record<string, string>;
	tags?: string[];
	description?: string;
	isDefault?: boolean;
}

/**
 * Project-level agent configuration settings
 */
export interface ProjectAgentSettings {
	/** Custom configurations saved for this project */
	customConfigs: CustomAgentConfig[];
	/** Default agent type to suggest for new tickets */
	defaultAgentType?: string;
	/** Maximum concurrent agents for this project */
	maxConcurrentAgents: number;
	/** Preferred model for agents in this project */
	preferredModel?: string;
	/** Global environment variables for all agents */
	globalEnv?: Record<string, string>;
}

/**
 * Default project agent settings
 */
export const DEFAULT_PROJECT_AGENT_SETTINGS: ProjectAgentSettings = {
	customConfigs: [],
	maxConcurrentAgents: 5
};

/**
 * Available model options for agent configuration
 */
export const AVAILABLE_MODELS = [
	{ id: 'claude-3-opus', name: 'Claude 3 Opus', description: 'Most capable, best for complex tasks' },
	{ id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', description: 'Balanced performance and speed' },
	{ id: 'claude-3-haiku', name: 'Claude 3 Haiku', description: 'Fastest, best for simple tasks' },
	{ id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Latest balanced model' }
] as const;

/**
 * Validate custom agent config
 */
export function validateCustomAgentConfig(config: CreateCustomAgentConfigPayload): string[] {
	const errors: string[] = [];

	if (!config.name || config.name.trim().length === 0) {
		errors.push('Name is required');
	}
	if (config.name && config.name.length > 100) {
		errors.push('Name must be 100 characters or less');
	}
	if (!config.agentTypeId || config.agentTypeId.trim().length === 0) {
		errors.push('Agent type is required');
	}
	if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 1)) {
		errors.push('Temperature must be between 0 and 1');
	}
	if (config.maxTokens !== undefined && (config.maxTokens < 100 || config.maxTokens > 100000)) {
		errors.push('Max tokens must be between 100 and 100000');
	}
	if (config.prompt && config.prompt.length > 10000) {
		errors.push('Prompt must be 10000 characters or less');
	}

	return errors;
}

/**
 * Create a unique ID for a custom config
 */
export function createConfigId(): string {
	return `config-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
