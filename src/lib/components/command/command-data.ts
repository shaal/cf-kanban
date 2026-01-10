/**
 * Command Palette Data
 * GAP-8.2: Command Palette (Cmd+K)
 *
 * Indexes all 60+ agents, 27 hooks, and 12 workers as searchable actions.
 */

import type { AgentTypeDefinition } from '$lib/types/agents';
import { AGENT_CATALOG } from '$lib/server/agents/agent-catalog-data';

/**
 * Command item types
 */
export type CommandType = 'agent' | 'hook' | 'worker' | 'action' | 'navigation';

/**
 * A single command item in the palette
 */
export interface CommandItem {
	id: string;
	type: CommandType;
	name: string;
	description: string;
	keywords: string[];
	icon: string;
	category: string;
	action?: () => void | Promise<void>;
	href?: string;
}

/**
 * Hook definitions (27 hooks from CLAUDE.md)
 */
export const HOOKS_DATA: CommandItem[] = [
	{
		id: 'hook-pre-edit',
		type: 'hook',
		name: 'pre-edit',
		description: 'Get context before editing files',
		keywords: ['pre', 'edit', 'context', 'file', 'before'],
		icon: 'FileEdit',
		category: 'Core Hooks'
	},
	{
		id: 'hook-post-edit',
		type: 'hook',
		name: 'post-edit',
		description: 'Record editing outcome for learning',
		keywords: ['post', 'edit', 'record', 'outcome', 'train', 'neural'],
		icon: 'FileCheck',
		category: 'Core Hooks'
	},
	{
		id: 'hook-pre-command',
		type: 'hook',
		name: 'pre-command',
		description: 'Assess risk before commands',
		keywords: ['pre', 'command', 'risk', 'validate', 'safety'],
		icon: 'Terminal',
		category: 'Core Hooks'
	},
	{
		id: 'hook-post-command',
		type: 'hook',
		name: 'post-command',
		description: 'Record command execution outcome',
		keywords: ['post', 'command', 'record', 'track', 'metrics'],
		icon: 'TerminalSquare',
		category: 'Core Hooks'
	},
	{
		id: 'hook-pre-task',
		type: 'hook',
		name: 'pre-task',
		description: 'Record task start, get agent suggestions',
		keywords: ['pre', 'task', 'start', 'agent', 'coordinate', 'swarm'],
		icon: 'PlayCircle',
		category: 'Task Hooks'
	},
	{
		id: 'hook-post-task',
		type: 'hook',
		name: 'post-task',
		description: 'Record task completion for learning',
		keywords: ['post', 'task', 'complete', 'success', 'store', 'results'],
		icon: 'CheckCircle',
		category: 'Task Hooks'
	},
	{
		id: 'hook-session-start',
		type: 'hook',
		name: 'session-start',
		description: 'Start/restore session',
		keywords: ['session', 'start', 'restore', 'auto', 'configure'],
		icon: 'LogIn',
		category: 'Session Hooks'
	},
	{
		id: 'hook-session-end',
		type: 'hook',
		name: 'session-end',
		description: 'End session and persist state',
		keywords: ['session', 'end', 'persist', 'summary', 'export', 'metrics'],
		icon: 'LogOut',
		category: 'Session Hooks'
	},
	{
		id: 'hook-session-restore',
		type: 'hook',
		name: 'session-restore',
		description: 'Restore a previous session',
		keywords: ['session', 'restore', 'previous', 'latest'],
		icon: 'RotateCcw',
		category: 'Session Hooks'
	},
	{
		id: 'hook-route',
		type: 'hook',
		name: 'route',
		description: 'Route task to optimal agent',
		keywords: ['route', 'task', 'agent', 'optimal', 'context', 'top-k'],
		icon: 'Route',
		category: 'Intelligence Hooks'
	},
	{
		id: 'hook-route-task',
		type: 'hook',
		name: 'route-task',
		description: 'Alias for route (v2 compat)',
		keywords: ['route', 'task', 'auto', 'swarm'],
		icon: 'Route',
		category: 'Intelligence Hooks'
	},
	{
		id: 'hook-explain',
		type: 'hook',
		name: 'explain',
		description: 'Explain routing decision',
		keywords: ['explain', 'routing', 'decision', 'topic', 'detailed'],
		icon: 'HelpCircle',
		category: 'Intelligence Hooks'
	},
	{
		id: 'hook-pretrain',
		type: 'hook',
		name: 'pretrain',
		description: 'Bootstrap intelligence from repo',
		keywords: ['pretrain', 'bootstrap', 'intelligence', 'model', 'epochs'],
		icon: 'Brain',
		category: 'Neural Hooks'
	},
	{
		id: 'hook-build-agents',
		type: 'hook',
		name: 'build-agents',
		description: 'Generate optimized agent configs',
		keywords: ['build', 'agents', 'generate', 'optimize', 'config', 'focus'],
		icon: 'Wrench',
		category: 'Neural Hooks'
	},
	{
		id: 'hook-metrics',
		type: 'hook',
		name: 'metrics',
		description: 'View learning metrics dashboard',
		keywords: ['metrics', 'dashboard', 'learning', 'v3', 'format'],
		icon: 'BarChart3',
		category: 'Neural Hooks'
	},
	{
		id: 'hook-transfer',
		type: 'hook',
		name: 'transfer',
		description: 'Transfer patterns via IPFS registry',
		keywords: ['transfer', 'patterns', 'ipfs', 'registry', 'store', 'project'],
		icon: 'Share2',
		category: 'Transfer Hooks'
	},
	{
		id: 'hook-list',
		type: 'hook',
		name: 'list',
		description: 'List all registered hooks',
		keywords: ['list', 'hooks', 'registered', 'format'],
		icon: 'List',
		category: 'Utility Hooks'
	},
	{
		id: 'hook-intelligence',
		type: 'hook',
		name: 'intelligence',
		description: 'RuVector intelligence system',
		keywords: ['intelligence', 'ruvector', 'trajectory', 'pattern', 'stats'],
		icon: 'Sparkles',
		category: 'Intelligence Hooks'
	},
	{
		id: 'hook-worker',
		type: 'hook',
		name: 'worker',
		description: 'Background worker management',
		keywords: ['worker', 'background', 'list', 'dispatch', 'status', 'detect'],
		icon: 'Cpu',
		category: 'Worker Hooks'
	},
	{
		id: 'hook-progress',
		type: 'hook',
		name: 'progress',
		description: 'Check V3 implementation progress',
		keywords: ['progress', 'v3', 'implementation', 'detailed', 'format'],
		icon: 'TrendingUp',
		category: 'Utility Hooks'
	},
	{
		id: 'hook-statusline',
		type: 'hook',
		name: 'statusline',
		description: 'Generate dynamic statusline',
		keywords: ['statusline', 'dynamic', 'json', 'compact', 'color'],
		icon: 'Activity',
		category: 'Utility Hooks'
	},
	{
		id: 'hook-coverage-route',
		type: 'hook',
		name: 'coverage-route',
		description: 'Route based on test coverage gaps',
		keywords: ['coverage', 'route', 'test', 'gaps', 'path'],
		icon: 'Target',
		category: 'Coverage Hooks'
	},
	{
		id: 'hook-coverage-suggest',
		type: 'hook',
		name: 'coverage-suggest',
		description: 'Suggest coverage improvements',
		keywords: ['coverage', 'suggest', 'improvements', 'path'],
		icon: 'Lightbulb',
		category: 'Coverage Hooks'
	},
	{
		id: 'hook-coverage-gaps',
		type: 'hook',
		name: 'coverage-gaps',
		description: 'List coverage gaps with priorities',
		keywords: ['coverage', 'gaps', 'priorities', 'format', 'limit'],
		icon: 'AlertTriangle',
		category: 'Coverage Hooks'
	},
	{
		id: 'hook-pre-bash',
		type: 'hook',
		name: 'pre-bash',
		description: 'Alias for pre-command (v2 compat)',
		keywords: ['pre', 'bash', 'command'],
		icon: 'Terminal',
		category: 'Core Hooks'
	},
	{
		id: 'hook-post-bash',
		type: 'hook',
		name: 'post-bash',
		description: 'Alias for post-command (v2 compat)',
		keywords: ['post', 'bash', 'command'],
		icon: 'TerminalSquare',
		category: 'Core Hooks'
	}
];

