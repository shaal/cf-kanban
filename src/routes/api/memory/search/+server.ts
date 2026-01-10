/**
 * TASK-082: Memory Search API Endpoint
 *
 * Provides semantic search across memory entries.
 */
import { json, type RequestHandler } from '@sveltejs/kit';
import { memoryService } from '$lib/server/claude-flow/memory';

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('query');
	const namespace = url.searchParams.get('namespace') || undefined;
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);
	const threshold = parseFloat(url.searchParams.get('threshold') || '0');

	if (!query || query.trim().length === 0) {
		return json({ error: 'Query is required' }, { status: 400 });
	}

	try {
		const result = await memoryService.search(query.trim(), {
			namespace,
			limit,
			threshold: threshold > 0 ? threshold : undefined
		});

		return json({
			entries: result.entries,
			query: result.query,
			namespace: result.namespace,
			totalFound: result.totalFound
		});
	} catch (error) {
		console.error('Memory search error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Search failed' },
			{ status: 500 }
		);
	}
};
