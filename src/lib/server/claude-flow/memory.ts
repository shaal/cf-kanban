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
 * Options for finding similar entries
 */
export interface SimilarityOptions {
	namespace?: string;
	limit?: number;
	minConfidence?: number;
}

/**
 * Result of similarity search
 */
export interface SimilarityResult {
	entry: MemoryEntry;
	similarity: number;
}

/**
 * Result from vector similarity search
 */
export interface VectorSearchResult {
	entries: SimilarityResult[];
	sourceKey: string;
	namespace?: string;
	searchMethod: 'hnsw' | 'linear' | 'fallback';
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

	/**
	 * Find similar entries using HNSW vector similarity search
	 * GAP-3.4.2: Memory Browser Semantic Search
	 *
	 * @param key - The key of the entry to find similar entries for
	 * @param options - Similarity search options
	 * @returns Promise resolving to VectorSearchResult
	 */
	async findSimilar(
		key: string,
		options: SimilarityOptions = {}
	): Promise<VectorSearchResult> {
		const limit = options.limit ?? 5;
		const minConfidence = options.minConfidence ?? 0.5;

		try {
			// Try HNSW-indexed pattern search via intelligence hooks
			const result = await claudeFlowCLI.executeJson<{
				patterns?: Array<{
					key?: string;
					value?: string;
					namespace?: string;
					similarity?: number;
					confidence?: number;
					score?: number;
					metadata?: Record<string, unknown>;
					tags?: string[];
				}>;
				results?: Array<{
					key?: string;
					value?: string;
					namespace?: string;
					similarity?: number;
					confidence?: number;
					score?: number;
					metadata?: Record<string, unknown>;
					tags?: string[];
				}>;
				method?: string;
				indexed?: boolean;
			}>('hooks', [
				'intelligence',
				'pattern-search',
				'--query',
				key,
				'--topK',
				String(limit + 1) // +1 to exclude self
			]);

			const patterns = result.patterns || result.results || [];

			// Filter out the source entry and apply minimum confidence
			const entries: SimilarityResult[] = patterns
				.filter((p) => p.key !== key)
				.filter((p) => {
					const score = p.similarity ?? p.confidence ?? p.score ?? 0;
					return score >= minConfidence;
				})
				.slice(0, limit)
				.map((p) => ({
					entry: {
						key: p.key || '',
						value: p.value || '',
						namespace: p.namespace || options.namespace || 'default',
						metadata: p.metadata,
						tags: p.tags,
						similarity: p.similarity ?? p.confidence ?? p.score
					},
					similarity: p.similarity ?? p.confidence ?? p.score ?? 0
				}));

			return {
				entries,
				sourceKey: key,
				namespace: options.namespace,
				searchMethod: result.indexed ? 'hnsw' : 'linear'
			};
		} catch {
			// Fallback: Use semantic search with the entry's value as query
			try {
				const sourceEntry = await this.retrieve(key, options.namespace);
				if (!sourceEntry) {
					return {
						entries: [],
						sourceKey: key,
						namespace: options.namespace,
						searchMethod: 'fallback'
					};
				}

				// Use the entry's value as a search query
				const searchResult = await this.search(sourceEntry.value, {
					namespace: options.namespace,
					limit: limit + 1,
					threshold: minConfidence
				});

				// Filter out the source entry
				const entries: SimilarityResult[] = searchResult.entries
					.filter((e) => e.key !== key)
					.slice(0, limit)
					.map((e) => ({
						entry: e,
						similarity: e.similarity ?? this.calculateTextSimilarity(sourceEntry.value, e.value)
					}));

				return {
					entries,
					sourceKey: key,
					namespace: options.namespace,
					searchMethod: 'fallback'
				};
			} catch {
				return {
					entries: [],
					sourceKey: key,
					namespace: options.namespace,
					searchMethod: 'fallback'
				};
			}
		}
	}

	/**
	 * Search memory using vector similarity (HNSW)
	 * GAP-3.4.2: Memory Browser Semantic Search
	 *
	 * This method uses the intelligence pattern search for true vector similarity
	 * instead of keyword-based search.
	 *
	 * @param query - Search query text
	 * @param options - Search options
	 * @returns Promise resolving to MemorySearchResult with similarity scores
	 */
	async vectorSearch(query: string, options: SearchOptions = {}): Promise<MemorySearchResult> {
		try {
			// Use intelligence pattern search for HNSW-indexed vector search
			const result = await claudeFlowCLI.executeJson<{
				patterns?: Array<{
					key?: string;
					value?: string;
					namespace?: string;
					similarity?: number;
					confidence?: number;
					score?: number;
					metadata?: Record<string, unknown>;
					tags?: string[];
				}>;
				results?: Array<{
					key?: string;
					value?: string;
					namespace?: string;
					similarity?: number;
					confidence?: number;
					score?: number;
					metadata?: Record<string, unknown>;
					tags?: string[];
				}>;
				totalFound?: number;
			}>('hooks', [
				'intelligence',
				'pattern-search',
				'--query',
				query,
				'--topK',
				String(options.limit || 20),
				...(options.threshold ? ['--minConfidence', String(options.threshold)] : [])
			]);

			const patterns = result.patterns || result.results || [];

			// Filter by namespace if specified
			const filteredPatterns = options.namespace
				? patterns.filter((p) => p.namespace === options.namespace)
				: patterns;

			const entries: MemoryEntry[] = filteredPatterns.map((p) => ({
				key: p.key || '',
				value: p.value || '',
				namespace: p.namespace || options.namespace || 'default',
				metadata: p.metadata,
				tags: p.tags,
				similarity: p.similarity ?? p.confidence ?? p.score
			}));

			return {
				entries,
				query,
				namespace: options.namespace,
				totalFound: result.totalFound || entries.length
			};
		} catch {
			// Fallback to regular search if HNSW is not available
			return this.search(query, options);
		}
	}

	/**
	 * Calculate simple text similarity using Jaccard similarity of word tokens
	 * Used as a fallback when vector similarity is not available
	 */
	private calculateTextSimilarity(text1: string, text2: string): number {
		const tokens1 = new Set(text1.toLowerCase().split(/\W+/).filter(Boolean));
		const tokens2 = new Set(text2.toLowerCase().split(/\W+/).filter(Boolean));

		if (tokens1.size === 0 || tokens2.size === 0) {
			return 0;
		}

		const intersection = [...tokens1].filter((t) => tokens2.has(t)).length;
		const union = new Set([...tokens1, ...tokens2]).size;

		return intersection / union;
	}
}

// Singleton instance
export const memoryService = new MemoryService();
