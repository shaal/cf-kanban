/**
 * TASK-093: Database Query Optimization Module
 *
 * Provides database indexing configuration, N+1 prevention,
 * query batching, and query monitoring utilities.
 */

// Type definitions
interface IndexDefinition {
	table: string;
	columns: string[];
	unique?: boolean;
	name?: string;
}

interface QueryOptions {
	type?: 'select' | 'insert' | 'update' | 'delete';
}

interface QueryStats {
	queryId: string;
	sql: string;
	startTime: number;
	endTime?: number;
	duration?: number;
	type?: string;
}

interface AggregateStats {
	totalQueries: number;
	averageDuration: number;
	minDuration: number;
	maxDuration: number;
}

interface PaginationOptions {
	cursor?: string;
	take?: number;
	offset?: number;
}

interface BulkOptions {
	chunkSize?: number;
	skipDuplicates?: boolean;
}

interface CacheOptions {
	ttl?: number;
}

// Query executor (Prisma client)
let queryExecutor: any = null;

// Query cache
const queryCache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();

/**
 * Database index definitions for common queries
 */
export const DATABASE_INDEXES: IndexDefinition[] = [
	// Ticket indexes
	{
		table: 'Ticket',
		columns: ['status'],
		name: 'idx_ticket_status'
	},
	{
		table: 'Ticket',
		columns: ['projectId'],
		name: 'idx_ticket_project'
	},
	{
		table: 'Ticket',
		columns: ['projectId', 'status'],
		name: 'idx_ticket_project_status'
	},
	{
		table: 'Ticket',
		columns: ['projectId', 'position'],
		name: 'idx_ticket_project_position'
	},
	{
		table: 'Ticket',
		columns: ['createdAt'],
		name: 'idx_ticket_created'
	},
	{
		table: 'Ticket',
		columns: ['priority'],
		name: 'idx_ticket_priority'
	},
	// Project indexes
	{
		table: 'Project',
		columns: ['name'],
		name: 'idx_project_name'
	},
	// History indexes
	{
		table: 'TicketHistory',
		columns: ['ticketId'],
		name: 'idx_history_ticket'
	},
	{
		table: 'TicketHistory',
		columns: ['ticketId', 'createdAt'],
		name: 'idx_history_ticket_time'
	},
	// Question indexes
	{
		table: 'TicketQuestion',
		columns: ['ticketId'],
		name: 'idx_question_ticket'
	},
	{
		table: 'TicketQuestion',
		columns: ['ticketId', 'answered'],
		name: 'idx_question_ticket_answered'
	},
	// Checkpoint indexes
	{
		table: 'ExecutionCheckpoint',
		columns: ['ticketId'],
		name: 'idx_checkpoint_ticket'
	}
];

/**
 * Set the query executor (Prisma client) for operations
 */
export function setQueryExecutor(executor: any): void {
	queryExecutor = executor;
}

/**
 * Generate include options for preventing N+1 queries
 *
 * @param model - The base model name
 * @param relations - Array of relations to include (supports dot notation for nesting)
 * @returns Prisma include object
 */
export function includeRelations(
	model: string,
	relations: string[]
): Record<string, unknown> {
	const includes: Record<string, unknown> = {};

	for (const relation of relations) {
		const parts = relation.split('.');

		if (parts.length === 1) {
			// Simple relation
			includes[relation] = true;
		} else {
			// Nested relation (e.g., "tickets.history")
			const [parent, ...rest] = parts;
			const nestedPath = rest.join('.');

			// Initialize parent include if not exists
			if (!includes[parent] || includes[parent] === true) {
				includes[parent] = { include: {} };
			}

			const parentInclude = includes[parent] as { include: Record<string, unknown> };

			// For single-level nested, just set to true
			if (rest.length === 1) {
				parentInclude.include[rest[0]] = true;
			} else {
				// Recursively build nested includes
				const nestedIncludes = includeRelations(parent, [nestedPath]);
				Object.assign(parentInclude.include, nestedIncludes);
			}
		}
	}

	return includes;
}

/**
 * Batch multiple queries in a transaction
 *
 * @param queries - Array of query functions
 * @returns Results from all queries
 */
export async function batchQueries<T>(
	queries: Array<() => Promise<T>>
): Promise<T[]> {
	if (!queryExecutor) {
		// Execute sequentially without transaction
		return Promise.all(queries.map((q) => q()));
	}

	return queryExecutor.$transaction(async () => {
		return Promise.all(queries.map((q) => q()));
	});
}

/**
 * Query builder for creating optimized queries
 */
class QueryBuilder {
	private model: string;
	private queryOptions: Record<string, unknown> = {};

	constructor(model: string) {
		this.model = model;
	}

	select(fields: string[]): this {
		this.queryOptions.select = fields.reduce(
			(acc, field) => ({ ...acc, [field]: true }),
			{}
		);
		return this;
	}

	where(conditions: Record<string, unknown>): this {
		this.queryOptions.where = conditions;
		return this;
	}

	orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): this {
		this.queryOptions.orderBy = { [field]: direction };
		return this;
	}

	limit(count: number): this {
		this.queryOptions.take = count;
		return this;
	}

	paginate(options: PaginationOptions): this {
		if (options.cursor) {
			this.queryOptions.cursor = { id: options.cursor };
			this.queryOptions.skip = 1; // Skip the cursor item
		}
		if (options.take) {
			this.queryOptions.take = options.take;
		}
		if (options.offset !== undefined) {
			this.queryOptions.skip = options.offset;
		}
		return this;
	}

	include(relations: Record<string, unknown>): this {
		this.queryOptions.include = relations;
		return this;
	}

	build(): Record<string, unknown> {
		return { ...this.queryOptions };
	}
}

