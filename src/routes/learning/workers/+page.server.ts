/**
 * GAP-8.4: Workers Catalog Page Server
 */

import type { PageServerLoad } from './$types';
import { WORKERS_CATALOG, getWorkersByPriority } from '$lib/server/capabilities/workers-data';
import type { WorkerPriority } from '$lib/types/capabilities';

export const load: PageServerLoad = async () => {
	// Group workers by priority
	const workersByPriority: Record<string, typeof WORKERS_CATALOG> = {};

	const priorities: WorkerPriority[] = ['critical', 'high', 'normal', 'low'];

	for (const priority of priorities) {
		workersByPriority[priority] = getWorkersByPriority(priority);
	}

	return {
		workers: WORKERS_CATALOG,
		workersByPriority,
		totalWorkers: WORKERS_CATALOG.length
	};
};
