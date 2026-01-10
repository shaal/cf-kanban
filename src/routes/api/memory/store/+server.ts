/**
 * TASK-083: Memory Store API Endpoint
 *
 * Stores a new memory entry.
 */
import { json, type RequestHandler } from '@sveltejs/kit';
import { memoryService } from '$lib/server/claude-flow/memory';

interface StoreRequest {
	key: string;
	value: string;
	namespace?: string;
	tags?: string[];
	ttl?: number;
}

export const POST: RequestHandler = async ({ request }) => {
	let body: StoreRequest;

	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { key, value, namespace, tags, ttl } = body;

	// Validate key
	if (!key || typeof key !== 'string' || key.trim().length === 0) {
		return json({ error: 'Key is required' }, { status: 400 });
	}

	if (key.length > 100) {
		return json({ error: 'Key must be 100 characters or less' }, { status: 400 });
	}

	if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
		return json(
			{ error: 'Key can only contain letters, numbers, underscores, and hyphens' },
			{ status: 400 }
		);
	}

	// Validate value
	if (!value || typeof value !== 'string' || value.trim().length === 0) {
		return json({ error: 'Value is required' }, { status: 400 });
	}

	if (value.length > 10000) {
		return json({ error: 'Value must be 10000 characters or less' }, { status: 400 });
	}

	try {
		const entry = await memoryService.store(key.trim(), value.trim(), {
			namespace: namespace || 'default',
			tags: tags && Array.isArray(tags) ? tags : undefined,
			ttl: ttl && typeof ttl === 'number' ? ttl : undefined
		});

		return json({ success: true, entry });
	} catch (error) {
		console.error('Memory store error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to store entry' },
			{ status: 500 }
		);
	}
};
