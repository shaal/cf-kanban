/**
 * TASK-091: Code Splitting Module
 *
 * Provides utilities for lazy loading visualization pages,
 * dynamic D3 imports, component preloading, and bundle size measurement.
 */

// Type definitions
type ModuleLoader<T = unknown> = () => Promise<{ default: T } | T>;
type D3Module = typeof import('d3');

interface LoadOptions {
	force?: boolean;
	timeout?: number;
}

interface BundleSizeMetrics {
	moduleName: string;
	loadTime: number;
	timestamp: number;
}

interface ChunkGroup {
	name: string;
	routes: string[];
	priority: 'high' | 'medium' | 'low';
}

// Module caches
const moduleCache = new Map<string, unknown>();
const preloadCache = new Map<string, unknown>();
const prefetchedRoutes = new Set<string>();
const loadingStates = new Map<string, boolean>();

// D3 loader and cache
let d3Cache: D3Module | null = null;
let d3Loader: (() => Promise<D3Module>) | null = null;

// Prefetch handler
let prefetchHandler: ((route: string) => Promise<unknown>) | null = null;

/**
 * Chunk configuration for code splitting
 */
export const CHUNK_CONFIG: Record<string, ChunkGroup> = {
	visualization: {
		name: 'viz-chunk',
		routes: [
			'/learning/neural',
			'/learning/patterns',
			'/learning/memory',
			'/learning/transfer'
		],
		priority: 'medium'
	},
	admin: {
		name: 'admin-chunk',
		routes: ['/admin', '/admin/settings', '/admin/users'],
		priority: 'low'
	},
	kanban: {
		name: 'kanban-chunk',
		routes: ['/projects', '/projects/[projectId]'],
		priority: 'high'
	},
	d3: {
		name: 'd3-chunk',
		routes: [],
		priority: 'medium'
	}
};

/**
 * Lazy load a module with caching support
 *
 * @param loader - Function that returns a promise with the module
 * @param cacheKey - Optional key for caching the loaded module
 * @param options - Loading options
 * @returns The loaded module's default export
 */
export async function lazyLoad<T>(
	loader: ModuleLoader<T>,
	cacheKey?: string,
	options: LoadOptions = {}
): Promise<T> {
	const { force = false, timeout = 10000 } = options;

	// Check cache first (unless force reload)
	if (cacheKey && !force && moduleCache.has(cacheKey)) {
		return moduleCache.get(cacheKey) as T;
	}

	// Create timeout promise
	const timeoutPromise = new Promise<never>((_, reject) => {
		setTimeout(() => reject(new Error(`Module load timeout after ${timeout}ms`)), timeout);
	});

	// Race between load and timeout
	const module = await Promise.race([loader(), timeoutPromise]);

	// Extract default export if present
	const result = (module as { default?: T }).default ?? (module as T);

	// Cache the result
	if (cacheKey) {
		moduleCache.set(cacheKey, result);
	}

	return result;
}

/**
 * Clear the module cache
 */
export function clearModuleCache(): void {
	moduleCache.clear();
}

/**
 * Set the D3 loader function for testing
 */
export function setD3Loader(loader: () => Promise<D3Module>): void {
	d3Loader = loader;
}

/**
 * Clear the D3 cache
 */
export function clearD3Cache(): void {
	d3Cache = null;
}

/**
 * Dynamically load D3 library
 * D3 is a large library, so we load it only when needed
 *
 * @returns The D3 module
 */
export async function loadD3(): Promise<D3Module> {
	if (d3Cache) {
		return d3Cache;
	}

	if (d3Loader) {
		d3Cache = await d3Loader();
		return d3Cache;
	}

	// Dynamic import of D3
	d3Cache = await import('d3');
	return d3Cache;
}

/**
 * Preload a component for future use
 *
 * @param name - Unique name for the component
 * @param loader - Function that loads the component
 * @returns The preloaded component
 */
export async function preloadComponent<T>(name: string, loader: ModuleLoader<T>): Promise<T> {
	if (preloadCache.has(name)) {
		return preloadCache.get(name) as T;
	}

	const module = await loader();
	const component = (module as { default?: T }).default ?? (module as T);

	preloadCache.set(name, component);
	return component;
}

