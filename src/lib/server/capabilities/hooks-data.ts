/**
 * GAP-8.4: Claude Flow V3 Hooks Data
 *
 * Complete catalog of all 27 hooks available in Claude Flow V3.
 */

import type { HookDefinition } from '$lib/types/capabilities';

export const HOOKS_CATALOG: HookDefinition[] = [
	// Core Hooks
	{
		id: 'pre-edit',
		name: 'Pre-Edit',
		category: 'core',
		description: 'Get context before editing files',
		keyOptions: ['--file', '--operation']
	},
	{
		id: 'post-edit',
		name: 'Post-Edit',
		category: 'core',
		description: 'Record editing outcome for learning',
		keyOptions: ['--file', '--success', '--train-neural']
	},
	{
		id: 'pre-command',
		name: 'Pre-Command',
		category: 'core',
		description: 'Assess risk before commands',
		keyOptions: ['--command', '--validate-safety']
	},
	{
		id: 'post-command',
		name: 'Post-Command',
		category: 'core',
		description: 'Record command execution outcome',
		keyOptions: ['--command', '--track-metrics']
	},
	{
		id: 'pre-task',
		name: 'Pre-Task',
		category: 'core',
		description: 'Record task start, get agent suggestions',
		keyOptions: ['--description', '--coordinate-swarm']
	},
	{
		id: 'post-task',
		name: 'Post-Task',
		category: 'core',
		description: 'Record task completion for learning',
		keyOptions: ['--task-id', '--success', '--store-results']
	},
	{
		id: 'pre-bash',
		name: 'Pre-Bash',
		category: 'core',
		description: '(v2 compat) Alias for pre-command',
		keyOptions: ['--command', '--validate-safety']
	},
	{
		id: 'post-bash',
		name: 'Post-Bash',
		category: 'core',
		description: '(v2 compat) Alias for post-command',
		keyOptions: ['--command', '--track-metrics']
	},

	// Session Hooks
	{
		id: 'session-start',
		name: 'Session Start',
		category: 'session',
		description: 'Start/restore session (v2 compat)',
		keyOptions: ['--session-id', '--auto-configure']
	},
	{
		id: 'session-end',
		name: 'Session End',
		category: 'session',
		description: 'End session and persist state',
		keyOptions: ['--generate-summary', '--export-metrics']
	},
	{
		id: 'session-restore',
		name: 'Session Restore',
		category: 'session',
		description: 'Restore a previous session',
		keyOptions: ['--session-id', '--latest']
	},

	// Intelligence Routing Hooks
	{
		id: 'route',
		name: 'Route',
		category: 'intelligence',
		description: 'Route task to optimal agent',
		keyOptions: ['--task', '--context', '--top-k']
	},
	{
		id: 'route-task',
		name: 'Route Task',
		category: 'intelligence',
		description: '(v2 compat) Alias for route',
		keyOptions: ['--task', '--auto-swarm']
	},
	{
		id: 'explain',
		name: 'Explain',
		category: 'intelligence',
		description: 'Explain routing decision',
		keyOptions: ['--topic', '--detailed']
	},
	{
		id: 'list',
		name: 'List',
		category: 'intelligence',
		description: 'List all registered hooks',
		keyOptions: ['--format']
	},
	{
		id: 'statusline',
		name: 'Statusline',
		category: 'intelligence',
		description: 'Generate dynamic statusline',
		keyOptions: ['--json', '--compact', '--no-color']
	},
	{
		id: 'progress',
		name: 'Progress',
		category: 'intelligence',
		description: 'Check V3 implementation progress',
		keyOptions: ['--detailed', '--format']
	},

	// Neural Learning Hooks
	{
		id: 'pretrain',
		name: 'Pretrain',
		category: 'neural',
		description: 'Bootstrap intelligence from repo',
		keyOptions: ['--model-type', '--epochs']
	},
	{
		id: 'build-agents',
		name: 'Build Agents',
		category: 'neural',
		description: 'Generate optimized agent configs',
		keyOptions: ['--agent-types', '--focus']
	},
	{
		id: 'metrics',
		name: 'Metrics',
		category: 'neural',
		description: 'View learning metrics dashboard',
		keyOptions: ['--v3-dashboard', '--format']
	},
	{
		id: 'transfer',
		name: 'Transfer',
		category: 'neural',
		description: 'Transfer patterns via IPFS registry',
		keyOptions: ['store', 'from-project']
	},
	{
		id: 'intelligence',
		name: 'Intelligence',
		category: 'neural',
		description: 'RuVector intelligence system',
		keyOptions: ['trajectory-*', 'pattern-*', 'stats']
	},

	// Coverage Hooks
	{
		id: 'coverage-route',
		name: 'Coverage Route',
		category: 'coverage',
		description: 'Route based on test coverage gaps',
		keyOptions: ['--task', '--path']
	},
	{
		id: 'coverage-suggest',
		name: 'Coverage Suggest',
		category: 'coverage',
		description: 'Suggest coverage improvements',
		keyOptions: ['--path']
	},
	{
		id: 'coverage-gaps',
		name: 'Coverage Gaps',
		category: 'coverage',
		description: 'List coverage gaps with priorities',
		keyOptions: ['--format', '--limit']
	},

	// Background Worker Hook
	{
		id: 'worker',
		name: 'Worker',
		category: 'background',
		description: 'Background worker management',
		keyOptions: ['list', 'dispatch', 'status', 'detect']
	}
];

/**
 * Get hooks by category
 */
export function getHooksByCategory(category: string): HookDefinition[] {
	return HOOKS_CATALOG.filter((hook) => hook.category === category);
}

/**
 * Get hook by ID
 */
export function getHookById(id: string): HookDefinition | undefined {
	return HOOKS_CATALOG.find((hook) => hook.id === id);
}

/**
 * Get hook category counts
 */
export function getHookCategoryCounts(): Record<string, number> {
	return HOOKS_CATALOG.reduce(
		(acc, hook) => {
			acc[hook.category] = (acc[hook.category] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>
	);
}
