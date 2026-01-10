/**
 * GAP-8.4: Claude Flow V3 Background Workers Data
 *
 * Complete catalog of all 12 background workers available in Claude Flow V3.
 */

import type { WorkerDefinition } from '$lib/types/capabilities';

export const WORKERS_CATALOG: WorkerDefinition[] = [
	{
		id: 'ultralearn',
		name: 'Ultralearn',
		priority: 'normal',
		description: 'Deep knowledge acquisition and learning from codebase patterns'
	},
	{
		id: 'optimize',
		name: 'Optimize',
		priority: 'high',
		description: 'Performance optimization analysis and suggestions'
	},
	{
		id: 'consolidate',
		name: 'Consolidate',
		priority: 'low',
		description: 'Memory consolidation and pattern compression'
	},
	{
		id: 'predict',
		name: 'Predict',
		priority: 'normal',
		description: 'Predictive preloading of likely-needed resources'
	},
	{
		id: 'audit',
		name: 'Audit',
		priority: 'critical',
		description: 'Security analysis and vulnerability scanning'
	},
	{
		id: 'map',
		name: 'Map',
		priority: 'normal',
		description: 'Codebase mapping and dependency analysis'
	},
	{
		id: 'preload',
		name: 'Preload',
		priority: 'low',
		description: 'Resource preloading for faster operations'
	},
	{
		id: 'deepdive',
		name: 'Deepdive',
		priority: 'normal',
		description: 'Deep code analysis and pattern extraction'
	},
	{
		id: 'document',
		name: 'Document',
		priority: 'normal',
		description: 'Auto-documentation generation and updates'
	},
	{
		id: 'refactor',
		name: 'Refactor',
		priority: 'normal',
		description: 'Refactoring suggestions and improvements'
	},
	{
		id: 'benchmark',
		name: 'Benchmark',
		priority: 'normal',
		description: 'Performance benchmarking and regression detection'
	},
	{
		id: 'testgaps',
		name: 'Testgaps',
		priority: 'normal',
		description: 'Test coverage analysis and gap identification'
	}
];

/**
 * Get workers by priority
 */
export function getWorkersByPriority(priority: string): WorkerDefinition[] {
	return WORKERS_CATALOG.filter((worker) => worker.priority === priority);
}

/**
 * Get worker by ID
 */
export function getWorkerById(id: string): WorkerDefinition | undefined {
	return WORKERS_CATALOG.find((worker) => worker.id === id);
}

/**
 * Get worker priority counts
 */
export function getWorkerPriorityCounts(): Record<string, number> {
	return WORKERS_CATALOG.reduce(
		(acc, worker) => {
			acc[worker.priority] = (acc[worker.priority] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>
	);
}
