/**
 * TASK-083: Memory Exists API Endpoint
 *
 * Checks if a memory entry key exists.
 */
import { json, type RequestHandler } from '@sveltejs/kit';
import { memoryService } from '$lib/server/claude-flow/memory';

export const GET: RequestHandler = async ({ url }) => {
	const key = url.searchParams.get('key');
	const namespace = url.searchParams.get('namespace') || undefined;

	if (!key || key.trim().length === 0) {
		return json({ error: 'Key is required' }, { status: 400 });
	}

	try {
		const exists = await memoryService.exists(key.trim(), namespace);
		return json({ exists, key: key.trim(), namespace });
	} catch (error) {
		console.error('Memory exists check error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to check key' },
			{ status: 500 }
		);
	}
};