/**
 * Create an optimized query builder
 *
 * @param model - The model to query
 * @returns QueryBuilder instance
 */
export function createOptimizedQuery(model: string): QueryBuilder {
	return new QueryBuilder(model);
}

/**
 * Query monitoring class for tracking performance
 */
export class QueryMonitor {
	private queries: Map<string, QueryStats> = new Map();
	private slowThreshold: number;
	private queryCounter = 0;

	constructor(options: { slowThreshold?: number } = {}) {
		this.slowThreshold = options.slowThreshold ?? 100; // 100ms default
	}

	startQuery(sql: string, options: QueryOptions = {}): string {
		const queryId = `query-${++this.queryCounter}`;

		this.queries.set(queryId, {
			queryId,
			sql,
			startTime: performance.now(),
			type: options.type
		});

		return queryId;
	}

	endQuery(queryId: string): void {
		const query = this.queries.get(queryId);
		if (query) {
			query.endTime = performance.now();
			query.duration = query.endTime - query.startTime;
		}
	}

	getQueryStats(queryId: string): QueryStats | undefined {
		return this.queries.get(queryId);
	}

	getSlowQueries(): QueryStats[] {
		return Array.from(this.queries.values()).filter(
			(q) => q.duration !== undefined && q.duration > this.slowThreshold
		);
	}

	getAggregateStats(): AggregateStats {
		const completedQueries = Array.from(this.queries.values()).filter(
			(q) => q.duration !== undefined
		);

		if (completedQueries.length === 0) {
			return {
				totalQueries: 0,
				averageDuration: 0,
				minDuration: 0,
				maxDuration: 0
			};
		}

		const durations = completedQueries.map((q) => q.duration!);
		const total = durations.reduce((a, b) => a + b, 0);

		return {
			totalQueries: completedQueries.length,
			averageDuration: total / completedQueries.length,
			minDuration: Math.min(...durations),
			maxDuration: Math.max(...durations)
		};
	}

	getStatsByType(): Record<string, QueryStats[]> {
		const byType: Record<string, QueryStats[]> = {};

		for (const query of this.queries.values()) {
			const type = query.type || 'unknown';
			if (!byType[type]) {
				byType[type] = [];
			}
			byType[type].push(query);
		}

		return byType;
	}

	clear(): void {
		this.queries.clear();
		this.queryCounter = 0;
	}
}

/**
 * Bulk insert records efficiently
 *
 * @param model - The model to insert into
 * @param data - Array of records to insert
 * @param options - Bulk insert options
 * @returns Insert result
 */
export async function bulkInsert<T extends Record<string, unknown>>(
	model: string,
	data: T[],
	options: BulkOptions = {}
): Promise<{ count: number }> {
	if (!queryExecutor) {
		throw new Error('Query executor not set');
	}

	const { chunkSize = 100, skipDuplicates = false } = options;
	let totalCount = 0;

	// Chunk the data for better performance
	for (let i = 0; i < data.length; i += chunkSize) {
		const chunk = data.slice(i, i + chunkSize);
		const result = await queryExecutor[model].createMany({
			data: chunk,
			skipDuplicates
		});
		totalCount += result.count;
	}

	return { count: totalCount };
}

/**
 * Bulk update records efficiently
 *
 * @param model - The model to update
 * @param updates - Array of { where, data } objects
 */
export async function bulkUpdate<T extends Record<string, unknown>>(
	model: string,
	updates: Array<{ where: Record<string, unknown>; data: T }>
): Promise<void> {
	if (!queryExecutor) {
		throw new Error('Query executor not set');
	}

	await queryExecutor.$transaction(
		updates.map((update) =>
			queryExecutor[model].update({
				where: update.where,
				data: update.data
			})
		)
	);
}

/**
 * Cache a query result
 *
 * @param key - Cache key
 * @param queryFn - Function to execute if cache miss
 * @param options - Cache options
 * @returns Query result
 */
export async function cacheQuery<T>(
	key: string,
	queryFn: () => Promise<T>,
	options: CacheOptions = {}
): Promise<T> {
	const { ttl = 60000 } = options; // Default 1 minute
	const cached = queryCache.get(key);

	if (cached && Date.now() - cached.timestamp < cached.ttl) {
		return cached.data as T;
	}

	const result = await queryFn();
	queryCache.set(key, { data: result, timestamp: Date.now(), ttl });

	return result;
}

/**
 * Clear the query cache
 */
export function clearQueryCache(): void {
	queryCache.clear();
}

/**
 * Invalidate specific cache entries
 *
 * @param pattern - Key pattern to invalidate
 */
export function invalidateQueryCache(pattern: string): void {
	const regex = new RegExp(pattern.replace('*', '.*'));

	for (const key of queryCache.keys()) {
		if (regex.test(key)) {
			queryCache.delete(key);
		}
	}
}

/**
 * Generate Prisma migration for indexes
 *
 * @returns SQL migration statements
 */
export function generateIndexMigration(): string {
	const statements = DATABASE_INDEXES.map((idx) => {
		const indexName = idx.name || `idx_${idx.table.toLowerCase()}_${idx.columns.join('_')}`;
		const uniqueKeyword = idx.unique ? 'UNIQUE ' : '';
		const columns = idx.columns.map((c) => `"${c}"`).join(', ');

		return `CREATE ${uniqueKeyword}INDEX IF NOT EXISTS "${indexName}" ON "${idx.table}" (${columns});`;
	});

	return statements.join('\n');
}