/**
 * Worker definitions (12 background workers from CLAUDE.md)
 */
export const WORKERS_DATA: CommandItem[] = [
	{
		id: 'worker-ultralearn',
		type: 'worker',
		name: 'ultralearn',
		description: 'Deep knowledge acquisition',
		keywords: ['ultralearn', 'deep', 'knowledge', 'acquisition', 'learn'],
		icon: 'GraduationCap',
		category: 'Learning Workers'
	},
	{
		id: 'worker-optimize',
		type: 'worker',
		name: 'optimize',
		description: 'Performance optimization',
		keywords: ['optimize', 'performance', 'speed', 'high', 'priority'],
		icon: 'Zap',
		category: 'Performance Workers'
	},
	{
		id: 'worker-consolidate',
		type: 'worker',
		name: 'consolidate',
		description: 'Memory consolidation',
		keywords: ['consolidate', 'memory', 'low', 'priority'],
		icon: 'Database',
		category: 'Memory Workers'
	},
	{
		id: 'worker-predict',
		type: 'worker',
		name: 'predict',
		description: 'Predictive preloading',
		keywords: ['predict', 'predictive', 'preload', 'normal'],
		icon: 'TrendingUp',
		category: 'Intelligence Workers'
	},
	{
		id: 'worker-audit',
		type: 'worker',
		name: 'audit',
		description: 'Security analysis',
		keywords: ['audit', 'security', 'analysis', 'critical', 'priority'],
		icon: 'Shield',
		category: 'Security Workers'
	},
	{
		id: 'worker-map',
		type: 'worker',
		name: 'map',
		description: 'Codebase mapping',
		keywords: ['map', 'codebase', 'mapping', 'normal'],
		icon: 'Map',
		category: 'Analysis Workers'
	},
	{
		id: 'worker-preload',
		type: 'worker',
		name: 'preload',
		description: 'Resource preloading',
		keywords: ['preload', 'resource', 'low', 'priority'],
		icon: 'Download',
		category: 'Performance Workers'
	},
	{
		id: 'worker-deepdive',
		type: 'worker',
		name: 'deepdive',
		description: 'Deep code analysis',
		keywords: ['deepdive', 'deep', 'code', 'analysis', 'normal'],
		icon: 'Search',
		category: 'Analysis Workers'
	},
	{
		id: 'worker-document',
		type: 'worker',
		name: 'document',
		description: 'Auto-documentation',
		keywords: ['document', 'auto', 'documentation', 'normal'],
		icon: 'FileText',
		category: 'Documentation Workers'
	},
	{
		id: 'worker-refactor',
		type: 'worker',
		name: 'refactor',
		description: 'Refactoring suggestions',
		keywords: ['refactor', 'refactoring', 'suggestions', 'normal'],
		icon: 'RefreshCw',
		category: 'Development Workers'
	},
	{
		id: 'worker-benchmark',
		type: 'worker',
		name: 'benchmark',
		description: 'Performance benchmarking',
		keywords: ['benchmark', 'performance', 'benchmarking', 'normal'],
		icon: 'Timer',
		category: 'Performance Workers'
	},
	{
		id: 'worker-testgaps',
		type: 'worker',
		name: 'testgaps',
		description: 'Test coverage analysis',
		keywords: ['testgaps', 'test', 'coverage', 'analysis', 'gaps', 'normal'],
		icon: 'TestTube2',
		category: 'Testing Workers'
	}
];

