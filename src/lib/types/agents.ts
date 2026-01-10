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
