/**
 * TASK-080/081/082/083: Memory Service for Claude Flow
 *
 * Provides a wrapper around Claude Flow CLI memory commands for:
 * - Listing namespaces and entries
 * - Searching memory with semantic queries
 * - Storing and retrieving memory entries
 * - Managing memory lifecycle
 */

import { claudeFlowCLI } from './cli';

/**
 * Represents a memory entry from Claude Flow
 */
export interface MemoryEntry {
	key: string;
	value: string;
	namespace: string;
	metadata?: Record<string, unknown>;
	tags?: string[];
	createdAt?: string;
	updatedAt?: string;
	similarity?: number;
}

/**
 * Represents a memory namespace with entry count
 */
export interface MemoryNamespace {
	name: string;
	entryCount: number;
	lastUpdated?: string;
}

/**
 * Search result from semantic memory search
 */
export interface MemorySearchResult {
	entries: MemoryEntry[];
	query: string;
	namespace?: string;
	totalFound: number;
}

/**
 * Options for listing memory entries
 */
export interface ListOptions {
	namespace?: string;
	limit?: number;
	offset?: number;
}

/**
 * Options for searching memory
 */
export interface SearchOptions {
	namespace?: string;
	limit?: number;
	threshold?: number;
}

/**
 * Options for storing memory entries
 */
export interface StoreOptions {
	namespace?: string;
	tags?: string[];
	ttl?: number;
}

/**
 * Memory service class for Claude Flow CLI interactions
 */
export class MemoryService {
	/**
	 * List all namespaces with entry counts
	 */
	async listNamespaces(): Promise<MemoryNamespace[]> {
		try {
			const result = await claudeFlowCLI.executeJson<{
				namespaces?: MemoryNamespace[];
				entries?: MemoryEntry[];
			}>('memory', ['list']);

			// Parse namespaces from the response
			if (result.namespaces) {
				return result.namespaces;
			}

			// If only entries are returned, group by namespace
			if (result.entries && Array.isArray(result.entries)) {
				const namespaceMap = new Map<string, number>();
				for (const entry of result.entries) {
					const ns = entry.namespace || 'default';
					namespaceMap.set(ns, (namespaceMap.get(ns) || 0) + 1);
				}
				return Array.from(namespaceMap.entries()).map(([name, entryCount]) => ({
					name,
					entryCount
				}));
			}

			return [];
		} catch (error) {
			// Handle empty memory or no namespaces
			if (error instanceof Error && error.message.includes('empty')) {
				return [];
			}
			throw error;
		}
	}

	/**
	 * List entries in a namespace with pagination
	 */
	async listEntries(options: ListOptions = {}): Promise<MemoryEntry[]> {
		const args: string[] = ['list'];

		if (options.namespace) {
			args.push('--namespace', options.namespace);
		}
		if (options.limit) {
			args.push('--limit', String(options.limit));
		}

		try {
			const result = await claudeFlowCLI.executeJson<{
				entries?: MemoryEntry[];
			}>('memory', args);

			return result.entries || [];
		} catch (error) {
			if (error instanceof Error && error.message.includes('empty')) {
				return [];
			}
			throw error;
		}
	}

	/**
	 * Retrieve a specific entry by key
	 */
	async retrieve(key: string, namespace?: string): Promise<MemoryEntry | null> {
		const args: string[] = ['retrieve', '--key', key];

		if (namespace) {
			args.push('--namespace', namespace);
		}

		try {
			const result = await claudeFlowCLI.executeJson<{
				entry?: MemoryEntry;
				key?: string;
				value?: string;
			}>('memory', args);

			if (result.entry) {
				return result.entry;
			}

			// Handle flat response format
			if (result.key && result.value) {
				return {
					key: result.key,
					value: result.value,
					namespace: namespace || 'default'
				};
			}

			return null;
		} catch (error) {
			if (error instanceof Error && error.message.includes('not found')) {
				return null;
			}
			throw error;
		}
	}

	/**
	 * Search memory with semantic query
	 */
	async search(query: string, options: SearchOptions = {}): Promise<MemorySearchResult> {
		const args: string[] = ['search', '--query', query];

		if (options.namespace) {
			args.push('--namespace', options.namespace);
		}
		if (options.limit) {
			args.push('--limit', String(options.limit));
		}
		if (options.threshold) {
			args.push('--threshold', String(options.threshold));
		}

		try {
			const result = await claudeFlowCLI.executeJson<{
				entries?: MemoryEntry[];
				results?: MemoryEntry[];
				query?: string;
				totalFound?: number;
			}>('memory', args);

			const entries = result.entries || result.results || [];

			return {
				entries,
				query,
				namespace: options.namespace,
				totalFound: result.totalFound || entries.length
			};
		} catch (error) {
			if (error instanceof Error && error.message.includes('no results')) {
				return {
					entries: [],
					query,
					namespace: options.namespace,
					totalFound: 0
				};
			}
			throw error;
		}
	}

	/**
	 * Store a new memory entry
	 */
	async store(
		key: string,
		value: string,
		options: StoreOptions = {}
	): Promise<MemoryEntry> {
		const args: string[] = ['store', '--key', key, '--value', value];

		if (options.namespace) {
			args.push('--namespace', options.namespace);
		}
		if (options.tags && options.tags.length > 0) {
			args.push('--tags', options.tags.join(','));
		}
		if (options.ttl) {
			args.push('--ttl', String(options.ttl));
		}

		const result = await claudeFlowCLI.executeJson<{
			entry?: MemoryEntry;
			success?: boolean;
			key?: string;
		}>('memory', args);

		if (result.entry) {
			return result.entry;
		}

		// Construct entry from response
		return {
			key,
			value,
			namespace: options.namespace || 'default',
			tags: options.tags
		};
	}

	/**
	 * Delete a memory entry
	 */
	async delete(key: string, namespace?: string): Promise<boolean> {
		const args: string[] = ['delete', '--key', key];

		if (namespace) {
			args.push('--namespace', namespace);
		}

		try {
			const result = await claudeFlowCLI.execute('memory', args);
			return result.exitCode === 0;
		} catch {
			return false;
		}
	}

	/**
	 * Check if a key exists in a namespace
	 */
	async exists(key: string, namespace?: string): Promise<boolean> {
		const entry = await this.retrieve(key, namespace);
		return entry !== null;
	}
}

// Singleton instance
export const memoryService = new MemoryService();