/**
 * Navigation commands
 */
export const NAVIGATION_DATA: CommandItem[] = [
	{
		id: 'nav-kanban',
		type: 'navigation',
		name: 'Go to Kanban Board',
		description: 'View the main Kanban board',
		keywords: ['kanban', 'board', 'tickets', 'tasks', 'home'],
		icon: 'Kanban',
		category: 'Navigation',
		href: '/'
	},
	{
		id: 'nav-memory',
		type: 'navigation',
		name: 'Go to Memory',
		description: 'View memory entries and search',
		keywords: ['memory', 'store', 'search', 'recall'],
		icon: 'Database',
		category: 'Navigation',
		href: '/learning/memory'
	},
	{
		id: 'nav-neural',
		type: 'navigation',
		name: 'Go to Neural Training',
		description: 'View neural training dashboard',
		keywords: ['neural', 'training', 'model', 'learning'],
		icon: 'Brain',
		category: 'Navigation',
		href: '/learning/neural'
	},
	{
		id: 'nav-patterns',
		type: 'navigation',
		name: 'Go to Patterns',
		description: 'View learned patterns',
		keywords: ['patterns', 'learned', 'intelligence'],
		icon: 'Sparkles',
		category: 'Navigation',
		href: '/learning/patterns'
	},
	{
		id: 'nav-transfer',
		type: 'navigation',
		name: 'Go to Pattern Transfer',
		description: 'Transfer patterns between projects',
		keywords: ['transfer', 'patterns', 'share', 'ipfs'],
		icon: 'Share2',
		category: 'Navigation',
		href: '/learning/transfer'
	},
	{
		id: 'nav-admin',
		type: 'navigation',
		name: 'Go to Admin',
		description: 'Admin dashboard',
		keywords: ['admin', 'settings', 'users', 'config'],
		icon: 'Settings',
		category: 'Navigation',
		href: '/admin'
	},
	{
		id: 'nav-users',
		type: 'navigation',
		name: 'Go to User Management',
		description: 'Manage users and permissions',
		keywords: ['users', 'management', 'permissions', 'roles'],
		icon: 'Users',
		category: 'Navigation',
		href: '/admin/users'
	},
	{
		id: 'nav-projects',
		type: 'navigation',
		name: 'Go to Projects',
		description: 'Manage projects',
		keywords: ['projects', 'management', 'list'],
		icon: 'FolderKanban',
		category: 'Navigation',
		href: '/admin/projects'
	},
	{
		id: 'nav-settings',
		type: 'navigation',
		name: 'Go to Settings',
		description: 'System settings',
		keywords: ['settings', 'config', 'preferences'],
		icon: 'Settings',
		category: 'Navigation',
		href: '/admin/settings'
	},
	{
		id: 'nav-audit',
		type: 'navigation',
		name: 'Go to Audit Log',
		description: 'View audit logs',
		keywords: ['audit', 'log', 'history', 'security'],
		icon: 'ScrollText',
		category: 'Navigation',
		href: '/admin/audit'
	}
];