/**
 * Clear the preload cache
 */
export function clearPreloadCache(): void {
	preloadCache.clear();
}

/**
 * Set the prefetch handler for testing
 */
export function setPrefetchHandler(handler: (route: string) => Promise<unknown>): void {
	prefetchHandler = handler;
}

/**
 * Clear the prefetch cache
 */
export function clearPrefetchCache(): void {
	prefetchedRoutes.clear();
}

/**
 * Prefetch route data for faster navigation
 *
 * @param route - The route to prefetch
 */
export async function prefetchRoute(route: string): Promise<void> {
	if (prefetchedRoutes.has(route)) {
		return;
	}

	prefetchedRoutes.add(route);

	if (prefetchHandler) {
		await prefetchHandler(route);
	}
}

/**
 * Measure bundle size and load time for a module
 *
 * @param moduleName - Name of the module being measured
 * @param loader - Function that loads the module
 * @returns Metrics about the module load
 */
export async function measureBundleSize<T>(
	moduleName: string,
	loader: () => Promise<T>
): Promise<BundleSizeMetrics> {
	const startTime = performance.now();

	await loader();

	const endTime = performance.now();
	const loadTime = endTime - startTime;

	return {
		moduleName,
		loadTime,
		timestamp: Date.now()
	};
}

/**
 * Create a new loading state tracker
 */
export function createLoadingState(): void {
	loadingStates.clear();
}

/**
 * Check if a component is currently loading
 *
 * @param componentName - Name of the component
 * @returns Whether the component is loading
 */
export function isLoading(componentName: string): boolean {
	return loadingStates.get(componentName) ?? false;
}

/**
 * Set the loading state for a component
 *
 * @param componentName - Name of the component
 * @param loading - Whether the component is loading
 */
export function setLoading(componentName: string, loading: boolean): void {
	loadingStates.set(componentName, loading);
}

/**
 * Get all chunk groups for a specific priority
 *
 * @param priority - The priority level
 * @returns Array of chunk groups matching the priority
 */
export function getChunksByPriority(priority: 'high' | 'medium' | 'low'): ChunkGroup[] {
	return Object.values(CHUNK_CONFIG).filter((chunk) => chunk.priority === priority);
}

/**
 * Check if a route belongs to a specific chunk
 *
 * @param route - The route to check
 * @param chunkName - The chunk name to check against
 * @returns Whether the route belongs to the chunk
 */
export function routeBelongsToChunk(route: string, chunkName: string): boolean {
	const chunk = CHUNK_CONFIG[chunkName];
	if (!chunk) {
		return false;
	}

	return chunk.routes.some((r) => {
		// Handle dynamic routes with [param]
		const pattern = r.replace(/\[.*?\]/g, '[^/]+');
		const regex = new RegExp(`^${pattern}$`);
		return regex.test(route);
	});
}

/**
 * Get the chunk name for a given route
 *
 * @param route - The route to find the chunk for
 * @returns The chunk name or null if not found
 */
export function getChunkForRoute(route: string): string | null {
	for (const [name, chunk] of Object.entries(CHUNK_CONFIG)) {
		if (chunk.routes.some((r) => {
			const pattern = r.replace(/\[.*?\]/g, '[^/]+');
			const regex = new RegExp(`^${pattern}$`);
			return regex.test(route);
		})) {
			return name;
		}
	}
	return null;
}

/**
 * Preload all components in a chunk
 *
 * @param chunkName - Name of the chunk to preload
 * @param loaders - Map of route to loader functions
 */
export async function preloadChunk(
	chunkName: string,
	loaders: Map<string, ModuleLoader>
): Promise<void> {
	const chunk = CHUNK_CONFIG[chunkName];
	if (!chunk) {
		return;
	}

	const loadPromises = chunk.routes
		.filter((route) => loaders.has(route))
		.map((route) => {
			const loader = loaders.get(route)!;
			return preloadComponent(route, loader);
		});

	await Promise.all(loadPromises);
}
