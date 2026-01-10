/**
 * TASK-081: Namespace Viewer Page Server
 *
 * Server load function for viewing entries in a specific namespace.
 * Supports pagination and entry details.
 */
import type { PageServerLoad, Actions } from './$types';
import { memoryService, type MemoryEntry } from '$lib/server/claude-flow/memory';
import { fail } from '@sveltejs/kit';

export interface PageData {
	namespace: string;
	entries: MemoryEntry[];
	totalEntries: number;
	page: number;
	pageSize: number;
	totalPages: number;
	error?: string;
}

const PAGE_SIZE = 20;

/**
 * Load entries for a specific namespace with pagination
 */
export const load: PageServerLoad = async ({ params, url }): Promise<PageData> => {
	const namespace = decodeURIComponent(params.namespace);
	const page = Math.max(0, parseInt(url.searchParams.get('page') || '0', 10));

	try {
		// Get all entries to calculate total (CLI doesn't support offset natively)
		const allEntries = await memoryService.listEntries({ namespace });

		// Calculate pagination
		const totalEntries = allEntries.length;
		const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));
		const validPage = Math.min(page, totalPages - 1);

		// Slice for current page
		const startIndex = validPage * PAGE_SIZE;
		const entries = allEntries.slice(startIndex, startIndex + PAGE_SIZE);

		return {
			namespace,
			entries,
			totalEntries,
			page: validPage,
			pageSize: PAGE_SIZE,
			totalPages
		};
	} catch (error) {
		console.error(`Failed to load namespace ${namespace}:`, error);
		return {
			namespace,
			entries: [],
			totalEntries: 0,
			page: 0,
			pageSize: PAGE_SIZE,
			totalPages: 1,
			error: error instanceof Error ? error.message : 'Failed to load entries'
		};
	}
};

/**
 * Actions for managing entries
 */
export const actions: Actions = {
	/**
	 * Delete an entry from the namespace
	 */
	delete: async ({ request, params }) => {
		const formData = await request.formData();
		const key = formData.get('key');
		const namespace = decodeURIComponent(params.namespace);

		if (!key || typeof key !== 'string') {
			return fail(400, { error: 'Key is required' });
		}

		try {
			const success = await memoryService.delete(key, namespace);

			if (!success) {
				return fail(404, { error: 'Entry not found or could not be deleted' });
			}

			return { success: true, deletedKey: key };
		} catch (error) {
			console.error(`Failed to delete entry ${key}:`, error);
			return fail(500, {
				error: error instanceof Error ? error.message : 'Failed to delete entry'
			});
		}
	}
};