/**
 * Quick actions
 */
export const ACTIONS_DATA: CommandItem[] = [
	{
		id: 'action-spawn-swarm',
		type: 'action',
		name: 'Spawn Swarm',
		description: 'Initialize a new agent swarm',
		keywords: ['spawn', 'swarm', 'agents', 'init', 'start'],
		icon: 'Rocket',
		category: 'Swarm Actions'
	},
	{
		id: 'action-run-doctor',
		type: 'action',
		name: 'Run Doctor',
		description: 'Run system diagnostics',
		keywords: ['doctor', 'diagnostics', 'health', 'check', 'fix'],
		icon: 'Stethoscope',
		category: 'System Actions'
	},
	{
		id: 'action-security-scan',
		type: 'action',
		name: 'Security Scan',
		description: 'Run a security scan',
		keywords: ['security', 'scan', 'vulnerability', 'audit'],
		icon: 'ShieldCheck',
		category: 'Security Actions'
	},
	{
		id: 'action-performance-benchmark',
		type: 'action',
		name: 'Performance Benchmark',
		description: 'Run performance benchmarks',
		keywords: ['performance', 'benchmark', 'speed', 'test'],
		icon: 'Gauge',
		category: 'Performance Actions'
	},
	{
		id: 'action-memory-search',
		type: 'action',
		name: 'Search Memory',
		description: 'Search memory entries',
		keywords: ['memory', 'search', 'find', 'recall'],
		icon: 'Search',
		category: 'Memory Actions'
	},
	{
		id: 'action-create-ticket',
		type: 'action',
		name: 'Create Ticket',
		description: 'Create a new ticket',
		keywords: ['create', 'ticket', 'new', 'task', 'add'],
		icon: 'Plus',
		category: 'Ticket Actions'
	}
];

