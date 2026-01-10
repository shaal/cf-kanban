/**
 * TASK-080: Memory Browser Page Server
 *
 * Server load function for the memory browser page.
 * Fetches namespaces from Claude Flow memory.
 */
import type { PageServerLoad } from './$types';
import { memoryService, type MemoryNamespace } from '$lib/server/claude-flow/memory';

export interface PageData {
	namespaces: MemoryNamespace[];
	error?: string;
}

/**
 * Load all memory namespaces with entry counts
 */
export const load: PageServerLoad = async (): Promise<PageData> => {
	try {
		const namespaces = await memoryService.listNamespaces();

		// Sort by entry count (descending) then by name
		namespaces.sort((a, b) => {
			if (b.entryCount !== a.entryCount) {
				return b.entryCount - a.entryCount;
			}
			return a.name.localeCompare(b.name);
		});

		return { namespaces };
	} catch (error) {
		console.error('Failed to load memory namespaces:', error);
		return {
			namespaces: [],
			error: error instanceof Error ? error.message : 'Failed to load memory'
		};
	}
};
