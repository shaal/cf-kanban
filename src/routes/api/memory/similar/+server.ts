/**
 * GAP-3.4.2: Memory Similar Entries API Endpoint
 *
 * Provides vector similarity search to find entries similar to a given entry.
 * Uses HNSW-indexed vector search when available, with fallback to text similarity.
 */
import { json, type RequestHandler } from '@sveltejs/kit';
import { memoryService } from '$lib/server/claude-flow/memory';

export const GET: RequestHandler = async ({ url }) => {
	const key = url.searchParams.get('key');
	const namespace = url.searchParams.get('namespace') || undefined;
	const limit = parseInt(url.searchParams.get('limit') || '5', 10);
	const minConfidence = parseFloat(url.searchParams.get('minConfidence') || '0.3');

	if (!key || key.trim().length === 0) {
		return json({ error: 'Key is required' }, { status: 400 });
	}

	try {
		const result = await memoryService.findSimilar(key.trim(), {
			namespace,
			limit,
			minConfidence
		});

		return json({
			entries: result.entries,
			sourceKey: result.sourceKey,
			namespace: result.namespace,
			searchMethod: result.searchMethod,
			count: result.entries.length
		});
	} catch (error) {
		console.error('Memory similarity search error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Similarity search failed' },
			{ status: 500 }
		);
	}
};