/**
 * Convert agent catalog to command items
 */
export function agentToCommandItem(agent: AgentTypeDefinition): CommandItem {
	return {
		id: `agent-${agent.id}`,
		type: 'agent',
		name: agent.name,
		description: agent.description,
		keywords: [...(agent.keywords || []), agent.category, ...agent.capabilities.map(c => c.toLowerCase())],
		icon: agent.icon,
		category: agent.category
	};
}

/**
 * Get all command items
 */
export function getAllCommands(): CommandItem[] {
	const agentCommands = AGENT_CATALOG.map(agentToCommandItem);
	return [
		...NAVIGATION_DATA,
		...ACTIONS_DATA,
		...agentCommands,
		...HOOKS_DATA,
		...WORKERS_DATA
	];
}

/**
 * Fuzzy search scoring
 */
export function fuzzyScore(query: string, target: string): number {
	if (!query) return 1;

	const lowerQuery = query.toLowerCase();
	const lowerTarget = target.toLowerCase();

	// Exact match gets highest score
	if (lowerTarget === lowerQuery) return 100;

	// Starts with query
	if (lowerTarget.startsWith(lowerQuery)) return 80;

	// Contains query
	if (lowerTarget.includes(lowerQuery)) return 60;

	// Word boundary match
	const words = lowerTarget.split(/[\s\-_]+/);
	for (const word of words) {
		if (word.startsWith(lowerQuery)) return 50;
	}

	// Fuzzy character match
	let queryIndex = 0;
	let consecutiveMatches = 0;
	let maxConsecutive = 0;

	for (let i = 0; i < lowerTarget.length && queryIndex < lowerQuery.length; i++) {
		if (lowerTarget[i] === lowerQuery[queryIndex]) {
			queryIndex++;
			consecutiveMatches++;
			maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
		} else {
			consecutiveMatches = 0;
		}
	}

	// All query characters found
	if (queryIndex === lowerQuery.length) {
		return 20 + maxConsecutive * 5;
	}

	return 0;
}

/**
 * Search commands with fuzzy matching
 */
export function searchCommands(query: string, commands: CommandItem[]): CommandItem[] {
	if (!query.trim()) return commands;

	const scored = commands.map(cmd => {
		const nameScore = fuzzyScore(query, cmd.name);
		const descScore = fuzzyScore(query, cmd.description) * 0.5;
		const keywordScores = cmd.keywords.map(k => fuzzyScore(query, k) * 0.3);
		const maxKeywordScore = Math.max(0, ...keywordScores);

		return {
			command: cmd,
			score: Math.max(nameScore, descScore, maxKeywordScore)
		};
	});

	return scored
		.filter(s => s.score > 0)
		.sort((a, b) => b.score - a.score)
		.map(s => s.command);
}

/**
 * Group commands by type
 */
export function groupCommandsByType(commands: CommandItem[]): Map<CommandType, CommandItem[]> {
	const groups = new Map<CommandType, CommandItem[]>();

	for (const cmd of commands) {
		const existing = groups.get(cmd.type) || [];
		existing.push(cmd);
		groups.set(cmd.type, existing);
	}

	return groups;
}

/**
 * Get display label for command type
 */
export function getTypeLabel(type: CommandType): string {
	switch (type) {
		case 'navigation': return 'Navigation';
		case 'action': return 'Quick Actions';
		case 'agent': return 'Agents';
		case 'hook': return 'Hooks';
		case 'worker': return 'Workers';
		default: return type;
	}
}
